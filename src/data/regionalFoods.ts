// Phase 3 regional food database. Seeded for the India market first
// (north + south), plus a `generic` set so users without a region still get
// full data for replacement and grocery planning. Costs are approximate ₹ per
// serving. This is the structured source the whole food-intelligence layer uses.

import type { FoodInfo } from '../types';

// Helper to cut boilerplate; every field is still explicit at the call site
// except the booleans we can derive from diet flags.
function f(x: Omit<FoodInfo, 'vegetarian' | 'vegan' | 'containsEgg' | 'containsMeat'> & {
  vegetarian?: boolean;
  vegan?: boolean;
  containsEgg?: boolean;
  containsMeat?: boolean;
}): FoodInfo {
  return {
    vegetarian: x.diets.includes('vegetarian') || x.diets.includes('vegan'),
    vegan: x.diets.includes('vegan'),
    containsEgg: x.allergens.includes('egg'),
    containsMeat: !x.diets.includes('vegetarian') && !x.diets.includes('vegan') && !x.diets.includes('pescatarian'),
    ...x,
  };
}

export const REGIONAL_FOODS: FoodInfo[] = [
  // ---------------- GENERIC ----------------
  f({ id: 'g_oats', name: 'Oats with milk, banana & peanut butter', slot: 'breakfast', region: 'generic', cuisine: 'international', calories: 420, proteinG: 18, carbsG: 55, fatG: 14, fibreG: 8, ingredients: ['oats', 'milk', 'banana', 'peanut butter'], diets: ['omnivore', 'vegetarian'], costLevel: 'low', approxCost: 45, cookingTimeMin: 10, availability: 'common', allergens: ['dairy', 'peanut', 'gluten'] }),
  f({ id: 'g_eggs', name: 'Scrambled eggs, toast & tomatoes', slot: 'breakfast', region: 'generic', cuisine: 'international', calories: 380, proteinG: 24, carbsG: 30, fatG: 16, fibreG: 4, ingredients: ['eggs', 'bread', 'tomato', 'oil'], diets: ['omnivore', 'vegetarian'], costLevel: 'low', approxCost: 40, cookingTimeMin: 10, availability: 'common', allergens: ['egg', 'gluten'] }),
  f({ id: 'g_yogurt', name: 'Greek yogurt with berries & granola', slot: 'breakfast', region: 'generic', cuisine: 'international', calories: 320, proteinG: 20, carbsG: 38, fatG: 8, fibreG: 5, ingredients: ['greek yogurt', 'berries', 'granola'], diets: ['omnivore', 'vegetarian', 'pescatarian'], costLevel: 'medium', approxCost: 80, cookingTimeMin: 5, availability: 'common', allergens: ['dairy'] }),
  f({ id: 'g_chicken_rice', name: 'Grilled chicken, rice & veggies', slot: 'lunch', region: 'generic', cuisine: 'international', calories: 560, proteinG: 42, carbsG: 55, fatG: 14, fibreG: 6, ingredients: ['chicken breast', 'rice', 'mixed vegetables', 'oil'], diets: ['omnivore'], costLevel: 'medium', approxCost: 120, cookingTimeMin: 30, availability: 'common', allergens: [] }),
  f({ id: 'g_lentil_bowl', name: 'Lentil & chickpea power bowl', slot: 'lunch', region: 'generic', cuisine: 'international', calories: 500, proteinG: 26, carbsG: 70, fatG: 10, fibreG: 16, ingredients: ['lentils', 'chickpeas', 'rice', 'spinach'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 60, cookingTimeMin: 30, availability: 'common', allergens: [] }),
  f({ id: 'g_fish_veg', name: 'Pan-seared fish with roasted veg', slot: 'dinner', region: 'generic', cuisine: 'international', calories: 500, proteinG: 40, carbsG: 25, fatG: 22, fibreG: 7, ingredients: ['fish fillet', 'mixed vegetables', 'olive oil'], diets: ['pescatarian', 'omnivore'], costLevel: 'high', approxCost: 180, cookingTimeMin: 25, availability: 'common', allergens: ['fish'] }),
  f({ id: 'g_tofu_stirfry', name: 'Tofu & vegetable stir-fry with rice', slot: 'dinner', region: 'generic', cuisine: 'international', calories: 520, proteinG: 26, carbsG: 62, fatG: 16, fibreG: 8, ingredients: ['tofu', 'mixed vegetables', 'rice', 'soy sauce'], diets: ['vegan', 'vegetarian'], costLevel: 'medium', approxCost: 90, cookingTimeMin: 25, availability: 'common', allergens: ['soy'] }),
  f({ id: 'g_shake', name: 'Protein shake', slot: 'snack', region: 'generic', cuisine: 'international', calories: 180, proteinG: 25, carbsG: 8, fatG: 3, fibreG: 1, ingredients: ['whey protein', 'milk or water'], diets: ['omnivore', 'vegetarian', 'pescatarian'], costLevel: 'medium', approxCost: 50, cookingTimeMin: 2, availability: 'common', allergens: ['dairy'] }),
  f({ id: 'g_nuts', name: 'Mixed nuts & an apple', slot: 'snack', region: 'generic', cuisine: 'international', calories: 240, proteinG: 8, carbsG: 22, fatG: 15, fibreG: 5, ingredients: ['mixed nuts', 'apple'], diets: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto'], costLevel: 'medium', approxCost: 60, cookingTimeMin: 1, availability: 'common', allergens: ['nuts'] }),

  // ---------------- NORTH INDIA ----------------
  f({ id: 'ni_paratha', name: 'Aloo paratha with curd', slot: 'breakfast', region: 'north_india', cuisine: 'north indian', calories: 450, proteinG: 14, carbsG: 58, fatG: 18, fibreG: 6, ingredients: ['wheat flour', 'potato', 'curd', 'ghee'], diets: ['vegetarian'], costLevel: 'low', approxCost: 40, cookingTimeMin: 25, availability: 'common', allergens: ['dairy', 'gluten'] }),
  f({ id: 'ni_chole', name: 'Chole with brown rice', slot: 'lunch', region: 'north_india', cuisine: 'north indian', calories: 560, proteinG: 22, carbsG: 82, fatG: 14, fibreG: 15, ingredients: ['chickpeas', 'onion', 'tomato', 'brown rice', 'spices'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 70, cookingTimeMin: 35, availability: 'common', allergens: [] }),
  f({ id: 'ni_rajma', name: 'Rajma chawal', slot: 'lunch', region: 'north_india', cuisine: 'north indian', calories: 540, proteinG: 20, carbsG: 84, fatG: 10, fibreG: 14, ingredients: ['kidney beans', 'rice', 'onion', 'tomato', 'spices'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 60, cookingTimeMin: 40, availability: 'common', allergens: [] }),
  f({ id: 'ni_paneer', name: 'Paneer bhurji with roti', slot: 'dinner', region: 'north_india', cuisine: 'north indian', calories: 520, proteinG: 28, carbsG: 40, fatG: 26, fibreG: 6, ingredients: ['paneer', 'onion', 'tomato', 'wheat flour', 'oil'], diets: ['vegetarian'], costLevel: 'medium', approxCost: 110, cookingTimeMin: 25, availability: 'common', allergens: ['dairy', 'gluten'] }),
  f({ id: 'ni_chicken_curry', name: 'Chicken curry with roti', slot: 'dinner', region: 'north_india', cuisine: 'north indian', calories: 580, proteinG: 44, carbsG: 38, fatG: 24, fibreG: 5, ingredients: ['chicken', 'onion', 'tomato', 'wheat flour', 'spices', 'oil'], diets: ['omnivore'], costLevel: 'medium', approxCost: 140, cookingTimeMin: 40, availability: 'common', allergens: ['gluten'] }),
  f({ id: 'ni_dal', name: 'Dal tadka with rice', slot: 'dinner', region: 'north_india', cuisine: 'north indian', calories: 500, proteinG: 20, carbsG: 78, fatG: 10, fibreG: 12, ingredients: ['lentils', 'rice', 'onion', 'tomato', 'ghee', 'spices'], diets: ['vegetarian', 'vegan'], costLevel: 'low', approxCost: 50, cookingTimeMin: 30, availability: 'common', allergens: [] }),
  f({ id: 'ni_lassi', name: 'Masala buttermilk & roasted chana', slot: 'snack', region: 'north_india', cuisine: 'north indian', calories: 200, proteinG: 12, carbsG: 22, fatG: 6, fibreG: 5, ingredients: ['curd', 'roasted chana', 'spices'], diets: ['vegetarian'], costLevel: 'low', approxCost: 30, cookingTimeMin: 5, availability: 'common', allergens: ['dairy'] }),
  f({ id: 'ni_egg_bhurji', name: 'Egg bhurji with paratha', slot: 'breakfast', region: 'north_india', cuisine: 'north indian', calories: 430, proteinG: 22, carbsG: 40, fatG: 20, fibreG: 4, ingredients: ['eggs', 'onion', 'tomato', 'wheat flour', 'oil'], diets: ['omnivore', 'vegetarian'], costLevel: 'low', approxCost: 55, cookingTimeMin: 20, availability: 'common', allergens: ['egg', 'gluten'] }),

  // ---------------- SOUTH INDIA ----------------
  f({ id: 'si_idli', name: 'Idli with sambar', slot: 'breakfast', region: 'south_india', cuisine: 'south indian', calories: 360, proteinG: 14, carbsG: 68, fatG: 4, fibreG: 8, ingredients: ['rice', 'urad dal', 'toor dal', 'vegetables', 'spices'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 45, cookingTimeMin: 20, availability: 'common', allergens: [] }),
  f({ id: 'si_dosa', name: 'Masala dosa with chutney', slot: 'breakfast', region: 'south_india', cuisine: 'south indian', calories: 430, proteinG: 12, carbsG: 66, fatG: 14, fibreG: 6, ingredients: ['rice', 'urad dal', 'potato', 'coconut', 'oil'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 60, cookingTimeMin: 20, availability: 'common', allergens: [] }),
  f({ id: 'si_curdrice', name: 'Curd rice with vegetables', slot: 'lunch', region: 'south_india', cuisine: 'south indian', calories: 480, proteinG: 16, carbsG: 74, fatG: 12, fibreG: 5, ingredients: ['rice', 'curd', 'vegetables', 'tempering'], diets: ['vegetarian'], costLevel: 'low', approxCost: 50, cookingTimeMin: 20, availability: 'common', allergens: ['dairy'] }),
  f({ id: 'si_sambar_rice', name: 'Sambar rice with poriyal', slot: 'lunch', region: 'south_india', cuisine: 'south indian', calories: 540, proteinG: 20, carbsG: 88, fatG: 10, fibreG: 14, ingredients: ['toor dal', 'rice', 'mixed vegetables', 'sambar powder'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 65, cookingTimeMin: 35, availability: 'common', allergens: [] }),
  f({ id: 'si_fish_curry', name: 'Fish curry with rice', slot: 'dinner', region: 'south_india', cuisine: 'south indian', calories: 560, proteinG: 40, carbsG: 55, fatG: 20, fibreG: 5, ingredients: ['fish', 'coconut', 'tamarind', 'rice', 'spices'], diets: ['pescatarian', 'omnivore'], costLevel: 'high', approxCost: 170, cookingTimeMin: 35, availability: 'common', allergens: ['fish'] }),
  f({ id: 'si_chicken_chettinad', name: 'Chicken Chettinad with rice', slot: 'dinner', region: 'south_india', cuisine: 'south indian', calories: 600, proteinG: 45, carbsG: 52, fatG: 24, fibreG: 6, ingredients: ['chicken', 'coconut', 'onion', 'rice', 'spices'], diets: ['omnivore'], costLevel: 'medium', approxCost: 150, cookingTimeMin: 45, availability: 'common', allergens: [] }),
  f({ id: 'si_pongal', name: 'Ven pongal with sambar', slot: 'dinner', region: 'south_india', cuisine: 'south indian', calories: 500, proteinG: 18, carbsG: 76, fatG: 14, fibreG: 8, ingredients: ['rice', 'moong dal', 'ghee', 'pepper', 'cumin'], diets: ['vegetarian'], costLevel: 'low', approxCost: 55, cookingTimeMin: 30, availability: 'common', allergens: ['dairy'] }),
  f({ id: 'si_sundal', name: 'Sundal (spiced chickpeas)', slot: 'snack', region: 'south_india', cuisine: 'south indian', calories: 210, proteinG: 11, carbsG: 30, fatG: 5, fibreG: 8, ingredients: ['chickpeas', 'coconut', 'curry leaves', 'tempering'], diets: ['vegan', 'vegetarian'], costLevel: 'low', approxCost: 30, cookingTimeMin: 15, availability: 'common', allergens: [] }),
];
