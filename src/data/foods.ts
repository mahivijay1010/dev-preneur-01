// Expert-curated meal/food templates keyed by diet type and slot.
// Admin can extend this database in-app. Phase 3 replaces this with a
// structured regional food database.

import type { DietType } from '../types';

export interface FoodTemplate {
  id: string;
  name: string;
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number; // per serving
  proteinG: number;
  diets: DietType[]; // which diet types this fits
  tags: string[]; // e.g. allergens/ingredients for filtering
}

export const FOODS: FoodTemplate[] = [
  // Breakfast
  { id: 'f_oats', name: 'Oats with milk, banana & peanut butter', slot: 'breakfast', calories: 420, proteinG: 18, diets: ['omnivore', 'vegetarian'], tags: ['dairy', 'peanut', 'gluten'] },
  { id: 'f_eggs', name: 'Scrambled eggs, toast & tomatoes', slot: 'breakfast', calories: 380, proteinG: 24, diets: ['omnivore', 'vegetarian'], tags: ['egg', 'gluten'] },
  { id: 'f_tofu_scramble', name: 'Tofu scramble with spinach', slot: 'breakfast', calories: 340, proteinG: 22, diets: ['vegan', 'vegetarian'], tags: ['soy'] },
  { id: 'f_yogurt', name: 'Greek yogurt with berries & granola', slot: 'breakfast', calories: 320, proteinG: 20, diets: ['omnivore', 'vegetarian', 'pescatarian'], tags: ['dairy'] },
  { id: 'f_keto_eggs', name: 'Eggs & avocado with cheese', slot: 'breakfast', calories: 450, proteinG: 22, diets: ['keto', 'vegetarian', 'omnivore'], tags: ['egg', 'dairy'] },

  // Lunch
  { id: 'f_chicken_rice', name: 'Grilled chicken, rice & veggies', slot: 'lunch', calories: 560, proteinG: 42, diets: ['omnivore'], tags: [] },
  { id: 'f_salmon_quinoa', name: 'Baked salmon with quinoa & greens', slot: 'lunch', calories: 540, proteinG: 38, diets: ['pescatarian', 'omnivore'], tags: ['fish'] },
  { id: 'f_lentil_bowl', name: 'Lentil & chickpea power bowl', slot: 'lunch', calories: 500, proteinG: 26, diets: ['vegan', 'vegetarian'], tags: [] },
  { id: 'f_paneer_wrap', name: 'Paneer & veg wrap', slot: 'lunch', calories: 520, proteinG: 28, diets: ['vegetarian'], tags: ['dairy', 'gluten'] },
  { id: 'f_keto_bowl', name: 'Chicken, avocado & egg salad', slot: 'lunch', calories: 560, proteinG: 40, diets: ['keto', 'omnivore'], tags: ['egg'] },

  // Dinner
  { id: 'f_beef_stirfry', name: 'Lean beef stir-fry with vegetables', slot: 'dinner', calories: 580, proteinG: 44, diets: ['omnivore'], tags: [] },
  { id: 'f_fish_veg', name: 'Pan-seared fish with roasted veg', slot: 'dinner', calories: 500, proteinG: 40, diets: ['pescatarian', 'omnivore'], tags: ['fish'] },
  { id: 'f_tofu_stirfry', name: 'Tofu & vegetable stir-fry with rice', slot: 'dinner', calories: 520, proteinG: 26, diets: ['vegan', 'vegetarian'], tags: ['soy'] },
  { id: 'f_dal_roti', name: 'Dal, roti & sautéed vegetables', slot: 'dinner', calories: 540, proteinG: 24, diets: ['vegetarian', 'vegan'], tags: ['gluten'] },
  { id: 'f_keto_dinner', name: 'Grilled chicken thighs with broccoli & butter', slot: 'dinner', calories: 600, proteinG: 46, diets: ['keto', 'omnivore'], tags: ['dairy'] },

  // Snacks
  { id: 'f_shake', name: 'Protein shake', slot: 'snack', calories: 180, proteinG: 25, diets: ['omnivore', 'vegetarian', 'pescatarian'], tags: ['dairy'] },
  { id: 'f_nuts', name: 'Mixed nuts & an apple', slot: 'snack', calories: 240, proteinG: 8, diets: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto'], tags: ['nuts'] },
  { id: 'f_hummus', name: 'Hummus with carrot & cucumber', slot: 'snack', calories: 200, proteinG: 7, diets: ['vegan', 'vegetarian'], tags: [] },
  { id: 'f_cottage', name: 'Cottage cheese with fruit', slot: 'snack', calories: 190, proteinG: 20, diets: ['vegetarian', 'omnivore'], tags: ['dairy'] },
  { id: 'f_edamame', name: 'Steamed edamame', slot: 'snack', calories: 180, proteinG: 17, diets: ['vegan', 'vegetarian'], tags: ['soy'] },
];

export function foodsFor(
  diet: DietType,
  slot: FoodTemplate['slot'],
  allergies: string[],
): FoodTemplate[] {
  const allergyTags = allergies.map((a) => a.trim().toLowerCase()).filter(Boolean);
  return FOODS.filter(
    (f) =>
      f.slot === slot &&
      f.diets.includes(diet) &&
      !f.tags.some((t) => allergyTags.some((a) => t.includes(a) || a.includes(t))),
  );
}
