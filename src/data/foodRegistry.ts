// Single source of truth for structured food data. Everything (planning,
// replacement, grocery) queries this so behaviour stays consistent.

import type {
  Availability,
  CostLevel,
  DietType,
  FoodInfo,
  MealItem,
  OnboardingProfile,
  Region,
  Religion,
} from '../types';
import { REGIONAL_FOODS } from './regionalFoods';

const BY_ID = new Map<string, FoodInfo>(REGIONAL_FOODS.map((f) => [f.id, f]));

export function getFoodById(id: string | undefined): FoodInfo | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function budgetAllows(budget: OnboardingProfile['budget'], cost: CostLevel): boolean {
  const rank: Record<CostLevel, number> = { low: 1, medium: 2, high: 3 };
  const cap: Record<OnboardingProfile['budget'], number> = { low: 1, medium: 2, high: 3 };
  return rank[cost] <= cap[budget];
}

// Religion-based dietary filter. Conservative and opt-in — only applied when the
// user set a religion. Never a hard block beyond well-established restrictions.
export function religionAllows(religion: Religion | undefined, food: FoodInfo): boolean {
  switch (religion) {
    case 'hindu':
      // Commonly avoids beef; our seed has no beef, so allow all.
      return !food.ingredients.some((i) => i.includes('beef'));
    case 'muslim':
      return !food.ingredients.some((i) => i.includes('pork'));
    case 'jain':
      // Strict vegetarian, avoids onion/garlic and root vegetables.
      return (
        food.vegetarian &&
        !food.ingredients.some((i) =>
          ['onion', 'garlic', 'potato'].some((r) => i.includes(r)),
        )
      );
    default:
      return true;
  }
}

function allergyClear(food: FoodInfo, allergies: string[]): boolean {
  const tags = allergies.map((a) => a.trim().toLowerCase()).filter(Boolean);
  return !food.allergens.some((t) => tags.some((a) => t.includes(a) || a.includes(t)));
}

export interface FoodQuery {
  slot: MealItem['slot'];
  diet: DietType;
  allergies: string[];
  region?: Region;
  budget?: OnboardingProfile['budget'];
  religion?: Religion;
  maxCookTimeMin?: number;
  availability?: Availability[];
}

// Returns foods matching a slot + constraints. Region falls back to `generic`
// when a region has too few options for a slot, so we never return an empty pool.
export function queryFoods(q: FoodQuery): FoodInfo[] {
  const region = q.region ?? 'generic';
  const base = REGIONAL_FOODS.filter(
    (food) =>
      food.slot === q.slot &&
      food.diets.includes(q.diet) &&
      allergyClear(food, q.allergies) &&
      (q.budget ? budgetAllows(q.budget, food.costLevel) : true) &&
      religionAllows(q.religion, food) &&
      (q.maxCookTimeMin ? food.cookingTimeMin <= q.maxCookTimeMin + 10 : true) &&
      (q.availability ? q.availability.includes(food.availability) : true),
  );

  const inRegion = base.filter((f) => f.region === region || f.region === 'generic');
  const preferred = region === 'generic' ? base.filter((f) => f.region === 'generic') : inRegion;

  if (preferred.length > 0) return preferred;
  // Loosen region, then budget, before giving up.
  if (inRegion.length > 0) return inRegion;
  return base.length > 0 ? base : REGIONAL_FOODS.filter((f) => f.slot === q.slot && f.diets.includes(q.diet));
}

export function toMealItem(food: FoodInfo): MealItem {
  return {
    slot: food.slot,
    name: food.name,
    calories: food.calories,
    proteinG: food.proteinG,
    foodId: food.id,
  };
}
