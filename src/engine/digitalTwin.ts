// Fitness Digital Twin — the long-term moat. It learns from everything the user
// has logged and produces (a) a model of how THIS person responds, and (b)
// explainable adjustments in plain language. It is deliberately honest about
// uncertainty: every estimate carries a confidence and the basis it was derived
// from, and thin data yields low confidence rather than false precision.

import type {
  Adjustment,
  DailyLog,
  Measurement,
  OnboardingProfile,
  Plan,
  TwinAdjustment,
  TwinModel,
  WeeklyReview,
  Confidence,
} from '../types';
import { proteinPerKg } from './nutrition';

const KCAL_PER_KG = 7700; // energy in ~1 kg of body mass

export interface TwinInputs {
  logs: Record<string, DailyLog>;
  measurements: Record<string, Measurement>;
  reviews: WeeklyReview[];
  adjustments: Adjustment[];
  profile: OnboardingProfile | null;
  plan: Plan | null;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86400000);
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

// Average of the first / last window of weight readings to damp daily noise.
function edgeAverages(weights: { date: string; w: number }[], window: number) {
  const first = weights.slice(0, window).map((x) => x.w);
  const last = weights.slice(-window).map((x) => x.w);
  return { firstAvg: mean(first), lastAvg: mean(last) };
}

export function buildTwin(inp: TwinInputs): TwinModel {
  const logs = Object.values(inp.logs).sort((a, b) => a.date.localeCompare(b.date));
  const weights = logs
    .filter((l) => typeof l.weightKg === 'number')
    .map((l) => ({ date: l.date, w: l.weightKg! }));

  const dataDays =
    logs.length >= 2 ? daysBetween(logs[0].date, logs[logs.length - 1].date) + 1 : logs.length;
  const ready = logs.length >= 7;

  return {
    dataDays,
    ready,
    maintenanceCalories: estimateMaintenance(weights, inp.plan),
    recovery: estimateRecovery(logs),
    strength: estimateStrength(inp.reviews),
    dropoutRisk: estimateDropoutRisk(logs, inp.reviews),
    calorieResponse: estimateCalorieResponse(inp.adjustments, weights),
    adherenceDrivers: learnAdherenceDrivers(logs, inp.profile),
    preferredCoaching: inp.profile?.coachTone ?? 'supportive',
  };
}

function estimateMaintenance(
  weights: { date: string; w: number }[],
  plan: Plan | null,
): TwinModel['maintenanceCalories'] {
  if (!plan || weights.length < 4) {
    return {
      value: null,
      confidence: 'low',
      basis: 'Log your weight for a couple of weeks and I can estimate your true maintenance calories.',
    };
  }
  const span = daysBetween(weights[0].date, weights[weights.length - 1].date);
  const window = Math.min(3, Math.floor(weights.length / 2));
  const { firstAvg, lastAvg } = edgeAverages(weights, window);
  if (firstAvg === null || lastAvg === null || span < 7) {
    return {
      value: null,
      confidence: 'low',
      basis: 'Not enough spread in your weigh-ins yet — keep logging.',
    };
  }
  // Assume intended intake ≈ the plan target. Net balance from weight change.
  const intake = plan.macros.calories;
  const netPerDay = ((lastAvg - firstAvg) * KCAL_PER_KG) / span; // <0 when losing
  const maintenance = Math.round((intake - netPerDay) / 10) * 10;

  const confidence: Confidence = span >= 21 && weights.length >= 8 ? 'high' : span >= 14 ? 'medium' : 'low';
  return {
    value: maintenance,
    confidence,
    basis: `Derived from your ${span}-day weight trend against a ~${intake} kcal plan. It updates as you log more.`,
  };
}

