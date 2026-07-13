// Restaurant mode. The user types (or picks) a dish; we estimate its calories
// and protein from keyword heuristics, give portion guidance, suggest healthier
// modifications, and always attach a confidence level. This is intentionally
// approximate — the UI must present it as an estimate, not a medical figure.

import type { OnboardingProfile, RestaurantEvaluation } from '../types';

interface DishSignal {
  keywords: string[];
  cals: [number, number];
  protein: number;
  cook: 'fried' | 'grilled' | 'creamy' | 'steamed' | 'baked' | 'raw' | 'mixed';
}

// Keyword table — cooking method and ingredients drive the estimate.
const SIGNALS: DishSignal[] = [
  { keywords: ['fried', 'pakora', 'samosa', 'bhaji', 'tempura', 'crispy'], cals: [500, 800], protein: 10, cook: 'fried' },
  { keywords: ['butter', 'makhani', 'malai', 'cream', 'alfredo', 'korma', 'cheese'], cals: [600, 900], protein: 22, cook: 'creamy' },
  { keywords: ['biryani', 'pulao', 'fried rice', 'noodles', 'pasta'], cals: [550, 850], protein: 18, cook: 'mixed' },
  { keywords: ['grilled', 'tandoori', 'tikka', 'kebab', 'roast'], cals: [350, 550], protein: 38, cook: 'grilled' },
  { keywords: ['salad', 'raita', 'sprout', 'steamed', 'idli', 'sundal'], cals: [150, 350], protein: 12, cook: 'steamed' },
  { keywords: ['dal', 'sambar', 'rasam', 'curry', 'gravy'], cals: [300, 500], protein: 16, cook: 'mixed' },
  { keywords: ['paneer', 'tofu', 'chicken', 'fish', 'egg', 'mutton', 'prawn'], cals: [400, 650], protein: 32, cook: 'mixed' },
];

function classify(dish: string): { signal: DishSignal; matched: number } {
  const q = dish.toLowerCase();
  let best: DishSignal | null = null;
  let matched = 0;
  for (const s of SIGNALS) {
    const hits = s.keywords.filter((k) => q.includes(k)).length;
    if (hits > matched) {
      matched = hits;
      best = s;
    }
  }
  // Default to a mid-range mixed dish when nothing matches.
  return {
    signal: best ?? { keywords: [], cals: [400, 650], protein: 20, cook: 'mixed' },
    matched,
  };
}

export function evaluateDish(
  dish: string,
  profile: OnboardingProfile,
): RestaurantEvaluation {
  const { signal, matched } = classify(dish);
  const confidence: RestaurantEvaluation['confidence'] =
    matched >= 2 ? 'high' : matched === 1 ? 'medium' : 'low';

  const verdict: RestaurantEvaluation['verdict'] =
    signal.cook === 'grilled' || signal.cook === 'steamed'
      ? 'great'
      : signal.cook === 'fried' || signal.cook === 'creamy'
        ? 'occasional'
        : 'ok';

  const betterChoices: string[] = [];
  if (signal.cook === 'fried') {
    betterChoices.push('Ask for a grilled/tandoori version instead of fried.');
    betterChoices.push('Pair with a salad or clear soup to fill up on fewer calories.');
  }
  if (signal.cook === 'creamy') {
    betterChoices.push('Choose a tomato- or yogurt-based gravy over cream/butter.');
    betterChoices.push('Swap naan for roti or a smaller portion of rice.');
  }
  if (signal.cook === 'mixed' || signal.cook === 'grilled') {
    betterChoices.push('Add a portion of dal, curd, or grilled protein to boost protein.');
  }
  if (profile.goal === 'weight_loss') {
    betterChoices.push('Skip the sugary drink — water, buttermilk, or lime soda (no sugar).');
  }

  const modifications = [
    'Ask for less oil/ghee and dressing/sauce on the side.',
    'Request half the rice/bread and extra vegetables.',
    signal.protein < 20 ? 'Add an egg, paneer, tofu, or grilled meat for protein.' : 'Good protein — keep it as the centrepiece.',
  ];

  return {
    dish,
    estCalories: signal.cals,
    estProteinG: signal.protein,
    confidence,
    verdict,
    betterChoices,
    portionGuidance:
      'Aim for a palm of protein, a fist of carbs, and a thumb of fats. Stop at comfortably full, not stuffed.',
    modifications,
  };
}
