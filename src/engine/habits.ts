// Habit intelligence — detects behaviour patterns from the user's own logs and
// pairs each with a targeted, non-judgemental intervention. Everything is
// derived from real logged data; we only surface a pattern once there's enough
// signal (min sample sizes) so we don't cry wolf on a single day.

import type { DailyLog, HabitInsight, OnboardingProfile, Weekday } from '../types';
import { WEEKDAY_LABEL } from './week';

const ORDER: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function weekdayOf(date: string): Weekday {
  // date is YYYY-MM-DD; parse without timezone drift.
  const [y, m, d] = date.split('-').map(Number);
  return ORDER[new Date(y, m - 1, d).getDay()];
}

export function detectHabits(
  logsMap: Record<string, DailyLog>,
  profile: OnboardingProfile | null,
): HabitInsight[] {
  const logs = Object.values(logsMap);
  const insights: HabitInsight[] = [];
  if (logs.length < 5) return insights; // not enough history yet

  // --- Pattern: consistently skips a particular weekday's workout ---
  if (profile) {
    const planned = new Set(profile.workoutDays);
    const byDay: Record<string, { planned: number; done: number }> = {};
    for (const l of logs) {
      const wd = weekdayOf(l.date);
      if (!planned.has(wd)) continue;
      byDay[wd] = byDay[wd] ?? { planned: 0, done: 0 };
      byDay[wd].planned += 1;
      if (l.workoutCompleted) byDay[wd].done += 1;
    }
    for (const [wd, stat] of Object.entries(byDay)) {
      if (stat.planned >= 2 && stat.done / stat.planned <= 0.34) {
        insights.push({
          id: `skip_${wd}`,
          severity: 'suggestion',
          pattern: `You complete very few of your ${WEEKDAY_LABEL[wd as Weekday]} workouts.`,
          intervention: `We'll make ${WEEKDAY_LABEL[wd as Weekday]} a shorter, easier session — or you can move it to a day that works better.`,
        });
      }
    }
  }

  // --- Pattern: stops logging on weekends ---
  const weekdayLogs = logs.filter((l) => {
    const wd = weekdayOf(l.date);
    return wd !== 'sat' && wd !== 'sun';
  });
  const weekendLogs = logs.filter((l) => {
    const wd = weekdayOf(l.date);
    return wd === 'sat' || wd === 'sun';
  });
  const weekdayActive = weekdayLogs.filter((l) => hasAnyEntry(l)).length;
  const weekendActive = weekendLogs.filter((l) => hasAnyEntry(l)).length;
  if (weekdayLogs.length >= 4 && weekendLogs.length >= 2) {
    const weekdayRate = weekdayActive / weekdayLogs.length;
    const weekendRate = weekendActive / weekendLogs.length;
    if (weekdayRate - weekendRate >= 0.4) {
      insights.push({
        id: 'weekend_dropoff',
        severity: 'info',
        pattern: 'Your logging drops off on weekends.',
        intervention: 'Weekends count too — we\'ll send a lighter Saturday check-in so it stays effortless.',
      });
    }
  }

  // --- Pattern: frequently misses protein target ---
  const proteinDays = logs.filter((l) => typeof l.proteinG === 'number');
  if (proteinDays.length >= 5) {
    const lowDays = proteinDays.filter((l) => (l.proteinG ?? 0) < proteinTarget(profile));
    if (lowDays.length / proteinDays.length >= 0.5) {
      insights.push({
        id: 'protein_low',
        severity: 'suggestion',
        pattern: 'You often finish the day below your protein target.',
        intervention: 'We\'ll front-load protein at breakfast and suggest a high-protein snack to close the gap.',
      });
    }
  }

  // --- Pattern: low sleep tends to precede low-energy days ---
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  let poorSleepThenLowEnergy = 0;
  let poorSleepCount = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if ((sorted[i].sleepHours ?? 9) < 6) {
      poorSleepCount += 1;
      if ((sorted[i + 1].energy ?? 5) <= 2) poorSleepThenLowEnergy += 1;
    }
  }
  if (poorSleepCount >= 2 && poorSleepThenLowEnergy / poorSleepCount >= 0.6) {
    insights.push({
      id: 'sleep_energy',
      severity: 'warning',
      pattern: 'Poor sleep is usually followed by a low-energy day for you.',
      intervention: 'After a bad night we\'ll auto-suggest a lighter workout and prioritise recovery.',
    });
  }

  return insights;
}

function hasAnyEntry(l: DailyLog): boolean {
  return (
    typeof l.weightKg === 'number' ||
    typeof l.steps === 'number' ||
    (l.mealsLogged?.length ?? 0) > 0 ||
    l.workoutCompleted === true ||
    typeof l.waterMl === 'number'
  );
}

function proteinTarget(profile: OnboardingProfile | null): number {
  if (!profile) return 100;
  const perKg = profile.goal === 'weight_loss' ? 1.8 : 2.0;
  return profile.currentWeightKg * perKg;
}