function estimateRecovery(logs: DailyLog[]): TwinModel['recovery'] {
  const sleep = mean(logs.filter((l) => typeof l.sleepHours === 'number').map((l) => l.sleepHours!));
  const energy = mean(logs.filter((l) => typeof l.energy === 'number').map((l) => l.energy!));
  let quality: 'poor' | 'ok' | 'good' = 'ok';
  if (sleep !== null && energy !== null) {
    const s = sleep >= 7 ? 1 : sleep >= 6 ? 0.5 : 0;
    const e = energy >= 4 ? 1 : energy >= 3 ? 0.5 : 0;
    const score = s + e;
    quality = score >= 1.5 ? 'good' : score >= 1 ? 'ok' : 'poor';
  }
  const has = sleep !== null || energy !== null;
  return {
    value: { avgSleep: sleep ? round1(sleep) : null, avgEnergy: energy ? round1(energy) : null, quality },
    confidence: has ? 'medium' : 'low',
    basis: has
      ? `Based on your average sleep (${sleep ? round1(sleep) + 'h' : 'n/a'}) and energy ratings.`
      : 'Log sleep and energy to model your recovery.',
  };
}

function estimateStrength(reviews: WeeklyReview[]): TwinModel['strength'] {
  const improvingWeeks = reviews.filter((r) => r.strengthImproved).length;
  const trend: 'up' | 'flat' | 'unknown' =
    reviews.length === 0 ? 'unknown' : improvingWeeks >= Math.ceil(reviews.length / 2) ? 'up' : 'flat';
  return {
    value: { improvingWeeks, trend },
    confidence: reviews.length >= 2 ? 'medium' : 'low',
    basis: reviews.length
      ? `${improvingWeeks} of ${reviews.length} weekly reviews reported a strength gain.`
      : 'Complete weekly reviews to track strength progression.',
  };
}

