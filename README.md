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

## Not in Phase 1 (per spec)
Social feed, trainer marketplace, food-image recognition, form analysis,
wearables, gamification, live coaching. Phases 2–7 (adaptive coaching, plan
repair, AI coach chat, regional food DB, camera features, integrations,
digital twin) build on this foundation.
