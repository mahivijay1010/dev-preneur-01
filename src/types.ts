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

export type CoachTone =
  | 'supportive'
  | 'direct'
  | 'scientific'
  | 'minimal'
  | 'competitive';

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
  // Phase 3 — local & lifestyle preferences (optional; enable regional planning)
  region?: Region;
  city?: string;
  religion?: Religion;
  cookingSkill?: 'basic' | 'intermediate' | 'advanced';
}

// ---------------------------------------------------------------------------
// Phase 3 — Local food & lifestyle intelligence
// ---------------------------------------------------------------------------

export type Region = 'generic' | 'north_india' | 'south_india';
export type Religion = 'none' | 'hindu' | 'muslim' | 'jain' | 'christian' | 'other';
export type CostLevel = 'low' | 'medium' | 'high';
export type Availability = 'common' | 'seasonal' | 'rare';

// Normalized food record used across planning, replacement, and grocery.
export interface FoodInfo {
  id: string;
  name: string;
  slot: MealItem['slot'];
  region: Region;
  cuisine: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  ingredients: string[];
  vegetarian: boolean;
  vegan: boolean;
  containsEgg: boolean;
  containsMeat: boolean;
  diets: DietType[];
  costLevel: CostLevel;
  approxCost: number; // local currency units (₹ for the India seed)
  cookingTimeMin: number;
  availability: Availability;
  allergens: string[];
}

export interface GroceryItem {
  ingredient: string;
  fromMeals: number; // how many meals use it this week
  quantityNote: string; // rough weekly quantity
  estCost: number;
  owned: boolean;
}

export interface GroceryPlan {
  items: GroceryItem[];
  totalCost: number;
  ownedSavings: number;
  wasteTips: string[];
  prepSteps: string[];
}

export interface RestaurantEvaluation {
  dish: string;
  estCalories: [number, number];
  estProteinG: number;
  confidence: 'low' | 'medium' | 'high';
  verdict: 'great' | 'ok' | 'occasional';
  betterChoices: string[];
  portionGuidance: string;
  modifications: string[];
}

