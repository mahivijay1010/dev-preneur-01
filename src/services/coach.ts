// AI coach chat. Per the spec, the coach may only use approved exercise,
// nutrition, and safety data — so we ground every request in the user's own
// plan + our curated catalogs, and constrain the system prompt hard. Without an
// API key it falls back to deterministic, rule-based answers.

import { EXERCISES } from '../data/exercises';
import { FOODS } from '../data/foods';
import type { CoachMessage, OnboardingProfile, Plan } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export function isCoachAIEnabled(): boolean {
  return API_KEY.trim().length > 0;
}

const TONE: Record<OnboardingProfile['coachTone'], string> = {
  supportive: 'warm and encouraging',
  direct: 'concise and direct',
  scientific: 'precise, briefly explaining the reasoning',
  minimal: 'very brief',
  competitive: 'competitive and motivating, treating each day as a challenge to win',
};

function buildSystem(profile: OnboardingProfile, plan: Plan): string {
  const foodNames = FOODS.map((f) => f.name).join('; ');
  const exNames = EXERCISES.map((e) => e.name).join('; ');
  return [
    `You are FitPlan's AI coach. Be ${TONE[profile.coachTone]}.`,
    `STRICT RULES:`,
    `- Only recommend foods from this approved list: ${foodNames}.`,
    `- Only recommend exercises from this approved list: ${exNames}.`,
    `- The user's daily target is ${plan.macros.calorieRange[0]}-${plan.macros.calorieRange[1]} kcal and ${plan.macros.proteinG} g protein. Never invent different numbers.`,
    `- Goal: ${profile.goal.replace('_', ' ')}. Diet: ${profile.dietType}. Allergies: ${profile.allergies.join(', ') || 'none'}.`,
    `- You are NOT a doctor. For pain, injury, or medical concerns, tell the user to consult a professional. Never diagnose.`,
    `- Keep answers under 120 words. Be practical and specific to this user.`,
  ].join('\n');
}

// Deterministic fallback answers keyed to the spec's example questions.
function fallbackAnswer(question: string, profile: OnboardingProfile, plan: Plan): string {
  const q = question.toLowerCase();
  if (/(sore|train.*sore|sore.*train)/.test(q)) {
    return 'Light soreness is usually fine to train through — reduce load and focus on other muscle groups. Sharp or joint pain means rest and, if it persists, see a professional.';
  }
  if (/(miss|missed).*(workout|two|gym)/.test(q)) {
    return 'Missing a couple of sessions changes nothing long-term. Don’t try to “make up” everything at once — just do your next planned workout, or use Plan Repair for a quick session today.';
  }
  if (/weight.*(increase|up|gain)/.test(q)) {
    return 'Day-to-day weight swings are mostly water, food in your gut, and sodium — not fat. Judge progress by your 7-day average, not a single reading.';
  }
  if (/(eat now|what.*eat|hungry)/.test(q)) {
    const snack = FOODS.find((f) => f.slot === 'snack' && f.diets.includes(profile.dietType));
    return `Aim for protein + fibre. From your plan, ${snack ? snack.name : 'a protein-forward snack'} is a solid choice and keeps you within your ${plan.macros.proteinG} g protein target.`;
  }
  if (/(replace|swap).*meal/.test(q)) {
    return 'You can swap any meal for one with similar calories and protein from your plan. Open a meal and pick an alternative — or tell me which meal and I’ll suggest one.';
  }
  if (/restaurant|order|eating out/.test(q)) {
    return 'Lead with a grilled/baked protein, add vegetables, keep fried sides and sugary drinks small. A palm of protein, a fist of carbs, a thumb of fats is a good target.';
  }
  return `I can help with meals, workouts, and staying on track toward your ${profile.goal.replace('_', ' ')} goal. Ask me things like “what should I eat now?” or “can I train while sore?”. (Add an API key to enable full AI answers.)`;
}

export async function askCoach(
  question: string,
  history: CoachMessage[],
  profile: OnboardingProfile,
  plan: Plan,
): Promise<string> {
  if (!isCoachAIEnabled()) {
    return fallbackAnswer(question, profile, plan);
  }

  const messages = [
    ...history.slice(-8).map((m) => ({
      role: m.role === 'coach' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    })),
    { role: 'user' as const, content: question },
  ];

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
        max_tokens: 400,
        system: buildSystem(profile, plan),
        messages,
      }),
    });
    if (!res.ok) return fallbackAnswer(question, profile, plan);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    return text.trim() || fallbackAnswer(question, profile, plan);
  } catch {
    return fallbackAnswer(question, profile, plan);
  }
}
