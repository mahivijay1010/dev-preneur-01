# FitPlan — Phase 1 MVP

A React Native (Expo) fitness app that gives users a **realistic plan built on
real math + expert templates** and makes daily tracking frictionless. This
implements **Phase 1 (Core MVP)** from [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md).

> Plan numbers (calories, protein) come from deterministic formulas — never from
> AI. Claude is used only to personalize meal wording, and the app works fully
> offline without any API key.

## What's built (Phase 1)

| Spec area | Where |
|---|---|
| Auth (email / Google / phone) + profile + consent | [app/(auth)/](app/(auth)) |
| Fitness onboarding (all 14 spec fields) | [app/onboarding/index.tsx](app/onboarding/index.tsx) |
| Plan generation — calories, protein, guidelines, 7-day meals, weekly workouts, instructions, sets/reps/rest, beginner alternatives | [src/engine/](src/engine), [src/data/](src/data) |
| Daily tracking (weight, meals, water, steps, sleep, energy, hunger, workout) | [app/(tabs)/today.tsx](app/(tabs)/today.tsx) |
| Progress dashboard (weight, 7-day avg, change, workouts, protein adherence, consistency, goal progress) | [app/(tabs)/progress.tsx](app/(tabs)/progress.tsx) |
| Notifications (workout / meal / weigh-in / weekly summary) | [src/services/notifications.ts](src/services/notifications.ts) |
| Admin panel (exercises, foods, users, plan review, safety) | [app/(tabs)/admin.tsx](app/(tabs)/admin.tsx) |

## Architecture

- **Expo Router** for file-based navigation (`app/`).
- **Deterministic engine** (`src/engine`) — Mifflin-St Jeor BMR → TDEE →
  goal-adjusted calories (15% deficit / 10% surplus, with safety floors),
  protein at 1.8–2.0 g/kg. Pure and testable.
- **Expert templates** (`src/data`) — curated exercise + food libraries filtered
  by equipment, location, diet, and allergies.
- **Claude layer** (`src/services/claude.ts`) — optional, adds a short tone-matched
  note per meal; silently falls back to templates if no key or on any error.
- **State** — a single persisted `zustand` store (`src/store/appStore.ts`) backed
  by AsyncStorage, so everything survives restarts and works offline.

## Run it

```bash
npm install
npm start          # then press w (web), i (iOS sim), or a (Android)
# or directly:
npm run web
npm run ios
npm run android
npm run typecheck  # tsc --noEmit
```

### Demo login
Any name/email works. Use an email starting with **`admin@`** (e.g.
`admin@fitplan.app`) to unlock the Admin tab.

### Optional: enable AI personalization
```bash
cp .env.example .env
# set EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```
Without a key the app runs fully offline on deterministic templates.

> ⚠️ `EXPO_PUBLIC_*` vars are bundled into the client — fine for local demo, but
> in production the Claude call must be proxied through your own backend so the
> key is never shipped to devices.

## What's built (Phase 2 — Adaptive coaching)

| Spec area | Where |
|---|---|
| **Plan Repair** (missed workout, ate too much, travelling, no gym, 15 min, tired, restaurant, no food) — repairs the day instead of showing failure | [app/repair.tsx](app/repair.tsx), [src/engine/planRepair.ts](src/engine/planRepair.ts) |
| **Weekly review** (weight, waist, workouts, strength, hunger, energy, sleep, meal difficulty, injury, satisfaction) | [app/weekly-review.tsx](app/weekly-review.tsx) |
| **Automatic adjustments** — gradual, using rolling averages + a minimum observation window; never reacts to a single day | [src/engine/adjustments.ts](src/engine/adjustments.ts) |
| **AI coach chat** — grounded in the user's plan and approved catalogs, refuses to diagnose; Claude-backed with a deterministic fallback | [app/(tabs)/coach.tsx](app/(tabs)/coach.tsx), [src/services/coach.ts](src/services/coach.ts) |

Safeguards worth noting: calorie changes require ≥2 weekly reviews and are capped
at 150 kcal/step; the coach is hard-constrained to approved foods/exercises and
told never to invent numbers or give medical diagnoses.

## What's built (Phase 3 — Local food & lifestyle intelligence)

Seeded for the **India** market first (North + South), extensible to other regions.

