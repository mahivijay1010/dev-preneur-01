# FitPlan — How to Run (Web · iOS · Android)

FitPlan is a single Expo codebase that ships to **web, iOS, and Android**. The backend is
Express + MongoDB with an AI coach (OpenAI primary, Claude fallback).

---

## 1. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node.js | 18+ (tested on 21) | everything |
| npm | 9+ | everything |
| Xcode + iOS Simulator | latest | iOS simulator builds |
| Android Studio + emulator | latest | Android emulator builds |
| **Expo Go** app (App Store / Play Store) | SDK 51 compatible | fastest way to run on a real phone |
| MongoDB | Atlas cluster or local | backend |

## 2. First-time setup

```bash
npm install
cp .env.example .env        # then fill in values
```

Minimum `.env` for local development:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api   # phone testing: use your LAN IP, e.g. http://192.168.1.10:4000/api
MONGODB_URI=<your MongoDB connection string>     # or the individual MONGO_* fields
JWT_SECRET=<32+ random characters>
PORT=4000
CLIENT_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:19006

# AI coach (optional — the app degrades gracefully to the built-in offline coach)
OPENAI_API_KEY=sk-...        # primary, gpt-4o-mini (very low cost)
ANTHROPIC_API_KEY=sk-ant-... # optional automatic fallback
```

## 3. Run it

### Web (fastest)
```bash
npm run dev        # starts API (:4000) + web app (:3000) together
# or separately:
npm run server:dev # Express API with reload
npm run web        # Expo web on http://localhost:3000
```

### iOS
```bash
npm run start:backend      # API in one terminal
npm run ios                # opens the iOS Simulator via Expo
```
**Real iPhone:** run `npx expo start`, scan the QR code with the Camera app (opens in Expo Go).
Set `EXPO_PUBLIC_API_URL` to your Mac's LAN IP first so the phone can reach the API.

### Android
```bash
npm run start:backend      # API in one terminal
npm run android            # opens the Android emulator via Expo
```
**Real Android phone:** run `npx expo start`, scan the QR from the Expo Go app.
Same LAN-IP note as iOS. Android emulator tip: `10.0.2.2` reaches your host's `localhost`.

### Production builds (when ready to ship)
```bash
npx expo prebuild                 # generate native projects
npx eas build -p ios              # App Store build via EAS
npx eas build -p android          # Play Store build via EAS
npx expo export -p web            # static web bundle
```

## 4. Test account

| Field | Value |
|---|---|
| Email | `demo@fitplan.app` |
| Password | `FitPlan#2026` |

The account has a completed profile and a generated weekly plan (weight-loss track, home training,
3 days/week). Create fresh accounts freely — registration is open.

## 5. Quality gates

```bash
npm run typecheck            # strict TypeScript
npm run verify:web           # Playwright: registration → onboarding → logging flows, desktop+mobile
node scripts/crawl-all.mjs   # signs in as the test user and screenshots EVERY screen (desktop+mobile)
```
Screenshots land in `.artifacts/` — both scripts also report console errors and horizontal overflow.

---

## 6. Feature map

### Core loop
- **Adaptive onboarding** — 6-step guided setup (goal, body, experience, training, nutrition, practical fit) that builds a personalized week: workouts + meals + macro targets.
- **Today** — the daily command center: workout with exercise demos, meal checklist with real macro totals, quick-log steppers (weight/water/steps/sleep), energy & hunger check-ins, day-completion ring.
- **Plan** — the full adaptive week: per-day meals & workouts, macro blueprint, swap any meal.
- **Progress** — goal trajectory ring, 14-day weight signal chart, adherence score with component breakdown, pattern detection insights, milestones.
- **Weekly review** — 2-minute calibration that adjusts next week's calories/training from real logs.

### AI & intelligence
- **AI Coach** — plan-aware chat grounded in the user's own targets/meals/workouts. OpenAI `gpt-4o-mini` primary with automatic Claude fallback; strict server-side fitness-only guardrail (refuses code/off-topic, typo-tolerant); offline rule-based coach when no key is configured.
- **AI plan personalization** — tone-matched meal notes on plan generation.
- **Digital Twin** — the evidence behind every recommendation: training load, recovery, nutrition signals.
- **Plan Repair** — "life happened" flows: missed workout, travel, low energy, 15-minute day, restaurant meal — one tap re-plans today.

### Capture & tracking
- **Food camera** — photograph a plate (or log manually), review every estimate before saving.
- **Menu scanner** — point at a restaurant menu, get target-fit picks.
- **Voice log** — speak to log weight, water, steps, sleep, meals.
- **Form check** — guided tempo + photo feedback on exercise position.
- **Progress photos** — same-pose daily timeline.
- **Measurements** — waist/hip/chest/arm tracking with trends.
- **Restaurant mode** — compare any dish against your remaining macros.
- **Smart grocery** — costed shopping list generated from the actual week's plan.

### Platform
- **Accounts & sync** — JWT auth, bcrypt passwords, MongoDB cloud state sync, offline-first local storage.
- **Experts & coach dashboard** — connect a human trainer/dietitian/physio; professionals get a client dashboard.
- **Wearables** — device connection surface (steps/sleep import).
- **Reminders** — workout/meal/weigh-in notifications (native).
- **Admin** — user administration for admin-role accounts.

### Design system ("Aurora Depth")
- Animated gradient-mesh aurora backdrop, glass cards, 3D tilt (cursor-follow on web), gradient progress rings, shine sweeps, particle fields, staggered-text reveals, animated gradient borders, route-change "momentum sweep", reduced-motion support throughout. 100% cross-platform — no WebGL, no extra native deps.
