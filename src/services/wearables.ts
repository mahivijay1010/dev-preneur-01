// Wearables & health-platform integration layer.
//
// Real integrations (Apple Health, Google Health Connect, Fitbit, Garmin, smart
// scales) require native SDKs and OAuth that can't run in this JS/web build, so
// they are exposed through a clean provider interface and marked unavailable
// with an honest note. A "Simulated device" provider generates realistic sample
// data so the whole import → log pipeline is demonstrable end-to-end.
//
// Per the spec, wearable ACTIVE-CALORIE estimates are treated cautiously: we
// import them for display but never feed them directly into calorie targets.

import type { DailyLog, WearableId, WearableProviderInfo } from '../types';

export const WEARABLES: WearableProviderInfo[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: '🍎',
    available: false,
    imports: ['steps', 'sleep', 'workouts', 'heart rate', 'weight', 'active calories'],
    note: 'Requires a native iOS build with HealthKit entitlements.',
  },
  {
    id: 'health_connect',
    name: 'Google Health Connect',
    icon: '🤖',
    available: false,
    imports: ['steps', 'sleep', 'workouts', 'heart rate', 'weight', 'active calories'],
    note: 'Requires a native Android build with Health Connect permissions.',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: '⌚',
    available: false,
    imports: ['steps', 'sleep', 'heart rate', 'active calories'],
    note: 'Requires Fitbit Web API OAuth (server-side).',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: '🧭',
    available: false,
    imports: ['steps', 'sleep', 'workouts', 'heart rate'],
    note: 'Requires Garmin Health API partnership + OAuth.',
  },
  {
    id: 'smart_scale',
    name: 'Smart Scale',
    icon: '⚖️',
    available: false,
    imports: ['weight'],
    note: 'Requires a BLE bridge or the scale vendor’s cloud API.',
  },
  {
    id: 'simulated',
    name: 'Simulated device (demo)',
    icon: '🧪',
    available: true,
    imports: ['steps', 'sleep', 'heart rate', 'weight', 'active calories'],
    note: 'Generates realistic sample data so you can try the import flow now.',
  },
];

export function providerById(id: WearableId): WearableProviderInfo | undefined {
  return WEARABLES.find((w) => w.id === id);
}

export interface ImportedDay {
  date: string;
  steps: number;
  sleepHours: number;
  restingHr: number;
  weightKg: number;
  activeCalories: number; // shown to the user, NOT fed into targets
}

// Deterministic pseudo-random so a given date always yields the same sample.
function seeded(date: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) % 100000;
  return (h % 1000) / 1000; // 0..1
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Simulated sync — produces the last `days` of plausible data around a baseline
// weight. Only used by the demo provider.
export function simulateImport(days: number, baselineWeightKg: number): ImportedDay[] {
  const out: ImportedDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    out.push({
      date,
      steps: 4000 + Math.round(seeded(date, 7) * 8000),
      sleepHours: Math.round((6 + seeded(date, 13) * 2.5) * 10) / 10,
      restingHr: 56 + Math.round(seeded(date, 17) * 14),
      weightKg: Math.round((baselineWeightKg + (seeded(date, 23) - 0.5) * 1.2) * 10) / 10,
      activeCalories: 250 + Math.round(seeded(date, 29) * 500),
    });
  }
  return out;
}

// Merges imported metrics into existing logs without clobbering manual entries:
// manual values win; wearable fills only the gaps.
export function mergeImportIntoLogs(
  logs: Record<string, DailyLog>,
  imported: ImportedDay[],
): Record<string, DailyLog> {
  const next = { ...logs };
  for (const d of imported) {
    const existing = next[d.date] ?? { date: d.date };
    next[d.date] = {
      ...existing,
      steps: existing.steps ?? d.steps,
      sleepHours: existing.sleepHours ?? d.sleepHours,
      weightKg: existing.weightKg ?? d.weightKg,
    };
  }
  return next;
}
