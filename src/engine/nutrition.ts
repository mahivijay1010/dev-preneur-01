// Deterministic nutrition math. Uses the Mifflin-St Jeor equation for BMR,
// standard activity multipliers for TDEE, evidence-based protein targets, and
// a moderate calorie deficit/surplus based on the user's goal.

import type { ActivityLevel, Macros, OnboardingProfile } from '../types';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function bmr(p: OnboardingProfile): number {
  // Mifflin-St Jeor
  const base = 10 * p.currentWeightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(p: OnboardingProfile): number {
  return bmr(p) * ACTIVITY_MULTIPLIER[p.activityLevel];
}

export function computeMacros(p: OnboardingProfile): Macros {
  const maintenance = tdee(p);

  // Moderate, safe adjustment: ~15% deficit for loss, ~10% surplus for gain.
  const target =
    p.goal === 'weight_loss' ? maintenance * 0.85 : maintenance * 1.1;

  // Safety floor so we never recommend dangerously low intake.
  const floor = p.sex === 'male' ? 1500 : 1200;
  const calories = Math.max(target, floor);

  // Protein: 1.8 g/kg for loss (muscle sparing), 2.0 g/kg for gain.
  const perKg = p.goal === 'weight_loss' ? 1.8 : 2.0;
  const proteinG = Math.round(p.currentWeightKg * perKg);

  // Fat at ~25% of calories, remainder to carbs.
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(
    0,
    Math.round((calories - proteinG * 4 - fatG * 9) / 4),
  );

  const rounded = Math.round(calories / 10) * 10;
  return {
    calories: rounded,
    calorieRange: [rounded - 100, rounded + 100],
    proteinG,
    carbsG,
    fatG,
  };
}

export function nutritionGuidelines(p: OnboardingProfile, m: Macros): string[] {
  const g: string[] = [
    `Aim for ${m.calorieRange[0]}–${m.calorieRange[1]} kcal per day.`,
    `Hit ~${m.proteinG} g protein daily — spread it across meals.`,
    'Fill half your plate with vegetables at lunch and dinner.',
    'Drink water before meals; aim for 2–3 litres a day.',
  ];
  if (p.goal === 'weight_loss') {
    g.push('Prioritise protein and fibre to stay full in a calorie deficit.');
  } else {
    g.push('Eat in a slight surplus and add a snack if you struggle to hit calories.');
  }
  if (p.medicalNotes.trim()) {
    g.push('Follow any guidance from your doctor regarding your noted conditions.');
  }
  return g;
}