| Spec area | Where |
|---|---|
| **Regional food DB** — local dishes with serving size, calories, protein/carbs/fat/fibre, ingredients, veg status, approx cost, cooking time, availability | [src/data/regionalFoods.ts](src/data/regionalFoods.ts) |
| **Local meal planning** — region/city/religion/budget/cooking-time-aware generation | [src/data/foodRegistry.ts](src/data/foodRegistry.ts), [app/local-preferences.tsx](app/local-preferences.tsx) |
| **Meal replacement engine** — every meal has "Replace"; options match calories, protein, cost, cooking time, diet & local availability | [src/engine/mealReplacement.ts](src/engine/mealReplacement.ts), [app/replace-meal.tsx](app/replace-meal.tsx) |
| **Grocery planning** — weekly list, estimated cost, quantities, already-owned exclusion, food-waste tips, meal-prep steps | [src/engine/grocery.ts](src/engine/grocery.ts), [app/grocery.tsx](app/grocery.tsx) |
| **Restaurant mode** — enter a dish → better choices, portion guidance, modifications, calorie range, confidence level | [src/engine/restaurant.ts](src/engine/restaurant.ts), [app/restaurant.tsx](app/restaurant.tsx) |

Set your region under **Plan → 📍 Local** to switch meal planning to your local
cuisine. Grocery, Restaurant, and per-meal Replace all live on the **Plan** tab.

## What's built (Phase 4 — Retention & behaviour change)

| Spec area | Where |
|---|---|
| **Habit intelligence** — detects real patterns from logs (weekday workout skips, weekend logging drop-off, chronic protein misses, poor-sleep→low-energy) and pairs each with a targeted intervention | [src/engine/habits.ts](src/engine/habits.ts) |
| **Adherence score** — one 0-100 number from 6 weighted components (workouts, meals, protein, sleep, weigh-ins, recovery) over a forgiving 14-day rolling window | [src/engine/adherence.ts](src/engine/adherence.ts) |
| **Non-scale progress** — waist/chest/arms/hips, resting HR, workout capacity, clothing fit (progress photos land in Phase 5) | [app/measurements.tsx](app/measurements.tsx) |
| **Milestones** — earned purely from real data: first 5 workouts, first month consistent, strength increase, waist reduction, improved sleep, first repaired day | [src/engine/milestones.ts](src/engine/milestones.ts), [app/milestones.tsx](app/milestones.tsx) |
| **Coaching personalities** — supportive / direct / scientific / minimal / competitive; only the tone changes, recommendations are identical | Profile tab + [src/services/coach.ts](src/services/coach.ts) |

The **Progress** tab now leads with the adherence score, then insights,
milestones, and a non-scale measurements entry. Change your coaching personality
any time under the **Profile** tab.

## What's built (Phase 5 — Camera & sensor features)

Uses `expo-image-picker` (camera + library; works on web via the file dialog)
and a Claude **vision** service. Everything degrades to manual entry when no API
key is set, and every result is presented as an editable estimate.

| Spec area | Where |
|---|---|
| **Food camera** — detected foods, portions, calorie range, protein, confidence, all editable before logging | [app/food-camera.tsx](app/food-camera.tsx), [src/services/vision.ts](src/services/vision.ts) |
| **Menu scanner** — photograph a menu/buffet/shelf → best options ranked for your target + what to skip | [app/menu-scanner.tsx](app/menu-scanner.tsx) |
| **Progress photo analysis** — timeline gallery + gentle qualitative observations (never a body-fat %) | [app/progress-photo.tsx](app/progress-photo.tsx) |
| **Exercise form assistance** — squat/push-up/lunge/plank/shoulder press/bicep curl: expert cues, rep counter, tempo guide, and photo-based AI feedback (never diagnoses) | [app/form-check.tsx](app/form-check.tsx), [src/data/formCues.ts](src/data/formCues.ts) |

Entry points: **Log meal** / **Check my form** on the Today tab, **Progress
photos** on the Progress tab, and **Scan a menu** in Restaurant mode.

> Live pose tracking (real-time rep/ROM analysis) needs an on-device ML model
> and is out of scope for this build — form assistance is photo-based plus an
> expert cue sheet, rep counter, and tempo metronome.

## Not in Phase 1 (per spec)
Social feed, trainer marketplace, food-image recognition, form analysis,
wearables, gamification, live coaching. Phases 2–7 (adaptive coaching, plan
repair, AI coach chat, regional food DB, camera features, integrations,
digital twin) build on this foundation.
