// Expert-curated exercise library. Each entry is a template the plan engine
// composes into a weekly schedule. Admin can add/edit these in-app.

import type { Equipment, WorkoutLocation } from '../types';

export interface ExerciseTemplate {
  id: string;
  name: string;
  focus: 'push' | 'pull' | 'legs' | 'core' | 'full' | 'cardio';
  equipment: Equipment; // minimum equipment needed
  locations: WorkoutLocation[];
  instructions: string;
  beginnerAlternative: string;
  defaultSets: number;
  defaultReps: string;
  restSec: number;
}

export const EXERCISES: ExerciseTemplate[] = [
  {
    id: 'ex_squat',
    name: 'Bodyweight Squat',
    focus: 'legs',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'Stand shoulder-width apart. Sit hips back and down until thighs are parallel, chest up, knees tracking over toes. Drive through heels to stand.',
    beginnerAlternative: 'Box squat to a chair, standing up each rep.',
    defaultSets: 3,
    defaultReps: '10-15',
    restSec: 60,
  },
  {
    id: 'ex_goblet_squat',
    name: 'Goblet Squat',
    focus: 'legs',
    equipment: 'dumbbells',
    locations: ['home', 'gym'],
    instructions:
      'Hold a dumbbell/kettlebell at your chest. Squat down keeping elbows inside knees, torso upright. Stand back up.',
    beginnerAlternative: 'Bodyweight squat, no load.',
    defaultSets: 3,
    defaultReps: '8-12',
    restSec: 75,
  },
  {
    id: 'ex_pushup',
    name: 'Push-up',
    focus: 'push',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'Hands slightly wider than shoulders, body in a straight line. Lower until chest is just above the floor, then press up.',
    beginnerAlternative: 'Push-up from knees or hands elevated on a bench.',
    defaultSets: 3,
    defaultReps: '8-12',
    restSec: 60,
  },
  {
    id: 'ex_db_press',
    name: 'Dumbbell Shoulder Press',
    focus: 'push',
    equipment: 'dumbbells',
    locations: ['home', 'gym'],
    instructions:
      'Seated or standing, press dumbbells from shoulder height overhead until arms are straight, then lower under control.',
    beginnerAlternative: 'Use lighter dumbbells or water bottles; reduce range.',
    defaultSets: 3,
    defaultReps: '8-12',
    restSec: 75,
  },
  {
    id: 'ex_row',
    name: 'Dumbbell Row',
    focus: 'pull',
    equipment: 'dumbbells',
    locations: ['home', 'gym'],
    instructions:
      'Hinge at hips with a flat back, one hand supported. Pull the dumbbell to your hip, squeezing the shoulder blade, then lower.',
    beginnerAlternative: 'Resistance-band row anchored to a door.',
    defaultSets: 3,
    defaultReps: '8-12',
    restSec: 75,
  },
  {
    id: 'ex_band_row',
    name: 'Resistance-Band Row',
    focus: 'pull',
    equipment: 'resistance_bands',
    locations: ['home', 'outdoor'],
    instructions:
      'Anchor the band at chest height. Step back for tension and pull the handles to your ribs, squeezing shoulder blades together.',
    beginnerAlternative: 'Use a lighter band or stand closer to the anchor.',
    defaultSets: 3,
    defaultReps: '12-15',
    restSec: 60,
  },
  {
    id: 'ex_lunge',
    name: 'Reverse Lunge',
    focus: 'legs',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'Step one foot back and lower until both knees are ~90°. Push through the front heel to return. Alternate legs.',
    beginnerAlternative: 'Hold a wall for balance and reduce depth.',
    defaultSets: 3,
    defaultReps: '8-10 each',
    restSec: 60,
  },
  {
    id: 'ex_plank',
    name: 'Plank',
    focus: 'core',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'Forearms and toes on the floor, body in a straight line, brace your abs and glutes. Hold without letting hips sag.',
    beginnerAlternative: 'Plank from the knees.',
    defaultSets: 3,
    defaultReps: '20-40s',
    restSec: 45,
  },
  {
    id: 'ex_hip_hinge',
    name: 'Dumbbell Romanian Deadlift',
    focus: 'legs',
    equipment: 'dumbbells',
    locations: ['home', 'gym'],
    instructions:
      'Soft knees, push hips back and lower the weights along your legs with a flat back. Feel the hamstrings, then drive hips forward to stand.',
    beginnerAlternative: 'Bodyweight hip hinge to a target behind you.',
    defaultSets: 3,
    defaultReps: '10-12',
    restSec: 75,
  },
  {
    id: 'ex_glute_bridge',
    name: 'Glute Bridge',
    focus: 'legs',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'Lie on your back, knees bent, feet flat. Drive hips up until shoulders-hips-knees form a line, squeeze glutes, lower slowly.',
    beginnerAlternative: 'Reduce range and pause at the top.',
    defaultSets: 3,
    defaultReps: '12-15',
    restSec: 45,
  },
  {
    id: 'ex_mountain_climber',
    name: 'Mountain Climbers',
    focus: 'cardio',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'From a push-up position, drive knees toward the chest one at a time at a steady pace, keeping hips low.',
    beginnerAlternative: 'Slow marching from a plank, one knee at a time.',
    defaultSets: 3,
    defaultReps: '30s',
    restSec: 45,
  },
  {
    id: 'ex_brisk_walk',
    name: 'Brisk Walk / Light Cardio',
    focus: 'cardio',
    equipment: 'none',
    locations: ['home', 'gym', 'outdoor'],
    instructions:
      'Keep a pace where talking is possible but slightly effortful. Great for active-recovery days.',
    beginnerAlternative: 'Shorten the duration and reduce pace.',
    defaultSets: 1,
    defaultReps: '20-30 min',
    restSec: 0,
  },
];

export function exercisesFor(
  location: WorkoutLocation,
  owned: Equipment[],
): ExerciseTemplate[] {
  const has = new Set<Equipment>([...owned, 'none']);
  // full_gym owners can use everything.
  const fullGym = owned.includes('full_gym') || location === 'gym';
  return EXERCISES.filter(
    (e) =>
      e.locations.includes(location) &&
      (fullGym || has.has(e.equipment)),
  );
}
