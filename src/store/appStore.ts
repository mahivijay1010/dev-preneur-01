// Single persisted zustand store holding all Phase 1 client state:
// auth, onboarding profile, generated plan, and daily logs. Persisted to
// AsyncStorage so the app is fully offline and survives restarts.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { applyAdjustment, decideAdjustment } from '../engine/adjustments';
import { generateBasePlan } from '../engine/generatePlan';
import { personalizePlan } from '../services/claude';
import { todayKey, zustandStorage } from '../services/storage';
import type {
  Adjustment,
  CoachMessage,
  CoachTone,
  DailyLog,
  FoodInfo,
  Measurement,
  MealItem,
  OnboardingProfile,
  Plan,
  User,
  WeeklyReview,
  Weekday,
} from '../types';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

interface AppState {
  hydrated: boolean;
  user: User | null;
  profile: OnboardingProfile | null;
  plan: Plan | null;
  logs: Record<string, DailyLog>; // keyed by YYYY-MM-DD
  generating: boolean;

  // Phase 2 — adaptive coaching
  reviews: WeeklyReview[];
  adjustments: Adjustment[];
  chat: CoachMessage[];

  // Phase 3 — local food & lifestyle
  ownedIngredients: string[];

  // Phase 4 — retention & behaviour change
  measurements: Record<string, Measurement>; // keyed by YYYY-MM-DD
  repairsCompleted: number;

  // auth
  signIn: (email: string, name: string, provider: User['provider']) => void;
  acceptConsent: () => void;
  signOut: () => void;

  // onboarding + plan
  setProfile: (p: OnboardingProfile) => void;
  generatePlan: () => Promise<void>;
  regenerate: () => Promise<void>;

  // tracking
  updateTodayLog: (patch: Partial<DailyLog>) => void;
  getLog: (date: string) => DailyLog | undefined;

  // Phase 2 actions
  submitWeeklyReview: (
    review: Omit<WeeklyReview, 'id' | 'createdAt'>,
  ) => Adjustment | null;
  addChatMessage: (msg: Omit<CoachMessage, 'id' | 'createdAt'>) => void;

  // Phase 3 actions
  updateLocalPreferences: (
    patch: Pick<OnboardingProfile, 'region' | 'city' | 'religion' | 'cookingSkill'>,
  ) => Promise<void>;
  replaceMeal: (day: Weekday, slot: MealItem['slot'], food: FoodInfo) => void;
  setOwnedIngredients: (list: string[]) => void;

  // Phase 4 actions
  saveMeasurement: (m: Measurement) => void;
  recordRepairCompleted: () => void;
  setCoachTone: (tone: CoachTone) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      user: null,
      profile: null,
      plan: null,
      logs: {},
      generating: false,
      reviews: [],
      adjustments: [],
      chat: [],
      ownedIngredients: [],
      measurements: {},
      repairsCompleted: 0,

      signIn: (email, name, provider) => {
        // Demo auth: any credentials create/return a local user.
        const isAdmin = email.trim().toLowerCase().startsWith('admin@');
        set({
          user: {
            id: uid('u'),
            email: email.trim(),
            name: name.trim() || email.split('@')[0],
            provider,
            role: isAdmin ? 'admin' : 'user',
            consentAcceptedAt: null,
            createdAt: new Date().toISOString(),
          },
        });
      },

      acceptConsent: () => {
        const u = get().user;
        if (!u) return;
        set({ user: { ...u, consentAcceptedAt: new Date().toISOString() } });
      },

      signOut: () =>
        set({
          user: null,
          profile: null,
          plan: null,
          logs: {},
          reviews: [],
          adjustments: [],
          chat: [],
          ownedIngredients: [],
          measurements: {},
          repairsCompleted: 0,
        }),

      setProfile: (p) => set({ profile: p }),

      generatePlan: async () => {
        const p = get().profile;
        if (!p) return;
        set({ generating: true });
        try {
          const base = generateBasePlan(p, uid('plan'), new Date().toISOString());
          const finished = await personalizePlan(base, p);
          set({ plan: finished });
        } finally {
          set({ generating: false });
        }
      },

      regenerate: async () => {
        await get().generatePlan();
      },

      updateTodayLog: (patch) => {
        const key = todayKey();
        const existing = get().logs[key] ?? { date: key };
        set({ logs: { ...get().logs, [key]: { ...existing, ...patch } } });
      },

      getLog: (date) => get().logs[date],

      submitWeeklyReview: (input) => {
        const { profile, plan } = get();
        const review: WeeklyReview = {
          ...input,
          id: uid('rev'),
          createdAt: new Date().toISOString(),
        };
        const reviews = [...get().reviews, review];
        set({ reviews });

        if (!profile || !plan) return null;
        // Compute and apply a conservative adjustment from the full review history.
        const decision = decideAdjustment(profile, plan, reviews);
        const { plan: nextPlan, adjustment } = applyAdjustment(
          plan,
          decision,
          review.id,
          uid('adj'),
          new Date().toISOString(),
        );
        set({ plan: nextPlan, adjustments: [...get().adjustments, adjustment] });
        return adjustment;
      },

      addChatMessage: (msg) =>
        set({
          chat: [
            ...get().chat,
            { ...msg, id: uid('msg'), createdAt: new Date().toISOString() },
          ],
        }),

      updateLocalPreferences: async (patch) => {
        const current = get().profile;
        if (!current) return;
        set({ profile: { ...current, ...patch } });
        // Regenerate the plan so meals reflect the new region/religion/etc.
        await get().generatePlan();
      },

      replaceMeal: (day, slot, food) => {
        const plan = get().plan;
        if (!plan) return;
        const meals = plan.meals.map((d) =>
          d.day !== day
            ? d
            : {
                ...d,
                items: d.items.map((it) =>
                  it.slot !== slot
                    ? it
                    : {
                        slot: food.slot,
                        name: food.name,
                        calories: food.calories,
                        proteinG: food.proteinG,
                        foodId: food.id,
                      },
                ),
              },
        );
        set({ plan: { ...plan, meals } });
      },

      setOwnedIngredients: (list) => set({ ownedIngredients: list }),

      saveMeasurement: (m) =>
        set({ measurements: { ...get().measurements, [m.date]: { ...get().measurements[m.date], ...m } } }),

      recordRepairCompleted: () =>
        set({ repairsCompleted: get().repairsCompleted + 1 }),

      setCoachTone: (tone) => {
        const p = get().profile;
        if (!p) return;
        set({ profile: { ...p, coachTone: tone } });
      },
    }),
    {
      name: 'fitplan-store-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        user: s.user,
        profile: s.profile,
        plan: s.plan,
        logs: s.logs,
        reviews: s.reviews,
        adjustments: s.adjustments,
        chat: s.chat,
        ownedIngredients: s.ownedIngredients,
        measurements: s.measurements,
        repairsCompleted: s.repairsCompleted,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark hydrated so the router can gate on real state, not the initial blank.
        useAppStore.setState({ hydrated: true });
        void state;
      },
    },
  ),
);
