// Deterministic nutrition math. Uses the Mifflin-St Jeor equation for BMR,
// standard activity multipliers for TDEE, evidence-based protein targets, and
// a moderate calorie deficit/surplus based on the user's goal.

import type { ActivityLevel, Goal, Macros, OnboardingProfile } from '../types';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Human-readable goal names used across the UI.
export function goalLabel(goal: Goal): string {
  if (goal === 'weight_loss') return 'Weight loss';
  if (goal === 'muscle_gain') return 'Muscle gain';
  return 'Body recomposition';
}

// Evidence-based recommended protein target (g per kg bodyweight) by goal.
// Recomposition uses the highest intake to preserve/build muscle in a deficit.
export function recommendedProteinPerKg(goal: Goal): number {
  if (goal === 'muscle_gain') return 2.0;
  if (goal === 'body_recomposition') return 2.2;
  return 1.8;
}

// The protein rate actually used for a profile: the user's chosen override if
// set (and sane), otherwise the goal-based recommendation.
export function proteinPerKg(profileOrGoal: OnboardingProfile | Goal): number {
  if (typeof profileOrGoal === 'string') return recommendedProteinPerKg(profileOrGoal);
  const p = profileOrGoal;
  const override = p.proteinPerKgOverride;
  if (typeof override === 'number' && override >= PROTEIN_MIN && override <= PROTEIN_MAX) {
    return override;
  }
  return recommendedProteinPerKg(p.goal);
}

// Slider bounds and a plain-language status for a chosen protein rate.
export const PROTEIN_MIN = 1.0;
export const PROTEIN_MAX = 3.0;

export type ProteinStatus = {
  level: 'low' | 'good' | 'high';
  tone: 'danger' | 'warning' | 'success' | 'info';
  message: string;
};

export function proteinStatus(perKg: number, goal: Goal): ProteinStatus {
  const rec = recommendedProteinPerKg(goal);
  if (perKg < 1.2) {
    return {
      level: 'low',
      tone: 'danger',
      message: `Too low to protect muscle. Aim closer to ${rec} g/kg for your ${goalLabel(goal).toLowerCase()} goal.`,
    };
  }
  if (perKg < 1.6) {
    return {
      level: 'low',
      tone: 'warning',
      message: `A bit low for muscle retention — ${rec} g/kg is recommended for your goal.`,
    };
  }
  if (perKg > 2.6) {
    return {
      level: 'high',
      tone: 'info',
      message: 'Higher than most people need — safe if kidneys are healthy, but rarely adds benefit past ~2.2 g/kg.',
    };
  }
  return {
    level: 'good',
    tone: 'success',
    message: perKg >= rec
      ? 'Right in the effective range for building and keeping muscle.'
      : 'A solid, sustainable protein intake.',
  };
}

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

  // Moderate, safe adjustment: ~15% deficit for loss, ~10% surplus for gain,
  // and a small ~5% deficit for recomposition (build muscle while losing fat
  // by eating near maintenance with high protein and progressive training).
  const target =
    p.goal === 'weight_loss'
      ? maintenance * 0.85
      : p.goal === 'muscle_gain'
        ? maintenance * 1.1
        : maintenance * 0.95;

  // Safety floor so we never recommend dangerously low intake.
  const floor = p.sex === 'male' ? 1500 : 1200;
  const calories = Math.max(target, floor);

  const proteinG = Math.round(p.currentWeightKg * proteinPerKg(p));

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
  } else if (p.goal === 'muscle_gain') {
    g.push('Eat in a slight surplus and add a snack if you struggle to hit calories.');
  } else {
    g.push('Eat near maintenance with very high protein — the scale may barely move while your body composition improves.');
    g.push('Trust the mirror, photos, and strength gains more than the scale on recomposition.');
  }
  if (p.medicalNotes.trim()) {
    g.push('Follow any guidance from your doctor regarding your noted conditions.');
  }
  return g;
}
