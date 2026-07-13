// Shared domain types for the FitPlan Phase 1 MVP.

export type Goal = 'weight_loss' | 'muscle_gain';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type WorkoutLocation = 'home' | 'gym' | 'outdoor';
export type DietType = 'omnivore' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto';
export type Weekday =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'resistance_bands'
  | 'kettlebell'
  | 'barbell'
  | 'pullup_bar'
  | 'bench'
  | 'full_gym';

export type CoachTone = 'supportive' | 'direct' | 'scientific' | 'minimal';

export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google' | 'phone';
  role: 'user' | 'admin';
  consentAcceptedAt: string | null;
  createdAt: string;
}

// Answers collected during fitness onboarding.
export interface OnboardingProfile {
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  experience: Experience;
  location: WorkoutLocation;
  equipment: Equipment[];
  workoutDays: Weekday[];
  dietType: DietType;
  allergies: string[];
  cuisine: string;
  budget: 'low' | 'medium' | 'high';
  cookingTimeMin: number;
  medicalNotes: string;
  coachTone: CoachTone;
}

export interface Macros {
  calories: number; // midpoint target
  calorieRange: [number, number];
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealItem {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  proteinG: number;
  note?: string; // AI-personalized wording when available
}

export interface DayMeals {
  day: Weekday;
  items: MealItem[];
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: string; // e.g. "8-12" or "30s"
  restSec: number;
  beginnerAlternative?: string;
  instructions: string;
}

export interface WorkoutDay {
  day: Weekday;
  focus: string; // e.g. "Full Body", "Rest / Active Recovery"
  isRest: boolean;
  exercises: WorkoutExercise[];
}

export interface Plan {
  id: string;
  createdAt: string;
  macros: Macros;
  nutritionGuidelines: string[];
  meals: DayMeals[];
  workouts: WorkoutDay[];
  personalized: boolean; // true if Claude touched the copy
}

// A single day's tracking entry. Everything optional to keep logging frictionless.
export interface DailyLog {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  waterMl?: number;
  steps?: number;
  sleepHours?: number;
  energy?: 1 | 2 | 3 | 4 | 5;
  hunger?: 1 | 2 | 3 | 4 | 5;
  workoutCompleted?: boolean;
  proteinG?: number; // running total logged for the day
  mealsLogged?: string[]; // meal slot keys checked off
}

// ---------------------------------------------------------------------------
// Phase 2 — Adaptive coaching
// ---------------------------------------------------------------------------

// The situations a user can pick from the Plan Repair flow.
export type RepairSituation =
  | 'missed_workout'
  | 'ate_too_much'
  | 'travelling'
  | 'no_gym'
  | 'only_15_min'
  | 'feeling_tired'
  | 'restaurant_meal'
  | 'no_planned_food';

// A repaired day the app offers instead of showing failure.
export interface RepairResult {
  situation: RepairSituation;
  createdAt: string;
  title: string;
  message: string; // reassuring, tone-matched summary
  workout?: WorkoutDay; // a replacement/shortened session when relevant
  mealSwaps?: { slot: MealItem['slot']; from: string; to: string }[];
  guidance: string[]; // concrete bullet actions
  weeklyTargetSafe: boolean; // is the weekly workout target still achievable?
}

// Every-7-days check-in used to drive automatic adjustments.
export interface WeeklyReview {
  id: string;
  weekStart: string; // YYYY-MM-DD
  createdAt: string;
  avgWeightKg: number | null;
  waistCm?: number;
  workoutsCompleted: number; // out of planned
  workoutsPlanned: number;
  strengthImproved: boolean;
  hunger: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  sleep: 1 | 2 | 3 | 4 | 5;
  mealDifficulty: 1 | 2 | 3 | 4 | 5; // 5 = very hard to follow
  painOrInjury: boolean;
  satisfaction: 1 | 2 | 3 | 4 | 5;
}

export interface Adjustment {
  id: string;
  createdAt: string;
  reviewId: string;
  calorieDelta: number; // signed kcal change applied to the plan
  changes: string[]; // human-readable list of what changed and why
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  createdAt: string;
}
