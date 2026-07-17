// AI coach chat. Per the spec, the coach may only use approved exercise,
// nutrition, and safety data — so we ground every request in the user's own
// plan + our curated catalogs, and constrain the system prompt hard. Without an
// API key it falls back to a rule-based coach that still holds a natural
// conversation, answers common fitness questions, and politely refuses
// anything outside fitness, nutrition, and recovery.

import { EXERCISES } from '../data/exercises';
import { FOODS } from '../data/foods';
import { goalLabel } from '../engine/nutrition';
import { currentWeekday } from '../engine/week';
import type { CoachAction, CoachMessage, OnboardingProfile, Plan } from '../types';
import { hasApiSession, postAI } from './api';

export function isCoachAIEnabled(): boolean {
  return hasApiSession();
}

export interface CoachReply {
  text: string;
  actions: CoachAction[];
}

// Infers up to two relevant quick-actions from the user's question so the coach
// can turn advice into a tap. Works for both the AI and offline paths.
export function suggestActions(question: string, plan: Plan): CoachAction[] {
  const q = question.toLowerCase();
  const actions: CoachAction[] = [];
  const add = (label: string, route: string) => {
    if (actions.length < 2 && !actions.some((a) => a.route === route)) actions.push({ label, route });
  };
  const workout = plan.workouts.find((w) => w.day === currentWeekday());
  const firstEx = workout && !workout.isRest ? workout.exercises[0]?.exerciseId : undefined;
  // If the message names an exercise, link that demo; otherwise today's first.
  const named = EXERCISES.find((e) =>
    e.name.toLowerCase().split(/[\s-]+/).some((w) => w.length >= 4 && q.includes(w)),
  );
  const demoId = named?.id ?? firstEx;

  if (/(form|technique|posture|how (do|to)|demo|show me)/.test(q)) {
    if (demoId) add('Watch demo', `/exercise/${demoId}`);
    add('Check my form', '/form-check');
  }
  if (/(sore|rest|recover|tired|missed|skip|no gym|travel|only \d|short on time|no time)/.test(q)) {
    add('Fix today’s plan', '/repair');
  }
  if (/restaurant|eating out|order|takeaway|takeout/.test(q)) {
    add('Restaurant mode', '/restaurant');
  }
  if (/(replace|swap|change).*meal|meal|recipe|cook|make|dish|eat|hungry|snack|breakfast|lunch|dinner/.test(q)) {
    add('Log a meal', '/food-camera');
    add('See my meals', '/plan');
  }
  if (/(weight|scale|progress|plateau|stuck|photo|measure)/.test(q)) {
    add('Add progress photo', '/progress-photo');
    add('View progress', '/progress');
  }
  if (/(protein|calorie|kcal|macro|carb|fat|nutrition)/.test(q)) {
    add('Nutrition blueprint', '/plan');
  }
  if (/(log|track|record).*(weight|water|steps|sleep|meal|workout)|voice|speak/.test(q)) {
    add('Talk to log', '/voice-log');
  }
  return actions;
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
    `You are FitPlan's AI coach — talk like a real, friendly human coach. Be ${TONE[profile.coachTone]}.`,
    `Acknowledge what the user said, answer their actual question, and be specific to them. Ask a short follow-up when it helps.`,
    `SCOPE: Only answer questions about fitness, training, exercise technique, nutrition, meals, hydration, sleep, recovery, motivation, and healthy habits. If the user asks about anything outside that (general knowledge, coding, news, politics, relationships, etc.), briefly and warmly say that you can only help with their fitness journey, then steer back with a relevant suggestion. A simple greeting or thanks is fine — respond naturally.`,
    `STRICT RULES:`,
    `- Only recommend foods from this approved list: ${foodNames}.`,
    `- Only recommend exercises from this approved list: ${exNames}.`,
    `- The user's daily target is ${plan.macros.calorieRange[0]}-${plan.macros.calorieRange[1]} kcal and ${plan.macros.proteinG} g protein. Never invent different numbers.`,
    `- Goal: ${goalLabel(profile.goal)}. Diet: ${profile.dietType}. Allergies: ${profile.allergies.join(', ') || 'none'}.`,
    `- You are NOT a doctor. For pain, injury, or medical concerns, tell the user to consult a professional. Never diagnose.`,
    `- Keep answers under 120 words. Be practical and specific to this user.`,
  ].join('\n');
}

