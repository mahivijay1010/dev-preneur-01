// Composes deterministic nutrition + expert templates into a full 7-day plan.
// AI (Claude) is applied later, only to personalize wording — never the numbers.

import { exercisesFor, type ExerciseTemplate } from '../data/exercises';
import { foodsFor } from '../data/foods';
import type {
  DayMeals,
  MealItem,
  OnboardingProfile,
  Plan,
  Weekday,
  WorkoutDay,
  WorkoutExercise,
} from '../types';
import { computeMacros, nutritionGuidelines } from './nutrition';

const ALL_DAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Deterministic pseudo-random pick so the same profile yields the same plan.
function pick<T>(arr: T[], seed: number): T {
  if (arr.length === 0) throw new Error('empty pool');
  return arr[seed % arr.length];
}

function buildMeals(p: OnboardingProfile): DayMeals[] {
  const slots: MealItem['slot'][] = ['breakfast', 'lunch', 'dinner', 'snack'];
  return ALL_DAYS.map((day, di) => {
    const items: MealItem[] = slots.map((slot, si) => {
      const pool = foodsFor(p.dietType, slot, p.allergies);
      // Fallback to omnivore breakfast if a diet/allergy combo empties a slot.
      const source =
        pool.length > 0 ? pool : foodsFor('omnivore', slot, []);
      const food = pick(source, di * 3 + si);
      return {
        slot,
        name: food.name,
        calories: food.calories,
        proteinG: food.proteinG,
      };
    });
    return { day, items };
  });
}

function makeWorkoutExercise(t: ExerciseTemplate): WorkoutExercise {
  return {
    exerciseId: t.id,
    name: t.name,
    sets: t.defaultSets,
    reps: t.defaultReps,
    restSec: t.restSec,
    beginnerAlternative: t.beginnerAlternative,
    instructions: t.instructions,
  };
}

function buildWorkouts(p: OnboardingProfile): WorkoutDay[] {
  const pool = exercisesFor(p.location, p.equipment);
  const byFocus = (f: ExerciseTemplate['focus']) =>
    pool.filter((e) => e.focus === f);

  // Simple full-body split for beginners; a light push/pull/legs feel via rotation.
  const training = new Set(p.workoutDays);

  return ALL_DAYS.map((day, i): WorkoutDay => {
    if (!training.has(day)) {
      const cardio = byFocus('cardio');
      return {
        day,
        focus: 'Rest / Active Recovery',
        isRest: true,
        exercises: cardio.length
          ? [makeWorkoutExercise(pick(cardio, i))]
          : [],
      };
    }

    // Assemble a balanced full-body session from available pools.
    const chosen: ExerciseTemplate[] = [];
    const addFrom = (f: ExerciseTemplate['focus']) => {
      const list = byFocus(f);
      if (list.length) chosen.push(pick(list, i + f.length));
    };
    addFrom('legs');
    addFrom('push');
    addFrom('pull');
    addFrom('core');
    if (p.goal === 'weight_loss') addFrom('cardio');

    // De-duplicate by id while preserving order.
    const seen = new Set<string>();
    const exercises = chosen
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .map(makeWorkoutExercise);

    return {
      day,
      focus: p.goal === 'weight_loss' ? 'Full Body + Cardio' : 'Full Body Strength',
      isRest: false,
      exercises,
    };
  });
}

export interface GeneratePlanResult {
  plan: Plan;
}

// Pure, synchronous, deterministic. Personalization is layered on afterwards.
export function generateBasePlan(p: OnboardingProfile, id: string, createdAt: string): Plan {
  const macros = computeMacros(p);
  return {
    id,
    createdAt,
    macros,
    nutritionGuidelines: nutritionGuidelines(p, macros),
    meals: buildMeals(p),
    workouts: buildWorkouts(p),
    personalized: false,
  };
}
