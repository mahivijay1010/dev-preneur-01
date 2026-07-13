// Automatic plan adjustments. Per the spec: never change targets based on one
// day — use rolling averages and a minimum observation period, and change things
// gradually. All logic here is deterministic and conservative.

import type {
  Adjustment,
  OnboardingProfile,
  Plan,
  WeeklyReview,
} from '../types';

// We require at least two weekly reviews before touching calories, so a single
// noisy week can never swing the plan.
const MIN_REVIEWS_FOR_CALORIE_CHANGE = 2;

// Caps so changes are always gradual.
const MAX_CALORIE_STEP = 150; // kcal per adjustment

interface AdjustmentDecision {
  calorieDelta: number;
  changes: string[];
}

// Expected healthy weekly weight change as a fraction of bodyweight.
function expectedWeeklyChange(profile: OnboardingProfile): number {
  // ~0.5% of bodyweight per week is a sustainable rate.
  const rate = 0.005 * profile.currentWeightKg;
  return profile.goal === 'weight_loss' ? -rate : rate;
}

export function decideAdjustment(
  profile: OnboardingProfile,
  plan: Plan,
  reviews: WeeklyReview[],
): AdjustmentDecision {
  const changes: string[] = [];
  let calorieDelta = 0;

  const recent = [...reviews].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const latest = recent[recent.length - 1];
  if (!latest) return { calorieDelta: 0, changes: ['Not enough data yet — keeping your plan the same.'] };

  // --- Calorie adjustment (needs a minimum observation window) ---
  if (recent.length >= MIN_REVIEWS_FOR_CALORIE_CHANGE) {
    const withWeight = recent.filter((r) => r.avgWeightKg !== null).slice(-3);
    if (withWeight.length >= 2) {
      const first = withWeight[0].avgWeightKg!;
      const last = withWeight[withWeight.length - 1].avgWeightKg!;
      const weeks = withWeight.length - 1;
      const actualPerWeek = (last - first) / weeks;
      const expected = expectedWeeklyChange(profile);

      if (profile.goal === 'weight_loss') {
        // Losing too slowly (or gaining) → reduce calories.
        if (actualPerWeek > expected * 0.5) {
          calorieDelta = -Math.min(MAX_CALORIE_STEP, 100);
          changes.push(
            `Weight loss is slower than target over ${weeks + 1} weeks — reducing daily calories by ${Math.abs(calorieDelta)}.`,
          );
        } else if (actualPerWeek < expected * 1.8) {
          // Losing too fast → add calories back (protect muscle & energy).
          calorieDelta = Math.min(MAX_CALORIE_STEP, 100);
          changes.push(
            `Weight is dropping faster than the safe range — increasing daily calories by ${calorieDelta} to protect energy and muscle.`,
          );
        }
      } else {
        // Muscle gain: too fast → trim; too slow → add.
        if (actualPerWeek > expected * 1.8) {
          calorieDelta = -Math.min(MAX_CALORIE_STEP, 100);
          changes.push(`Gaining faster than needed — trimming ${Math.abs(calorieDelta)} calories to limit fat gain.`);
        } else if (actualPerWeek < expected * 0.5) {
          calorieDelta = Math.min(MAX_CALORIE_STEP, 100);
          changes.push(`Gains have stalled — adding ${calorieDelta} calories to fuel growth.`);
        }
      }
    }
  } else {
    changes.push('Still in the observation window — calories held steady this week.');
  }

  // --- Non-calorie, single-week signals (safe to act on immediately) ---
  if (latest.painOrInjury) {
    changes.push('You reported pain/injury — swapping to lower-impact exercises and adding recovery. Please consult a professional if it persists.');
  }
  const attendance = latest.workoutsPlanned > 0
    ? latest.workoutsCompleted / latest.workoutsPlanned
    : 1;
  if (attendance < 0.5) {
    changes.push('Workout completion was low — shortening sessions and reducing weekly volume to rebuild the habit.');
  }
  if (latest.mealDifficulty >= 4) {
    changes.push('Meals were hard to follow — suggesting easier, cheaper options next week.');
  }
  if (latest.hunger >= 4 && profile.goal === 'weight_loss') {
    changes.push('High hunger noted — prioritising higher-protein, higher-fibre meals to keep you full.');
  }
  if (latest.sleep <= 2 || latest.energy <= 2) {
    changes.push('Low sleep/energy — reducing intensity and increasing recovery this week.');
  }

  if (changes.length === 0) {
    changes.push('Everything is on track — no changes needed. Keep it up!');
  }

  return { calorieDelta, changes };
}

// Applies an adjustment to a plan, returning a new plan + the record. Numbers
// stay clamped to safe floors handled elsewhere in the nutrition engine.
export function applyAdjustment(
  plan: Plan,
  decision: AdjustmentDecision,
  reviewId: string,
  id: string,
  createdAt: string,
): { plan: Plan; adjustment: Adjustment } {
  const cal = plan.macros.calories + decision.calorieDelta;
  const rounded = Math.round(cal / 10) * 10;
  const nextPlan: Plan = {
    ...plan,
    macros: {
      ...plan.macros,
      calories: rounded,
      calorieRange: [rounded - 100, rounded + 100],
    },
  };
  return {
    plan: nextPlan,
    adjustment: {
      id,
      createdAt,
      reviewId,
      calorieDelta: decision.calorieDelta,
      changes: decision.changes,
    },
  };
}
