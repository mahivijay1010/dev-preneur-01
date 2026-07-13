// Derives dashboard metrics from the raw daily logs. Pure functions.

import type { DailyLog, OnboardingProfile, Plan } from '../types';

export interface ProgressSummary {
  currentWeight: number | null;
  sevenDayAvg: number | null;
  weightChange: number | null; // vs earliest logged weight
  workoutsCompleted: number; // this week
  proteinAdherencePct: number | null; // avg of days that logged protein
  weeklyConsistencyPct: number; // days with any log in last 7
  goalProgressPct: number | null; // toward target weight
}

function sortedByDate(logs: DailyLog[]): DailyLog[] {
  return [...logs].sort((a, b) => a.date.localeCompare(b.date));
}

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

export function summarize(
  logsMap: Record<string, DailyLog>,
  profile: OnboardingProfile | null,
  plan: Plan | null,
): ProgressSummary {
  const logs = sortedByDate(Object.values(logsMap));
  const weights = logs.filter((l) => typeof l.weightKg === 'number');

  const currentWeight = weights.length
    ? weights[weights.length - 1].weightKg!
    : null;

  const last7Weights = weights.slice(-7).map((l) => l.weightKg!);
  const sevenDayAvg = last7Weights.length
    ? round1(last7Weights.reduce((a, b) => a + b, 0) / last7Weights.length)
    : null;

  const startWeight = profile?.currentWeightKg ?? weights[0]?.weightKg ?? null;
  const weightChange =
    currentWeight !== null && startWeight !== null
      ? round1(currentWeight - startWeight)
      : null;

  const week = new Set(lastNDates(7));
  const weekLogs = logs.filter((l) => week.has(l.date));

  const workoutsCompleted = weekLogs.filter((l) => l.workoutCompleted).length;

  const proteinDays = weekLogs.filter((l) => typeof l.proteinG === 'number');
  const target = plan?.macros.proteinG ?? null;
  const proteinAdherencePct =
    proteinDays.length && target
      ? Math.round(
          (proteinDays.reduce(
            (acc, l) => acc + Math.min(1, (l.proteinG ?? 0) / target),
            0,
          ) /
            proteinDays.length) *
            100,
        )
      : null;

  const weeklyConsistencyPct = Math.round((weekLogs.length / 7) * 100);

  let goalProgressPct: number | null = null;
  if (profile && currentWeight !== null) {
    const total = profile.currentWeightKg - profile.targetWeightKg;
    const done = profile.currentWeightKg - currentWeight;
    if (Math.abs(total) > 0.01) {
      goalProgressPct = clamp(Math.round((done / total) * 100), 0, 100);
    }
  }

  return {
    currentWeight,
    sevenDayAvg,
    weightChange,
    workoutsCompleted,
    proteinAdherencePct,
    weeklyConsistencyPct,
    goalProgressPct,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
