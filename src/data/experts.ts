// Directory of available human experts, plus the plan-review generator they use.
// In production these are real professionals with their own dashboard; here the
// directory is seeded data and reviews are generated from the user's plan +
// logged signals so the flow is demonstrable offline.

import type { Expert, OnboardingProfile, Plan, PlanReview, WeeklyReview } from '../types';

export const EXPERTS: Expert[] = [
  {
    id: 'exp_trainer',
    name: 'Ravi Menon',
    kind: 'trainer',
    credential: 'Certified Personal Trainer (NASM)',
    specialty: 'Strength & beginner programming',
    icon: '🏋️',
  },
  {
    id: 'exp_dietitian',
    name: 'Dr. Ananya Rao',
    kind: 'dietitian',
    credential: 'Registered Dietitian (RD)',
    specialty: 'Weight management & Indian diets',
    icon: '🥗',
  },
  {
    id: 'exp_physio',
    name: 'Sara Cohen',
    kind: 'physio',
    credential: 'Physiotherapist (MPT)',
    specialty: 'Injury-safe training & rehab',
    icon: '🩺',
  },
  {
    id: 'exp_coach',
    name: 'Marcus Bell',
    kind: 'coach',
    credential: 'Health & Habit Coach',
    specialty: 'Adherence & behaviour change',
    icon: '🎯',
  },
];

export function expertById(id: string): Expert | undefined {
  return EXPERTS.find((e) => e.id === id);
}

// Generates an expert plan review grounded in the actual plan + recent reviews.
export function generatePlanReview(
  expert: Expert,
  profile: OnboardingProfile,
  plan: Plan,
  reviews: WeeklyReview[],
  id: string,
  createdAt: string,
): PlanReview {
  const latest = reviews[reviews.length - 1];
  const suggestions: string[] = [];

  if (expert.kind === 'dietitian') {
    suggestions.push(`Your ${plan.macros.calories} kcal / ${plan.macros.proteinG} g protein target looks appropriate for ${profile.goal.replace('_', ' ')}.`);
    if (latest && latest.mealDifficulty >= 4) suggestions.push('Meals seem hard to follow — let\'s simplify to 3-4 repeatable options.');
    suggestions.push('Spread protein across all meals; aim for 25-40 g each.');
  } else if (expert.kind === 'trainer') {
    const training = plan.workouts.filter((w) => !w.isRest).length;
    suggestions.push(`${training} training days suits your experience level.`);
    suggestions.push('Add a top set each week (small load or rep increase) to keep progressing.');
    if (latest && latest.workoutsPlanned > 0 && latest.workoutsCompleted / latest.workoutsPlanned < 0.6)
      suggestions.push('Completion was low — I\'ve suggested shorter sessions to rebuild the habit.');
  } else if (expert.kind === 'physio') {
    suggestions.push('Warm up 5 minutes before each session.');
    if (profile.medicalNotes.trim()) suggestions.push(`Noted: "${profile.medicalNotes.trim()}" — keep movements pain-free and regress if needed.`);
    if (latest?.painOrInjury) suggestions.push('You reported pain — reduce load and see me before progressing that movement.');
    else suggestions.push('No pain reported — good. Prioritise clean form over heavier loads.');
  } else {
    suggestions.push('Your consistency is the biggest lever — protect your logging streak.');
    if (latest && latest.satisfaction <= 2) suggestions.push('Satisfaction dipped; let\'s pick one small win for next week.');
    suggestions.push('Use Plan Repair on tough days instead of skipping entirely.');
  }

  return {
    id,
    expertId: expert.id,
    createdAt,
    summary: `${expert.name} reviewed your plan and it looks solid overall. A few tweaks below.`,
    suggestions,
  };
}

// A simple canned expert reply so the messaging thread feels alive offline.
export function expertReply(expert: Expert, userText: string): string {
  const t = userText.toLowerCase();
  if (/pain|hurt|injur/.test(t) && expert.kind !== 'physio')
    return 'That sounds like something our physiotherapist should look at — I\'ll flag it. In the meantime, stop any movement that causes sharp pain.';
  if (/eat|meal|diet|protein/.test(t))
    return 'Good question — aim to hit your protein target first, then fit the rest of your calories around meals you enjoy. Want me to adjust your plan?';
  if (/motiv|tired|give up|hard/.test(t))
    return 'Totally normal to feel that way. Let\'s shrink the goal for this week to something you\'re 90% sure you can do.';
  return `Thanks for the message — ${expert.name} here. I\'ll review your recent progress and get back to you with specifics.`;
}
