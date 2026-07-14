// Expert form cues for the six supported exercises. Used as the offline
// fallback for form assistance and as always-visible coaching alongside any
// AI photo feedback.

import type { FormExercise } from '../types';

export interface FormGuide {
  exercise: FormExercise;
  label: string;
  tempo: string; // e.g. "2s down, 1s up"
  cues: string[];
  warnings: string[];
}

export const FORM_GUIDES: Record<FormExercise, FormGuide> = {
  squat: {
    exercise: 'squat',
    label: 'Squat',
    tempo: '2s down · 1s up',
    cues: [
      'Feet shoulder-width, toes slightly out.',
      'Sit hips back and down, chest tall.',
      'Knees track over toes — don’t cave inward.',
      'Depth: thighs at least parallel if comfortable.',
    ],
    warnings: ['Heels lifting off the floor.', 'Lower back rounding at the bottom.'],
  },
  pushup: {
    exercise: 'pushup',
    label: 'Push-up',
    tempo: '2s down · 1s up',
    cues: [
      'Hands slightly wider than shoulders.',
      'Body in one straight line, brace your core.',
      'Lower until chest is just above the floor.',
      'Elbows at ~45°, not flared to 90°.',
    ],
    warnings: ['Hips sagging or piking up.', 'Head dropping forward.'],
  },
  lunge: {
    exercise: 'lunge',
    label: 'Lunge',
    tempo: '2s down · 1s up',
    cues: [
      'Step out far enough for a 90°/90° bend.',
      'Front knee stacked over the ankle.',
      'Torso upright, core engaged.',
      'Push through the front heel to stand.',
    ],
    warnings: ['Front knee shooting past the toes.', 'Back rounding or leaning forward.'],
  },
  plank: {
    exercise: 'plank',
    label: 'Plank',
    tempo: 'Hold · breathe steadily',
    cues: [
      'Elbows under shoulders.',
      'Straight line from head to heels.',
      'Squeeze glutes and brace abs.',
      'Neutral neck — look at the floor.',
    ],
    warnings: ['Hips sagging toward the floor.', 'Butt piking up high.'],
  },
  shoulder_press: {
    exercise: 'shoulder_press',
    label: 'Shoulder press',
    tempo: '1s up · 2s down',
    cues: [
      'Start at shoulder height, wrists stacked over elbows.',
      'Brace core, ribs down (don’t arch the back).',
      'Press up until arms are straight.',
      'Lower under control to the start.',
    ],
    warnings: ['Excessive lower-back arch.', 'Pressing the weight in front of the body.'],
  },
  bicep_curl: {
    exercise: 'bicep_curl',
    label: 'Bicep curl',
    tempo: '1s up · 2s down',
    cues: [
      'Elbows pinned at your sides.',
      'Curl with the biceps, not by swinging.',
      'Full range: straighten at the bottom.',
      'Control the lowering phase.',
    ],
    warnings: ['Swinging or using momentum.', 'Elbows drifting forward.'],
  },
};

export const FORM_EXERCISES: FormExercise[] = [
  'squat',
  'pushup',
  'lunge',
  'plank',
  'shoulder_press',
  'bicep_curl',
];
