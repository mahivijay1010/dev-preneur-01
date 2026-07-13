// Milestones — derived purely from logged data so they can never be "faked" and
// always reflect real behaviour. Progress hints show how close the user is.

import type {
  DailyLog,
  Measurement,
  Milestone,
  OnboardingProfile,
  WeeklyReview,
} from '../types';

export interface MilestoneInputs {
  logs: Record<string, DailyLog>;
  measurements: Record<string, Measurement>;
  reviews: WeeklyReview[];
  repairsCompleted: number;
  profile: OnboardingProfile | null;
}

// Longest run of consecutive calendar days with any log entry.
function longestLoggingStreak(logs: DailyLog[]): number {
  const days = logs
    .filter((l) => l.workoutCompleted || (l.mealsLogged?.length ?? 0) > 0 || typeof l.weightKg === 'number')
    .map((l) => l.date)
    .sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const [y, m, dd] = d.split('-').map(Number);
    const t = new Date(y, m - 1, dd).getTime();
    if (prev !== null && t - prev === 86400000) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export function computeMilestones(inp: MilestoneInputs): Milestone[] {
  const logs = Object.values(inp.logs);
  const workoutsDone = logs.filter((l) => l.workoutCompleted).length;
  const streak = longestLoggingStreak(logs);

  const strengthUp = inp.reviews.some((r) => r.strengthImproved);

  // Waist reduction from earliest to latest recorded measurement.
  const waists = Object.values(inp.measurements)
    .filter((m) => typeof m.waistCm === 'number')
    .sort((a, b) => a.date.localeCompare(b.date));
  const waistReduced =
    waists.length >= 2 && waists[waists.length - 1].waistCm! < waists[0].waistCm!;

  // Improved sleep: any two weekly reviews trending up in sleep rating.
  const sleepReviews = inp.reviews.filter((r) => typeof r.sleep === 'number');
  const sleepImproved =
    sleepReviews.length >= 2 &&
    sleepReviews[sleepReviews.length - 1].sleep > sleepReviews[0].sleep;

  return [
    {
      id: 'first_5_workouts',
      title: 'First 5 workouts',
      description: 'Complete your first five workouts.',
      icon: '🏅',
      achieved: workoutsDone >= 5,
      achievedHint: `${Math.min(workoutsDone, 5)}/5`,
    },
    {
      id: 'first_month',
      title: 'First month consistent',
      description: 'Log something for 28 days in a row.',
      icon: '📅',
      achieved: streak >= 28,
      achievedHint: `${Math.min(streak, 28)}/28 day streak`,
    },
    {
      id: 'strength_increase',
      title: 'First strength increase',
      description: 'Report a strength improvement in a weekly review.',
      icon: '💪',
      achieved: strengthUp,
    },
    {
      id: 'waist_reduction',
      title: 'Waist reduction',
      description: 'Record a smaller waist than when you started.',
      icon: '📏',
      achieved: waistReduced,
    },
    {
      id: 'improved_sleep',
      title: 'Improved sleep',
      description: 'Show better sleep across weekly reviews.',
      icon: '😴',
      achieved: sleepImproved,
    },
    {
      id: 'first_repair',
      title: 'First repaired day',
      description: 'Turn a setback around with Plan Repair.',
      icon: '🛠️',
      achieved: inp.repairsCompleted >= 1,
      achievedHint: inp.repairsCompleted > 0 ? `${inp.repairsCompleted} repaired` : undefined,
    },
  ];
}
