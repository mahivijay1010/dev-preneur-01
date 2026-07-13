// Meal replacement engine. Given a meal in the plan, find alternatives that
// match on calories, protein, cost, and cooking time while respecting the
// user's diet, allergies, region, religion, and local availability.

import { getFoodById, queryFoods } from '../data/foodRegistry';
import type { FoodInfo, MealItem, OnboardingProfile } from '../types';

export interface ReplacementCandidate {
  food: FoodInfo;
  score: number; // lower is closer
  calorieDiff: number;
  proteinDiff: number;
}

// Weighted distance so calories/protein dominate, with cost + time as tie-breakers.
function distance(target: FoodInfo, cand: FoodInfo): number {
  const cal = Math.abs(target.calories - cand.calories) / 100; // per 100 kcal
  const pro = Math.abs(target.proteinG - cand.proteinG) / 10; // per 10 g
  const cost = Math.abs(target.approxCost - cand.approxCost) / 50;
  const time = Math.abs(target.cookingTimeMin - cand.cookingTimeMin) / 15;
  return cal * 3 + pro * 3 + cost * 1 + time * 1;
}

export function findReplacements(
  meal: MealItem,
  profile: OnboardingProfile,
  limit = 6,
): ReplacementCandidate[] {
  const target = getFoodById(meal.foodId);
  // Build a synthetic target if the meal isn't in the registry (legacy plans).
  const ref: FoodInfo =
    target ?? {
      id: 'synthetic',
      name: meal.name,
      slot: meal.slot,
      region: profile.region ?? 'generic',
      cuisine: profile.cuisine || 'any',
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: 0,
      fatG: 0,
      fibreG: 0,
      ingredients: [],
      vegetarian: profile.dietType !== 'omnivore',
      vegan: profile.dietType === 'vegan',
      containsEgg: false,
      containsMeat: profile.dietType === 'omnivore',
      diets: [profile.dietType],
      costLevel: 'medium',
      approxCost: 80,
      cookingTimeMin: profile.cookingTimeMin,
      availability: 'common',
      allergens: [],
    };

  const pool = queryFoods({
    slot: meal.slot,
    diet: profile.dietType,
    allergies: profile.allergies,
    region: profile.region,
    budget: profile.budget,
    religion: profile.religion,
    maxCookTimeMin: profile.cookingTimeMin,
  });

  return pool
    .filter((f) => f.id !== ref.id)
    .map((f) => ({
      food: f,
      score: distance(ref, f),
      calorieDiff: f.calories - ref.calories,
      proteinDiff: f.proteinG - ref.proteinG,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
