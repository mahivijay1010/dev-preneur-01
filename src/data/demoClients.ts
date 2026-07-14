// Demo client roster for the B2B coach dashboard. In production this comes from
// the coach's real client base via the backend; here it's seeded data so gyms,
// trainers, and corporate-wellness buyers can see the dashboard concept.

import type { CoachClient } from '../types';

export const DEMO_CLIENTS: CoachClient[] = [
  { id: 'c1', name: 'Priya S.', goal: 'weight_loss', adherence: 88, weeklyWorkouts: '4/4', weightTrendKg: -1.4, lastActiveDays: 0 },
  { id: 'c2', name: 'Daniel O.', goal: 'muscle_gain', adherence: 72, weeklyWorkouts: '3/4', weightTrendKg: 0.8, lastActiveDays: 1 },
  { id: 'c3', name: 'Aisha K.', goal: 'weight_loss', adherence: 45, weeklyWorkouts: '1/3', weightTrendKg: -0.2, lastActiveDays: 5, safetyFlag: 'Reported knee pain' },
  { id: 'c4', name: 'Tom R.', goal: 'muscle_gain', adherence: 91, weeklyWorkouts: '5/5', weightTrendKg: 1.1, lastActiveDays: 0 },
  { id: 'c5', name: 'Meera J.', goal: 'weight_loss', adherence: 30, weeklyWorkouts: '0/3', weightTrendKg: 0.3, lastActiveDays: 9, safetyFlag: 'Inactive 9 days' },
  { id: 'c6', name: 'Leo F.', goal: 'weight_loss', adherence: 64, weeklyWorkouts: '2/4', weightTrendKg: -0.9, lastActiveDays: 2 },
];

export interface RosterSummary {
  total: number;
  avgAdherence: number;
  atRisk: number; // adherence < 50 or inactive >= 5 days
  safetyAlerts: number;
}

export function summarizeRoster(clients: CoachClient[]): RosterSummary {
  const total = clients.length;
  const avgAdherence = total
    ? Math.round(clients.reduce((a, c) => a + c.adherence, 0) / total)
    : 0;
  const atRisk = clients.filter((c) => c.adherence < 50 || c.lastActiveDays >= 5).length;
  const safetyAlerts = clients.filter((c) => c.safetyFlag).length;
  return { total, avgAdherence, atRisk, safetyAlerts };
}