function estimateDropoutRisk(logs: DailyLog[], reviews: WeeklyReview[]): TwinModel['dropoutRisk'] {
  const triggers: string[] = [];
  // Logging momentum: last 7 days vs the 7 before.
  const recent = countActive(logs, 0, 7);
  const prior = countActive(logs, 7, 14);
  let score = 20;
  if (prior > 0 && recent < prior) {
    score += Math.min(40, ((prior - recent) / prior) * 60);
    triggers.push('Your logging has slowed compared with last week.');
  }
  if (recent <= 1 && logs.length >= 3) {
    score += 25;
    triggers.push('Very little activity logged in the past week.');
  }
  const latest = reviews[reviews.length - 1];
  if (latest) {
    if (latest.satisfaction <= 2) {
      score += 20;
      triggers.push('Low satisfaction in your last weekly review.');
    }
    if (latest.mealDifficulty >= 4) {
      score += 10;
      triggers.push('Meals have been hard to follow.');
    }
    if (latest.workoutsPlanned > 0 && latest.workoutsCompleted / latest.workoutsPlanned < 0.4) {
      score += 10;
      triggers.push('Workout completion dropped last week.');
    }
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: 'low' | 'moderate' | 'high' = score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low';
  if (triggers.length === 0) triggers.push('No dropout signals right now — momentum looks healthy.');
  return {
    value: { score, level, triggers },
    confidence: logs.length >= 10 ? 'medium' : 'low',
    basis: 'Combines your recent logging momentum with weekly-review satisfaction and completion.',
  };
}

function estimateCalorieResponse(
  adjustments: Adjustment[],
  weights: { date: string; w: number }[],
): TwinModel['calorieResponse'] {
  const calAdjust = adjustments.filter((a) => a.calorieDelta !== 0);
  if (calAdjust.length === 0 || weights.length < 4) {
    return {
      value: { sensitivity: 'unknown' },
      confidence: 'low',
      basis: 'Once your calories have been adjusted and you keep logging weight, I can learn how strongly you respond.',
    };
  }
  // Compare weight slope before vs after the most recent calorie change.
  const last = calAdjust[calAdjust.length - 1];
  const before = weights.filter((w) => w.date < last.createdAt.slice(0, 10));
  const after = weights.filter((w) => w.date >= last.createdAt.slice(0, 10));
  const slope = (arr: { date: string; w: number }[]) => {
    if (arr.length < 2) return null;
    const span = daysBetween(arr[0].date, arr[arr.length - 1].date) || 1;
    return (arr[arr.length - 1].w - arr[0].w) / span;
  };
  const s1 = slope(before);
  const s2 = slope(after);
  let sensitivity: 'low' | 'normal' | 'high' | 'unknown' = 'unknown';
  if (s1 !== null && s2 !== null) {
    const change = Math.abs(s2 - s1);
    sensitivity = change > 0.03 ? 'high' : change > 0.01 ? 'normal' : 'low';
  }
  return {
    value: { sensitivity },
    confidence: after.length >= 4 ? 'medium' : 'low',
    basis: 'Compares your weight trend before and after the most recent calorie change.',
  };
}

function learnAdherenceDrivers(logs: DailyLog[], profile: OnboardingProfile | null): string[] {
  const drivers: string[] = [];
  if (logs.length < 7) return drivers;

  // Workout completion on higher- vs lower-energy days.
  const withEnergy = logs.filter((l) => typeof l.energy === 'number');
  const hi = withEnergy.filter((l) => (l.energy ?? 0) >= 4);
  const lo = withEnergy.filter((l) => (l.energy ?? 0) <= 2);
  const rate = (arr: DailyLog[]) => (arr.length ? arr.filter((l) => l.workoutCompleted).length / arr.length : null);
  const rHi = rate(hi);
  const rLo = rate(lo);
  if (rHi !== null && rLo !== null && hi.length >= 2 && lo.length >= 2 && rHi - rLo >= 0.3) {
    drivers.push('You train far more consistently on higher-energy days — protecting sleep pays off.');
  }

  // Protein on days meals were logged.
  const loggedDays = logs.filter((l) => (l.mealsLogged?.length ?? 0) > 0);
  if (loggedDays.length >= 4 && profile) {
    const target = profile.currentWeightKg * proteinPerKg(profile);
    const hitProtein = loggedDays.filter((l) => (l.proteinG ?? 0) >= target * 0.8).length;
    if (hitProtein / loggedDays.length >= 0.6) {
      drivers.push('When you log your meals, you usually hit your protein target — logging drives the result.');
    }
  }

  if (profile?.cookingTimeMin && profile.cookingTimeMin <= 15) {
    drivers.push('You chose quick meals — short prep time keeps your nutrition adherence high.');
  }
  return drivers;
}

function countActive(logs: DailyLog[], startDaysAgo: number, endDaysAgo: number): number {
  const today = new Date();
  const set = new Set<string>();
  for (let i = startDaysAgo; i < endDaysAgo; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    set.add(d.toISOString().slice(0, 10));
  }
  return logs.filter(
    (l) =>
      set.has(l.date) &&
      (l.workoutCompleted || (l.mealsLogged?.length ?? 0) > 0 || typeof l.weightKg === 'number'),
  ).length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// --- Explainable adjustment ---------------------------------------------------

// Produces a plain-language, cross-signal recommendation. Uses rolling weight
// averages over >=2 weeks plus energy/training-performance context — exactly the
// kind of explainable output the spec calls for.
export function recommendTwinAdjustment(inp: TwinInputs): TwinAdjustment {
  const { profile, plan } = inp;
  const logs = Object.values(inp.logs).sort((a, b) => a.date.localeCompare(b.date));
  const weights = logs.filter((l) => typeof l.weightKg === 'number').map((l) => ({ date: l.date, w: l.weightKg! }));

  if (!profile || !plan || weights.length < 6) {
    return {
      calorieDelta: 0,
      explanation:
        'Keep logging your weight, energy, and workouts for about two weeks. Once I can see a stable trend, I\'ll recommend an explainable calorie adjustment tailored to how your body is actually responding.',
      factors: ['Not enough data for a confident recommendation yet.'],
      confidence: 'low',
    };
  }

  const span = daysBetween(weights[0].date, weights[weights.length - 1].date) || 1;
  const window = Math.min(4, Math.floor(weights.length / 2));
  const { firstAvg, lastAvg } = edgeAverages(weights, window);
  const perWeek = firstAvg !== null && lastAvg !== null ? ((lastAvg - firstAvg) / span) * 7 : 0;

  // Expected safe weekly change (~0.5% bodyweight), signed by goal.
  // Recomposition holds weight roughly stable (gentle downward drift).
  const goalSign = profile.goal === 'muscle_gain' ? 1 : profile.goal === 'body_recomposition' ? -0.4 : -1;
  const expected = 0.005 * profile.currentWeightKg * goalSign;

  const recentLogs = logs.slice(-10);
  const avgEnergy = mean(recentLogs.filter((l) => typeof l.energy === 'number').map((l) => l.energy!));
  const latestReview = inp.reviews[inp.reviews.length - 1];
  const trainingDeclining =
    latestReview && latestReview.workoutsPlanned > 0
      ? latestReview.workoutsCompleted / latestReview.workoutsPlanned < 0.5
      : false;
  const lowEnergy = avgEnergy !== null && avgEnergy <= 2.5;

  const factors: string[] = [];
  let calorieDelta = 0;

  if (profile.goal !== 'muscle_gain') {
    if (perWeek < expected * 1.6) {
      // Losing faster than the safe range.
      calorieDelta = 120;
      factors.push(`Weight fell ~${Math.abs(round1(perWeek))} kg/week, faster than your ~${Math.abs(round1(expected))} kg target.`);
      if (lowEnergy) factors.push('Your recent energy has been low.');
      if (trainingDeclining) factors.push('Training performance dipped last week.');
    } else if (perWeek > expected * 0.4) {
      // Barely losing.
      calorieDelta = -100;
      factors.push('Weight loss has stalled relative to your target.');
    }
  } else {
    if (perWeek > expected * 1.6) {
      calorieDelta = -100;
      factors.push('You\'re gaining faster than needed, which adds fat.');
    } else if (perWeek < expected * 0.4) {
      calorieDelta = 120;
      factors.push('Gains have stalled — a small surplus will help.');
      if (lowEnergy) factors.push('Low energy suggests you can use the extra fuel.');
    }
  }

  const explanation = buildExplanation(calorieDelta, perWeek, expected, lowEnergy, trainingDeclining, profile.goal);
  const confidence: Confidence = span >= 21 && weights.length >= 10 ? 'high' : span >= 14 ? 'medium' : 'low';

  if (calorieDelta === 0 && factors.length === 0) {
    factors.push('Your trend is within the healthy target range.');
  }
  return { calorieDelta, explanation, factors, confidence };
}

function buildExplanation(
  delta: number,
  perWeek: number,
  expected: number,
  lowEnergy: boolean,
  trainingDeclining: boolean,
  goal: OnboardingProfile['goal'],
): string {
  if (delta === 0) {
    return `Your average weight is moving at about ${round1(perWeek)} kg/week, which is within the healthy target range for your ${goal.replace('_', ' ')} goal. No change needed — keep doing what you\'re doing.`;
  }
  const dir = delta > 0 ? 'increased' : 'decreased';
  const parts: string[] = [];
  parts.push(
    `Your average weight ${perWeek < 0 ? 'decreased' : 'increased'} faster than the target range over the last two weeks`,
  );
  if (lowEnergy && trainingDeclining) parts.push('while your energy and training performance declined');
  else if (lowEnergy) parts.push('while your energy declined');
  else if (trainingDeclining) parts.push('while your training performance declined');
  return `${parts.join(', ')}. Your daily target has been ${dir} by ${Math.abs(delta)} kcal to keep progress sustainable.`;
}
