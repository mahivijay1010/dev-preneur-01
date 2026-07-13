// Plan Repair — the primary Phase 2 differentiator. Instead of showing a user
// they "failed", we repair the day around whatever got in the way. Deterministic
// and safe; AI is only used later to soften the wording.

import { exercisesFor, type ExerciseTemplate } from '../data/exercises';
import { foodsFor } from '../data/foods';
import { currentWeekday, WEEKDAY_LABEL } from './week';
import type {
  OnboardingProfile,
  Plan,
  RepairResult,
  RepairSituation,
  WorkoutDay,
  WorkoutExercise,
} from '../types';

export const SITUATIONS: { key: RepairSituation; label: string; icon: string }[] = [
  { key: 'missed_workout', label: 'Missed workout', icon: '🏋️' },
  { key: 'ate_too_much', label: 'Ate too much', icon: '🍕' },
  { key: 'travelling', label: 'Travelling today', icon: '✈️' },
  { key: 'no_gym', label: 'No gym access', icon: '🚫' },
  { key: 'only_15_min', label: 'Only 15 minutes', icon: '⏱️' },
  { key: 'feeling_tired', label: 'Feeling tired', icon: '😴' },
  { key: 'restaurant_meal', label: 'Restaurant meal', icon: '🍽️' },
  { key: 'no_planned_food', label: 'No planned food', icon: '🥫' },
];

function toExercise(t: ExerciseTemplate, overrides?: Partial<WorkoutExercise>): WorkoutExercise {
  return {
    exerciseId: t.id,
    name: t.name,
    sets: t.defaultSets,
    reps: t.defaultReps,
    restSec: t.restSec,
    beginnerAlternative: t.beginnerAlternative,
    instructions: t.instructions,
    ...overrides,
  };
}

// A short, equipment-free session used for repairs (home / travel / tired / 15-min).
function quickHomeSession(
  profile: OnboardingProfile,
  minutes: number,
): WorkoutExercise[] {
  const pool = exercisesFor('home', ['none']);
  const byFocus = (f: ExerciseTemplate['focus']) => pool.filter((e) => e.focus === f);
  const order: ExerciseTemplate['focus'][] = ['legs', 'push', 'core', 'cardio'];
  const picks: ExerciseTemplate[] = [];
  for (const f of order) {
    const list = byFocus(f);
    if (list.length) picks.push(list[0]);
  }
  // Roughly one exercise per ~4 minutes as a circuit.
  const count = Math.max(2, Math.min(picks.length, Math.round(minutes / 4)));
  const reduced = minutes <= 15;
  return picks.slice(0, count).map((t) =>
    toExercise(t, {
      sets: reduced ? 2 : 3,
      restSec: reduced ? 30 : t.restSec,
    }),
  );
}

function replacementWorkout(
  profile: OnboardingProfile,
  focus: string,
  minutes: number,
): WorkoutDay {
  return {
    day: currentWeekday(),
    focus,
    isRest: false,
    exercises: quickHomeSession(profile, minutes),
  };
}

// Weekly target stays "safe" if there are still enough remaining planned days
// this week to hit at least most of the plan.
function weeklyTargetSafe(plan: Plan): boolean {
  const today = currentWeekday();
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const idx = order.indexOf(today);
  const remaining = plan.workouts.filter(
    (w) => !w.isRest && order.indexOf(w.day) > idx,
  ).length;
  const planned = plan.workouts.filter((w) => !w.isRest).length;
  // Safe if at least half the week's sessions are still ahead of us.
  return remaining >= Math.floor(planned / 2);
}

export function repairDay(
  situation: RepairSituation,
  plan: Plan,
  profile: OnboardingProfile,
): RepairResult {
  const base = {
    situation,
    createdAt: new Date().toISOString(),
    weeklyTargetSafe: weeklyTargetSafe(plan),
  };
  const dayLabel = WEEKDAY_LABEL[currentWeekday()];

  switch (situation) {
    case 'missed_workout': {
      const w = replacementWorkout(profile, 'Repair: 16-min home session', 16);
      return {
        ...base,
        title: 'No problem — we’ll make it up',
        message:
          'You missed the gym. Complete this 16-minute home workout instead. Your weekly workout target remains achievable.',
        workout: w,
        guidance: [
          'Do the circuit below with minimal rest.',
          'If short on time, one round still counts.',
        ],
      };
    }
    case 'only_15_min': {
      const w = replacementWorkout(profile, 'Repair: 15-min express circuit', 15);
      return {
        ...base,
        title: '15 minutes is enough',
        message: 'A focused 15-minute circuit keeps your streak and momentum alive.',
        workout: w,
        guidance: ['Move steadily, keep rest under 30s.', 'Quality reps over speed.'],
      };
    }
    case 'no_gym':
    case 'travelling': {
      const w = replacementWorkout(profile, 'Repair: equipment-free session', 20);
      return {
        ...base,
        title: situation === 'travelling' ? 'Travel-friendly plan' : 'No gym, no problem',
        message:
          'Here’s a bodyweight session you can do anywhere — no equipment needed.',
        workout: w,
        guidance: [
          'Find any 2x2 metre space.',
          'Hydrate well, especially when travelling.',
          'Keep meals close to your normal protein target.',
        ],
      };
    }
    case 'feeling_tired': {
      const w = replacementWorkout(profile, 'Repair: light recovery flow', 12);
      return {
        ...base,
        title: 'Listen to your body',
        message:
          'Low energy is a signal, not a failure. Do this short, gentle session — or take a genuine rest day.',
        workout: w,
        guidance: [
          'Reduce intensity; stop if you feel unwell.',
          'Prioritise sleep and protein today.',
          'A rest day now can improve the rest of your week.',
        ],
      };
    }
    case 'ate_too_much': {
      return {
        ...base,
        title: 'One meal won’t undo your progress',
        message:
          'A single high day barely moves your weekly average. No need to skip meals or over-exercise to compensate.',
        guidance: [
          'Return to your normal plan at the next meal.',
          'Get a short walk in and drink water.',
          'Do NOT slash calories tomorrow — consistency wins.',
        ],
      };
    }
    case 'restaurant_meal': {
      return {
        ...base,
        title: 'Eating out — here’s how to steer it',
        message:
          'You can stay on track at a restaurant with a few simple choices.',
        guidance: [
          'Lead with a protein (grilled meat, fish, tofu, paneer, legumes).',
          'Add vegetables or a salad; go easy on fried sides and sugary drinks.',
          'Portion: aim for a palm of protein, a fist of carbs, a thumb of fats.',
          'Enjoy it — one meal is part of a sustainable plan.',
        ],
      };
    }
    case 'no_planned_food': {
      const swaps = plan.meals[0]?.items.slice(0, 2).map((it) => {
        const pool = foodsFor(profile.dietType, it.slot, profile.allergies);
        const alt = pool.find((f) => f.name !== it.name) ?? pool[0];
        return { slot: it.slot, from: it.name, to: alt ? alt.name : it.name };
      });
      return {
        ...base,
        title: 'Work with what you have',
        message:
          'No planned ingredients? Hit your protein and calories with simple swaps.',
        mealSwaps: swaps,
        guidance: [
          'Prioritise a protein source you already have (eggs, yogurt, canned fish/beans, tofu).',
          'Add any vegetable and a carb (rice, oats, bread, potato).',
          'Match roughly the calories of the planned meal — exactness isn’t required.',
        ],
      };
    }
    default:
      return {
        ...base,
        title: 'Day repaired',
        message: `We adjusted ${dayLabel} to keep you on track.`,
        guidance: ['Return to your normal plan tomorrow.'],
      };
  }
}
