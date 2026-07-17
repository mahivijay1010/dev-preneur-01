// Optional AI personalization layer. Per the product spec, AI is used ONLY to
// personalize wording and food choices — never to compute calories, protein, or
// safety-critical numbers. If no API key is configured, everything falls back to
// the deterministic templates and the app works fully offline.

import type { CoachTone, OnboardingProfile, Plan } from '../types';
import { hasApiSession, postAI } from './api';

export function isAIEnabled(): boolean {
  return hasApiSession();
}

const TONE_HINT: Record<CoachTone, string> = {
  supportive: 'warm, encouraging, and reassuring',
  direct: 'concise, no-nonsense, and action-oriented',
  scientific: 'precise and evidence-based, briefly citing the why',
  minimal: 'extremely brief — a few words only',
  competitive: 'competitive and motivating, framing meals as fuel to win the day',
};

interface PersonalizeResult {
  notes: Record<string, string>; // key: `${day}:${slot}` -> short note
}

// Adds a short, tone-matched note to each meal. Numbers are never altered here.
export async function personalizePlan(
  plan: Plan,
  profile: OnboardingProfile,
): Promise<Plan> {
  if (!isAIEnabled()) return plan;

  const mealList = plan.meals.flatMap((d) =>
    d.items.map((it) => ({ key: `${d.day}:${it.slot}`, name: it.name })),
  );

  const system = `You are a certified nutrition coach. Your job is ONLY to write a short, ${TONE_HINT[profile.coachTone]} note (max 12 words) for each meal, matching the user's ${profile.dietType} diet and ${profile.goal.replace('_', ' ')} goal. Never change any numbers. Return ONLY valid JSON: {"notes": {"<key>": "<note>"}}.`;

  const userMsg = `User cuisine preference: ${profile.cuisine || 'any'}. Cooking time budget: ${profile.cookingTimeMin} min. Meals:\n${mealList
    .map((m) => `${m.key} = ${m.name}`)
    .join('\n')}`;

  try {
    const data = await postAI({
      maxTokens: 1024,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const text: string = data?.content?.[0]?.text ?? '';
    const parsed = safeParse(text);
    if (!parsed) return plan;

    const meals = plan.meals.map((d) => ({
      ...d,
      items: d.items.map((it) => {
        const note = parsed.notes[`${d.day}:${it.slot}`];
        return note ? { ...it, note } : it;
      }),
    }));
    return { ...plan, meals, personalized: true };
  } catch {
    // Any network/parse failure → deterministic plan is returned unchanged.
    return plan;
  }
}

function safeParse(text: string): PersonalizeResult | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(text.slice(start, end + 1));
    if (obj && typeof obj.notes === 'object') return obj as PersonalizeResult;
    return null;
  } catch {
    return null;
  }
}