// --- Offline (no-API) coach -------------------------------------------------

// Words that mark a message as being about fitness/nutrition/recovery. Used to
// keep the coach on-topic when there's no AI available.
const FITNESS_TERMS = [
  'workout', 'work out', 'train', 'training', 'exercise', 'gym', 'rep', 'set ', 'sets',
  'muscle', 'strength', 'stronger', 'lift', 'weight', 'fat', 'lose', 'losing', 'gain',
  'bulk', 'cut', 'recomp', 'tone', 'abs', 'belly', 'protein', 'carb', 'calorie', 'kcal',
  'macro', 'fibre', 'fiber', 'meal', 'diet', 'eat', 'eating', 'food', 'snack', 'breakfast',
  'lunch', 'dinner', 'hungry', 'hunger', 'water', 'hydrat', 'sleep', 'rest', 'recover',
  'sore', 'cardio', 'run', 'walk', 'step', 'stretch', 'mobility', 'warm up', 'warmup',
  'cooldown', 'injury', 'pain', 'squat', 'push', 'pull', 'deadlift', 'bench', 'curl',
  'plank', 'lunge', 'press', 'motivat', 'energy', 'plateau', 'stuck', 'form', 'posture',
  'technique', 'supplement', 'creatine', 'whey', 'plan', 'progress', 'goal', 'fit', 'health',
  'body', 'routine', 'reps',
];

// Common ingredient/food tokens the coach can build a meal around.
const INGREDIENTS = [
  'potato', 'potatoes', 'rice', 'chicken', 'egg', 'eggs', 'oats', 'paneer', 'tofu',
  'lentil', 'dal', 'banana', 'spinach', 'broccoli', 'salmon', 'fish', 'beef', 'yogurt',
  'quinoa', 'chickpea', 'avocado', 'cheese', 'milk', 'peanut', 'tempeh', 'bean', 'beans',
  'oatmeal', 'roti', 'bread', 'pasta', 'vegetable', 'veggies', 'salad', 'shake',
];

function proteinByDiet(diet: OnboardingProfile['dietType']): string {
  switch (diet) {
    case 'vegan': return 'tofu, tempeh, or lentils';
    case 'vegetarian': return 'paneer, eggs, or Greek yogurt';
    case 'pescatarian': return 'fish or eggs';
    case 'keto': return 'eggs, chicken thighs, or cheese';
    default: return 'grilled chicken, eggs, or fish';
  }
}

function isFitnessRelated(q: string): boolean {
  return FITNESS_TERMS.some((t) => q.includes(t)) || INGREDIENTS.some((w) => q.includes(w));
}

function greetingReply(profile: OnboardingProfile, plan: Plan): string {
  return `Hey! I’m your FitPlan coach. I can help you hit your ${plan.macros.proteinG} g protein target, plan meals, adjust today’s training, or stay on track toward your ${goalLabel(profile.goal).toLowerCase()} goal. What’s on your mind?`;
}

function ingredientMeal(q: string, profile: OnboardingProfile, plan: Plan): string | null {
  const wantsMeal = /(meal|recipe|cook|make|dish|prepare|prep|eat|breakfast|lunch|dinner)/.test(q);
  const ingredient = INGREDIENTS.find((w) => q.includes(w));
  if (!ingredient && !wantsMeal) return null;

  const match = ingredient
    ? FOODS.find((f) => f.diets.includes(profile.dietType) && f.name.toLowerCase().includes(ingredient.replace(/e?s$/, '')))
    : undefined;
  const protein = proteinByDiet(profile.dietType);
  const base = ingredient
    ? `${capitalize(ingredient)} works great as your carb. Build the plate around it: a palm of protein (${protein}), a fist of ${ingredient}, and two fists of veg.`
    : `Here’s a simple template: a palm of protein (${protein}), a fist of a carb you like, and two fists of vegetables.`;
  const macro = ` That keeps you near your ${plan.macros.calorieRange[0]}–${plan.macros.calorieRange[1]} kcal range while pushing toward ${plan.macros.proteinG} g protein.`;
  const fromPlan = match ? ` From your plan, “${match.name}” (${match.proteinG} g protein) fits nicely too.` : '';
  return base + macro + fromPlan;
}