export interface RestaurantHistoryItem extends RestaurantEvaluation {
  id: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Phase 4 — Retention & behaviour change
// ---------------------------------------------------------------------------

export type ClothingFit = 'tighter' | 'same' | 'looser';

// Non-scale progress captured periodically. All fields optional.
export interface Measurement {
  date: string; // YYYY-MM-DD
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  hipsCm?: number;
  restingHr?: number;
  workoutCapacity?: 1 | 2 | 3 | 4 | 5; // subjective "how much could you do"
  clothingFit?: ClothingFit;
  note?: string; // stands in for a progress-photo caption until Phase 5 camera
}

// A behaviour pattern detected from the user's own logs, with an intervention.
export interface HabitInsight {
  id: string;
  severity: 'info' | 'suggestion' | 'warning';
  pattern: string; // what we observed
  intervention: string; // what we'll do / suggest about it
}

export interface AdherenceComponent {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number; // relative weight
}

export interface AdherenceScore {
  score: number; // 0-100 overall
  band: 'building' | 'solid' | 'excellent';
  components: AdherenceComponent[];
  daysConsidered: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  achieved: boolean;
  achievedHint?: string; // e.g. "5/5" progress text
}

// ---------------------------------------------------------------------------
// Phase 5 — Camera & sensor features
// ---------------------------------------------------------------------------

export type Confidence = 'low' | 'medium' | 'high';

export interface DetectedFood {
  name: string;
  portion: string; // e.g. "1 cup", "150 g"
  calories: number;
  proteinG: number;
}

// Result of analysing a meal photo. Always user-editable before logging.
export interface FoodPhotoAnalysis {
  foods: DetectedFood[];
  calorieRange: [number, number];
  proteinG: number;
  confidence: Confidence;
  source: 'ai' | 'manual';
}

// A meal the user actually logged. Keeping this separate from the generated
// plan lets Today show what was eaten instead of only marking a slot complete.
export interface LoggedMeal {
  id: string;
  slot: MealItem['slot'];
  name: string;
  foods: DetectedFood[];
  calories: number;
  proteinG: number;
  loggedAt: string;
  source: 'camera' | 'manual';
  confidence?: Confidence;
}

export interface MenuRecommendation {
  dish: string;
  reason: string;
  estCalories: [number, number];
  rank: number;
}

export interface MenuScanResult {
  recommendations: MenuRecommendation[];
  avoid: string[];
  confidence: Confidence;
  source: 'ai' | 'manual';
}

// Qualitative progress-photo read. Deliberately avoids medical-grade body-fat %.
export interface ProgressPhotoAnalysis {
  observations: string[];
  encouragement: string;
  confidence: Confidence;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  uri: string;
  pose: 'front' | 'side' | 'back';
}

export type FormExercise =
  | 'squat'
  | 'pushup'
  | 'lunge'
  | 'plank'
  | 'shoulder_press'
  | 'bicep_curl';

export interface FormFeedback {
  exercise: FormExercise;
  goodPoints: string[];
  corrections: string[];
  postureWarnings: string[];
  confidence: Confidence;
  source: 'ai' | 'manual';
}

// ---------------------------------------------------------------------------
// Phase 7 — Fitness Digital Twin
// ---------------------------------------------------------------------------

export interface TwinEstimate<T> {
  value: T;
  confidence: Confidence;
  basis: string; // plain-language explanation of how it was derived
}

export interface TwinModel {
  dataDays: number; // span of data available
  ready: boolean; // enough data to be meaningful
  maintenanceCalories: TwinEstimate<number | null>;
  recovery: TwinEstimate<{ avgSleep: number | null; avgEnergy: number | null; quality: 'poor' | 'ok' | 'good' }>;
  strength: TwinEstimate<{ improvingWeeks: number; trend: 'up' | 'flat' | 'unknown' }>;
  dropoutRisk: TwinEstimate<{ score: number; level: 'low' | 'moderate' | 'high'; triggers: string[] }>;
  calorieResponse: TwinEstimate<{ sensitivity: 'low' | 'normal' | 'high' | 'unknown' }>;
  adherenceDrivers: string[];
  preferredCoaching: CoachTone;
}

export interface TwinAdjustment {
  calorieDelta: number;
  explanation: string; // the explainable, spec-style narrative
  factors: string[];
  confidence: Confidence;
}

// ---------------------------------------------------------------------------
// Phase 6 — Integrations & professional support
// ---------------------------------------------------------------------------

export type WearableId =
  | 'apple_health'
  | 'health_connect'
  | 'fitbit'
  | 'garmin'
  | 'smart_scale'
  | 'simulated';

export interface WearableProviderInfo {
  id: WearableId;
  name: string;
  icon: string;
  // Native SDK required — false for real providers in this build (honest stub).
  available: boolean;
  imports: string[]; // e.g. ['steps','sleep','weight']
  note: string;
}

export type ExpertKind = 'trainer' | 'dietitian' | 'physio' | 'coach';

export interface Expert {
  id: string;
  name: string;
  kind: ExpertKind;
  credential: string;
  specialty: string;
  icon: string;
}

export interface ExpertMessage {
  id: string;
  from: 'user' | 'expert';
  text: string;
  createdAt: string;
}

export interface PlanReview {
  id: string;
  expertId: string;
  createdAt: string;
  summary: string;
  suggestions: string[];
}

// A client row in the B2B coach dashboard (demo roster).
export interface CoachClient {
  id: string;
  name: string;
  goal: Goal;
  adherence: number; // 0-100
  weeklyWorkouts: string; // e.g. "3/4"
  weightTrendKg: number; // signed change this month
  lastActiveDays: number;
  safetyFlag?: string; // e.g. reported knee pain
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
  foodId?: string; // links to the food registry (Phase 3) for rich data
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
  mealEntries?: LoggedMeal[]; // actual camera/manual meals for each logged slot
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
