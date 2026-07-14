// Claude vision layer for the camera features. Every function degrades safely:
// if there's no API key (or the call fails), callers fall back to manual entry.
// Results are always presented to the user as editable estimates, never as
// medical-grade measurements.

import type {
  FoodPhotoAnalysis,
  FormExercise,
  FormFeedback,
  MenuScanResult,
  OnboardingProfile,
  Plan,
  ProgressPhotoAnalysis,
} from '../types';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export function isVisionEnabled(): boolean {
  return API_KEY.trim().length > 0;
}

interface CallOpts {
  system: string;
  userText: string;
  base64: string;
  mimeType: string;
  maxTokens?: number;
}

// Shared image+text call that returns parsed JSON, or null on any failure.
async function visionJSON<T>(opts: CallOpts): Promise<T | null> {
  if (!isVisionEnabled() || !opts.base64) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 700,
        system: opts.system,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: normalizeMime(opts.mimeType),
                  data: opts.base64,
                },
              },
              { type: 'text', text: opts.userText },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    return parseJSON<T>(text);
  } catch {
    return null;
  }
}

function normalizeMime(m: string): string {
  if (m.includes('png')) return 'image/png';
  if (m.includes('webp')) return 'image/webp';
  if (m.includes('gif')) return 'image/gif';
  return 'image/jpeg';
}

function parseJSON<T>(text: string): T | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// ---- Food camera -------------------------------------------------------------

export async function analyzeFoodPhoto(
  base64: string,
  mimeType: string,
): Promise<FoodPhotoAnalysis> {
  const parsed = await visionJSON<{
    foods: { name: string; portion: string; calories: number; proteinG: number }[];
    confidence: 'low' | 'medium' | 'high';
  }>({
    base64,
    mimeType,
    maxTokens: 700,
    system:
      'You are a nutrition estimator. Identify foods in the photo and estimate portion, calories, and protein for each. Be realistic and conservative. Return ONLY JSON: {"foods":[{"name","portion","calories","proteinG"}],"confidence":"low|medium|high"}.',
    userText: 'Analyse this meal. Estimate per-item calories and protein.',
  });

  if (!parsed || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
    return { foods: [], calorieRange: [0, 0], proteinG: 0, confidence: 'low', source: 'manual' };
  }

  const totalCal = parsed.foods.reduce((a, f) => a + (Number(f.calories) || 0), 0);
  const totalPro = parsed.foods.reduce((a, f) => a + (Number(f.proteinG) || 0), 0);
  // Widen the range based on confidence.
  const margin = parsed.confidence === 'high' ? 0.1 : parsed.confidence === 'medium' ? 0.2 : 0.35;
  return {
    foods: parsed.foods.map((f) => ({
      name: String(f.name),
      portion: String(f.portion ?? ''),
      calories: Math.round(Number(f.calories) || 0),
      proteinG: Math.round(Number(f.proteinG) || 0),
    })),
    calorieRange: [Math.round(totalCal * (1 - margin)), Math.round(totalCal * (1 + margin))],
    proteinG: Math.round(totalPro),
    confidence: parsed.confidence ?? 'low',
    source: 'ai',
  };
}

// ---- Menu scanner ------------------------------------------------------------

export async function scanMenu(
  base64: string,
  mimeType: string,
  profile: OnboardingProfile,
  plan: Plan,
): Promise<MenuScanResult> {
  const parsed = await visionJSON<{
    recommendations: { dish: string; reason: string; calMin: number; calMax: number }[];
    avoid: string[];
    confidence: 'low' | 'medium' | 'high';
  }>({
    base64,
    mimeType,
    maxTokens: 800,
    system: `You read menus and recommend the best options for a user whose goal is ${profile.goal.replace('_', ' ')}, diet is ${profile.dietType}, allergies: ${profile.allergies.join(', ') || 'none'}, daily target ~${plan.macros.calories} kcal and ${plan.macros.proteinG} g protein. Pick 3-4 items visible in the menu image, rank them best-first, and list a few to avoid. Return ONLY JSON: {"recommendations":[{"dish","reason","calMin","calMax"}],"avoid":[string],"confidence":"low|medium|high"}.`,
    userText: 'Recommend the best dishes on this menu for my goal.',
  });

  if (!parsed || !Array.isArray(parsed.recommendations)) {
    return { recommendations: [], avoid: [], confidence: 'low', source: 'manual' };
  }
  return {
    recommendations: parsed.recommendations.map((r, i) => ({
      dish: String(r.dish),
      reason: String(r.reason ?? ''),
      estCalories: [Math.round(Number(r.calMin) || 0), Math.round(Number(r.calMax) || 0)],
      rank: i + 1,
    })),
    avoid: (parsed.avoid ?? []).map(String),
    confidence: parsed.confidence ?? 'low',
    source: 'ai',
  };
}

// ---- Progress photo ----------------------------------------------------------

export async function analyzeProgressPhotos(
  latestBase64: string,
  mimeType: string,
): Promise<ProgressPhotoAnalysis | null> {
  const parsed = await visionJSON<{
    observations: string[];
    encouragement: string;
    confidence: 'low' | 'medium' | 'high';
  }>({
    base64: latestBase64,
    mimeType,
    maxTokens: 500,
    system:
      'You give supportive, qualitative observations about a fitness progress photo (posture, apparent muscle tone, overall composition). NEVER give a body-fat percentage or any medical-grade measurement. Keep it kind and non-judgemental. Return ONLY JSON: {"observations":[string],"encouragement":string,"confidence":"low|medium|high"}.',
    userText: 'Give a few gentle, qualitative observations about this progress photo.',
  });
  return parsed
    ? {
        observations: (parsed.observations ?? []).map(String),
        encouragement: String(parsed.encouragement ?? ''),
        confidence: parsed.confidence ?? 'low',
      }
    : null;
}

// ---- Exercise form assistance ------------------------------------------------

const FORM_LABEL: Record<FormExercise, string> = {
  squat: 'squat',
  pushup: 'push-up',
  lunge: 'lunge',
  plank: 'plank',
  shoulder_press: 'shoulder press',
  bicep_curl: 'bicep curl',
};

export async function checkForm(
  base64: string,
  mimeType: string,
  exercise: FormExercise,
): Promise<FormFeedback> {
  const parsed = await visionJSON<{
    goodPoints: string[];
    corrections: string[];
    postureWarnings: string[];
    confidence: 'low' | 'medium' | 'high';
  }>({
    base64,
    mimeType,
    maxTokens: 600,
    system: `You are a form coach reviewing a photo of someone doing a ${FORM_LABEL[exercise]}. Give what looks good, specific corrections, and general posture warnings. You are NOT a medical professional — never diagnose injuries; if something looks risky, advise stopping and seeing a professional. Return ONLY JSON: {"goodPoints":[string],"corrections":[string],"postureWarnings":[string],"confidence":"low|medium|high"}.`,
    userText: `Review my ${FORM_LABEL[exercise]} form in this photo.`,
  });

  if (!parsed) {
    return {
      exercise,
      goodPoints: [],
      corrections: [],
      postureWarnings: [],
      confidence: 'low',
      source: 'manual',
    };
  }
  return {
    exercise,
    goodPoints: (parsed.goodPoints ?? []).map(String),
    corrections: (parsed.corrections ?? []).map(String),
    postureWarnings: (parsed.postureWarnings ?? []).map(String),
    confidence: parsed.confidence ?? 'low',
    source: 'ai',
  };
}
