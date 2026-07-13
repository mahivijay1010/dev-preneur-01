// Adherence score — a single 0-100 number from six behaviour components over a
// rolling window. Per the spec it must NOT punish one bad day, so component
// scores use forgiving rules (targets are partial-credit, and the window is
// wide enough that a single miss can't tank the score).

import type {
  AdherenceComponent,
  AdherenceScore,
  DailyLog,
  Measurement,
  OnboardingProfile,
  Plan,
} from '../types';

const WINDOW_DAYS = 14;

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(d);
    dt.setDate(d.getDate() - i);
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeAdherence(
  logsMap: Record<string, DailyLog>,
  measurementsMap: Record<string, Measurement>,
  profile: OnboardingProfile | null,
  plan: Plan | null,
): AdherenceScore {
  const dates = lastNDates(WINDOW_DAYS);
  const logs = dates.map((d) => logsMap[d]).filter(Boolean) as DailyLog[];
  const daysConsidered = logs.length;

  // Expected training days in the window, from the user's chosen weekly days.
  const perWeek = profile?.workoutDays.length ?? 3;
  const expectedWorkouts = Math.max(1, Math.round((perWeek / 7) * WINDOW_DAYS));
  const workoutsDone = logs.filter((l) => l.workoutCompleted).length;
  const workoutScore = clamp((workoutsDone / expectedWorkouts) * 100);

  // Meal consistency: share of days where at least one meal was logged.
  const mealDays = logs.filter((l) => (l.mealsLogged?.length ?? 0) > 0).length;
  const mealScore = clamp((mealDays / WINDOW_DAYS) * 100);

  // Protein: average of daily fractions of target (capped at 100% per day).
  const proteinTarget = plan?.macros.proteinG ?? null;
  const proteinDays = logs.filter((l) => typeof l.proteinG === 'number');
  const proteinScore = proteinTarget && proteinDays.length
    ? clamp(
        (proteinDays.reduce(
          (a, l) => a + Math.min(1, (l.proteinG ?? 0) / proteinTarget),
          0,
        ) /
          proteinDays.length) *
          100,
      )
    : 0;

  // Sleep: 7h+ is full marks; partial credit below.
  const sleepDays = logs.filter((l) => typeof l.sleepHours === 'number');
  const sleepScore = sleepDays.length
    ? clamp(
        (sleepDays.reduce((a, l) => a + Math.min(1, (l.sleepHours ?? 0) / 7), 0) /
          sleepDays.length) *
          100,
      )
    : 0;

  // Weight logging: share of days with a weight entry.
  const weightDays = logs.filter((l) => typeof l.weightKg === 'number').length;
  const weightScore = clamp((weightDays / WINDOW_DAYS) * 100);

  // Recovery: blends energy rating and whether measurements/resting HR tracked.
  const energyDays = logs.filter((l) => typeof l.energy === 'number');
  const energyAvg = energyDays.length
    ? energyDays.reduce((a, l) => a + (l.energy ?? 0), 0) / energyDays.length
    : 0;
  const measured = dates.some((d) => measurementsMap[d]);
  const recoveryScore = clamp((energyAvg / 5) * 90 + (measured ? 10 : 0));

  const components: AdherenceComponent[] = [
    { key: 'workouts', label: 'Workouts', score: workoutScore, weight: 3 },
    { key: 'meals', label: 'Meal logging', score: mealScore, weight: 2 },
    { key: 'protein', label: 'Protein', score: proteinScore, weight: 2 },
    { key: 'sleep', label: 'Sleep', score: sleepScore, weight: 1 },
    { key: 'weight', label: 'Weigh-ins', score: weightScore, weight: 1 },
    { key: 'recovery', label: 'Recovery', score: recoveryScore, weight: 1 },
  ];

  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const score = clamp(
    components.reduce((a, c) => a + c.score * c.weight, 0) / totalWeight,
  );

  const band: AdherenceScore['band'] =
    score >= 80 ? 'excellent' : score >= 55 ? 'solid' : 'building';

  return { score, band, components, daysConsidered };
}
