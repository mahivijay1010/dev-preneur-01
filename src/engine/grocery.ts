// Grocery planning. Aggregates the week's meals into a shopping list with rough
// quantities and estimated cost, lets the user exclude already-owned items, and
// surfaces food-waste and meal-prep guidance.

import { getFoodById } from '../data/foodRegistry';
import type { GroceryItem, GroceryPlan, Plan } from '../types';

// Rough per-use quantity + unit cost hints for common staples (India seed, ₹).
// Falls back to a generic estimate for anything unlisted.
const INGREDIENT_META: Record<string, { unit: string; perUse: number; unitCost: number }> = {
  rice: { unit: 'kg', perUse: 0.08, unitCost: 60 },
  'brown rice': { unit: 'kg', perUse: 0.08, unitCost: 90 },
  'wheat flour': { unit: 'kg', perUse: 0.1, unitCost: 45 },
  bread: { unit: 'loaf', perUse: 0.25, unitCost: 45 },
  oats: { unit: 'kg', perUse: 0.05, unitCost: 120 },
  milk: { unit: 'litre', perUse: 0.2, unitCost: 60 },
  curd: { unit: 'kg', perUse: 0.1, unitCost: 70 },
  'greek yogurt': { unit: 'cup', perUse: 1, unitCost: 80 },
  paneer: { unit: 'kg', perUse: 0.1, unitCost: 350 },
  eggs: { unit: 'dozen', perUse: 0.2, unitCost: 84 },
  chicken: { unit: 'kg', perUse: 0.15, unitCost: 240 },
  'chicken breast': { unit: 'kg', perUse: 0.15, unitCost: 320 },
  fish: { unit: 'kg', perUse: 0.15, unitCost: 400 },
  'fish fillet': { unit: 'kg', perUse: 0.15, unitCost: 450 },
  tofu: { unit: 'kg', perUse: 0.1, unitCost: 220 },
  lentils: { unit: 'kg', perUse: 0.06, unitCost: 130 },
  'toor dal': { unit: 'kg', perUse: 0.06, unitCost: 140 },
  'urad dal': { unit: 'kg', perUse: 0.05, unitCost: 150 },
  'moong dal': { unit: 'kg', perUse: 0.06, unitCost: 140 },
  chickpeas: { unit: 'kg', perUse: 0.07, unitCost: 110 },
  'kidney beans': { unit: 'kg', perUse: 0.07, unitCost: 160 },
  'roasted chana': { unit: 'kg', perUse: 0.04, unitCost: 160 },
  potato: { unit: 'kg', perUse: 0.1, unitCost: 30 },
  onion: { unit: 'kg', perUse: 0.08, unitCost: 40 },
  tomato: { unit: 'kg', perUse: 0.08, unitCost: 40 },
  spinach: { unit: 'bunch', perUse: 0.3, unitCost: 25 },
  'mixed vegetables': { unit: 'kg', perUse: 0.15, unitCost: 60 },
  vegetables: { unit: 'kg', perUse: 0.15, unitCost: 60 },
  banana: { unit: 'dozen', perUse: 0.15, unitCost: 50 },
  apple: { unit: 'kg', perUse: 0.15, unitCost: 150 },
  berries: { unit: 'box', perUse: 0.3, unitCost: 120 },
  'peanut butter': { unit: 'jar', perUse: 0.06, unitCost: 250 },
  'mixed nuts': { unit: 'kg', perUse: 0.03, unitCost: 700 },
  coconut: { unit: 'piece', perUse: 0.3, unitCost: 40 },
  'whey protein': { unit: 'serving', perUse: 1, unitCost: 45 },
};

const GENERIC = { unit: 'unit', perUse: 0.15, unitCost: 50 };

// Pantry items we assume most kitchens already have — flagged as owned by default.
const ASSUMED_OWNED = new Set([
  'oil',
  'olive oil',
  'ghee',
  'spices',
  'salt',
  'soy sauce',
  'tempering',
  'sambar powder',
  'curry leaves',
  'tamarind',
  'garlic',
  'pepper',
  'cumin',
  'granola',
  'sambar',
  'chutney',
  'milk or water',
]);

export function buildGroceryPlan(plan: Plan, ownedIngredients: string[]): GroceryPlan {
  const owned = new Set(ownedIngredients.map((i) => i.toLowerCase().trim()));
  const counts = new Map<string, number>();

  for (const day of plan.meals) {
    for (const item of day.items) {
      const food = getFoodById(item.foodId);
      if (!food) continue;
      for (const ing of food.ingredients) {
        counts.set(ing, (counts.get(ing) ?? 0) + 1);
      }
    }
  }

  const items: GroceryItem[] = [...counts.entries()]
    .map(([ingredient, fromMeals]) => {
      const meta = INGREDIENT_META[ingredient] ?? GENERIC;
      const qty = meta.perUse * fromMeals;
      const isOwned = owned.has(ingredient) || ASSUMED_OWNED.has(ingredient);
      return {
        ingredient,
        fromMeals,
        quantityNote: `~${round2(qty)} ${meta.unit}`,
        estCost: Math.round(qty * meta.unitCost),
        owned: isOwned,
      };
    })
    .sort((a, b) => b.fromMeals - a.fromMeals);

  const totalCost = items.filter((i) => !i.owned).reduce((a, i) => a + i.estCost, 0);
  const ownedSavings = items.filter((i) => i.owned).reduce((a, i) => a + i.estCost, 0);

  return {
    items,
    totalCost,
    ownedSavings,
    wasteTips: buildWasteTips(items),
    prepSteps: buildPrepSteps(plan),
  };
}

function buildWasteTips(items: GroceryItem[]): string[] {
  const tips: string[] = [];
  const names = items.map((i) => i.ingredient);
  if (names.some((n) => ['spinach', 'vegetables', 'mixed vegetables'].includes(n))) {
    tips.push('Store leafy greens wrapped in a dry cloth in the fridge; use them earliest in the week.');
  }
  if (names.includes('banana')) {
    tips.push('Freeze over-ripe bananas for smoothies instead of throwing them out.');
  }
  if (names.some((n) => ['onion', 'tomato', 'potato'].includes(n))) {
    tips.push('Keep onions and potatoes out of the fridge and apart from each other to slow spoilage.');
  }
  tips.push('Batch-cook grains and dals; portion and refrigerate to avoid re-cooking waste.');
  return tips;
}

function buildPrepSteps(plan: Plan): string[] {
  const proteins = new Set<string>();
  for (const day of plan.meals) {
    for (const item of day.items) {
      const food = getFoodById(item.foodId);
      food?.ingredients
        .filter((i) => ['chicken', 'fish', 'paneer', 'tofu', 'eggs', 'lentils', 'chickpeas', 'kidney beans'].some((p) => i.includes(p)))
        .forEach((p) => proteins.add(p));
    }
  }
  return [
    'Sunday: wash and chop vegetables for the first 3 days; store in airtight boxes.',
    proteins.size
      ? `Pre-cook proteins in bulk: ${[...proteins].slice(0, 4).join(', ')}.`
      : 'Pre-cook your main protein sources in bulk.',
    'Cook a large pot of rice/grains and refrigerate in meal-sized portions.',
    'Portion snacks into single servings so tracking stays effortless.',
  ];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