// A rule-based coach that stays conversational and on-topic.
function offlineAnswer(question: string, profile: OnboardingProfile, plan: Plan): string {
  const q = ` ${question.toLowerCase().trim()} `;

  // Greetings / small talk.
  if (/^\s*(hi|hey|hello|yo|hiya|sup|hola|namaste|good (morning|afternoon|evening))\b/.test(q) || q.trim() === 'hi') {
    return greetingReply(profile, plan);
  }
  if (/(thank|thanks|thx|cheers|appreciate)/.test(q) || /^\s*(ok|okay|cool|great|got it|nice)\s*$/.test(q)) {
    return 'Anytime — I’ve got your back. Tell me what you want to tackle next: a meal, today’s workout, or staying consistent.';
  }
  if (/\b(who are you|what can you do|help|what do you do)\b/.test(q)) {
    return `I’m your fitness coach. I can plan meals around your ${plan.macros.proteinG} g protein target, adjust workouts, talk you through form, and keep you moving toward your ${goalLabel(profile.goal).toLowerCase()} goal. What would help most right now?`;
  }

  // Off-topic guard — politely decline anything not fitness-related.
  if (!isFitnessRelated(q)) {
    return 'I’m your fitness coach, so I’ll stick to training, nutrition, and recovery — that’s where I can actually help you. Want a meal idea, a plan for today’s session, or help staying on track?';
  }

  // Specific "how much" questions first (before the broader "what to eat" match,
  // since phrases like "how much protein should I eat" also contain "eat").
  if (/(how much|how many|what.?s my|daily).*(protein)|protein.*(target|need|intake|per day|a day)/.test(q)) {
    return `Your target is about ${plan.macros.proteinG} g protein a day — spread it across meals, roughly a palm of protein each. It protects muscle and keeps you full for your ${goalLabel(profile.goal).toLowerCase()} goal.`;
  }
  if (/(how much|how many|what.?s my|daily).*(calorie|kcal)|calorie.*(target|need|per day|a day)/.test(q)) {
    return `Aim for ${plan.macros.calorieRange[0]}–${plan.macros.calorieRange[1]} kcal a day. You don’t have to hit it exactly — landing in that range most days is what drives results.`;
  }

  // Ingredient / meal building.
  const meal = ingredientMeal(q, profile, plan);
  if (meal && /(meal|recipe|cook|make|dish|prepare|prep)/.test(q)) return meal;

  // Specific fitness intents.
  if (/(sore|doms|ache)/.test(q)) {
    return 'Light soreness is usually fine to train through — lower the load and work other muscle groups. Sharp or joint pain means rest, and if it lingers, see a professional. Gentle movement and protein help you recover.';
  }
  if (/(miss|missed|skip|skipped).*(workout|session|gym|day|week)/.test(q) || /(missed|skipped) (it|today|yesterday)/.test(q)) {
    return 'One or two missed sessions change nothing long-term — don’t try to cram them back. Just do your next planned workout, or use Plan Repair on the Today tab for a quick session. Consistency over weeks is what counts.';
  }
  if (/(weight|scale).*(up|increase|gain|higher)|gained weight|why.*heavier/.test(q)) {
    return 'Daily weight swings are mostly water, food in your gut, and salt — not fat. Judge progress by your 7-day average and your photos/measurements, not one reading. Keep going.';
  }
  if (/(not losing|stopped losing|plateau|stuck|no progress|not working)/.test(q)) {
    return 'Plateaus are normal. First, check consistency over 2 weeks and your protein. If the trend is truly flat, we nudge calories slightly and keep training hard — the Weekly Review does this automatically. Sleep and steps matter more than people expect.';
  }
  if (meal || /(eat now|what.*eat|hungry|snack)/.test(q)) {
    const snack = FOODS.find((f) => f.slot === 'snack' && f.diets.includes(profile.dietType));
    return `Go for protein + fibre. ${snack ? `“${snack.name}” (${snack.proteinG} g protein)` : 'A protein-forward snack'} is a solid pick and keeps you moving toward your ${plan.macros.proteinG} g target.` + (meal ? ` ${meal}` : '');
  }
  if (/(replace|swap|change).*meal|don.?t like.*meal/.test(q)) {
    return 'Easy — swap any meal for one with similar calories and protein. Open the meal on the Plan tab and pick an alternative, or tell me which meal and what you have, and I’ll suggest one.';
  }
  if (/restaurant|order|eating out|takeaway|takeout/.test(q)) {
    return 'Lead with a grilled or baked protein, load up veg, and keep fried sides and sugary drinks small. A palm of protein, a fist of carbs, a thumb of fats keeps most restaurant meals on track.';
  }
  if (/(water|hydrat|drink)/.test(q)) {
    return 'Aim for roughly 2–3 litres of water a day, more on training days. A glass before each meal helps with fullness and makes hitting the target easy — log it on the Today tab.';
  }
  if (/(sleep|tired|exhausted|rest day|recovery)/.test(q)) {
    return 'Sleep is where progress actually happens — aim for 7–9 hours. If you’re wiped, take the rest day or drop intensity; recovery isn’t time off the plan, it’s part of it.';
  }
  if (/(cardio|run|running|steps|walk)/.test(q)) {
    return `A daily walk (aim ~8–10k steps) plus your sessions covers most cardio needs${profile.goal === 'muscle_gain' ? ' — keep it light so it doesn’t eat into recovery' : ' and supports your fat-loss goal'}. Zone-2 walking or easy cycling is plenty.`;
  }
  if (/(motivat|lazy|demotivat|don.?t feel like|can.?t be bothered|give up)/.test(q)) {
    return 'Totally normal to feel that way. Shrink the goal: commit to just the warm-up or a 10-minute version. Momentum almost always carries you the rest of the way, and showing up beats a perfect session you skip.';
  }
  if (/(form|technique|posture|how (do|to) (i )?(do|perform))/.test(q)) {
    return 'Tap any exercise on your Plan or Today tab to see an animated demo, step-by-step cues, and common mistakes. For a live check, use “Check form” to snap a photo mid-rep. What movement are you working on?';
  }
  if (/(supplement|creatine|whey|protein powder|bcaa)/.test(q)) {
    return 'Supplements are optional — food first. A protein shake helps you hit your target conveniently, and creatine (3–5 g/day) is well-supported for strength. Nothing else is essential. Check with a professional if you have conditions.';
  }
  if (/(warm.?up|stretch|mobility|before workout)/.test(q)) {
    return 'Spend 5 minutes: light cardio to raise your heart rate, then a few dynamic moves for the muscles you’re training (leg swings, arm circles, bodyweight squats). Save long static stretches for after.';
  }
  if (/(beginner|start|new to|just starting|first time)/.test(q)) {
    return `Welcome in! Start with your ${plan.workouts?.length ? 'planned' : ''} sessions, focus on form over load, and hit your ${plan.macros.proteinG} g protein most days. Two solid weeks of consistency beats any perfect plan — I’ll adjust as you go.`;
  }

  // On-topic but no specific match — stay helpful and conversational.
  return `Good question. Here’s the short version: keep training consistent, aim for ${plan.macros.proteinG} g protein and ${plan.macros.calorieRange[0]}–${plan.macros.calorieRange[1]} kcal, and prioritise sleep. Tell me a bit more — is this about food, your workout, or recovery? — and I’ll get specific.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function askCoach(
  question: string,
  history: CoachMessage[],
  profile: OnboardingProfile,
  plan: Plan,
): Promise<CoachReply> {
  const actions = suggestActions(question, plan);
  if (!isCoachAIEnabled()) {
    return { text: offlineAnswer(question, profile, plan), actions };
  }

  const messages = [
    ...history.slice(-8).map((m) => ({
      role: m.role === 'coach' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    })),
    { role: 'user' as const, content: question },
  ];

  try {
    const data = await postAI({
      maxTokens: 400,
      system: buildSystem(profile, plan),
      messages,
    });
    const text: string = data?.content?.[0]?.text ?? '';
    return { text: text.trim() || offlineAnswer(question, profile, plan), actions };
  } catch {
    return { text: offlineAnswer(question, profile, plan), actions };
  }
}
