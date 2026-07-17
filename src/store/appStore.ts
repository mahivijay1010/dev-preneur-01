// The store keeps an offline cache and synchronizes user-owned data to the API.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EXPERTS, expertReply, generatePlanReview } from '../data/experts';
import { applyAdjustment, decideAdjustment } from '../engine/adjustments';
import { generateBasePlan } from '../engine/generatePlan';
import { computeMacros } from '../engine/nutrition';
import { currentWeekday } from '../engine/week';
import { personalizePlan } from '../services/claude';
import { ApiError, authApi, setApiToken, type CloudState } from '../services/api';
import { todayKey, zustandStorage } from '../services/storage';
import { mergeImportIntoLogs, simulateImport } from '../services/wearables';
import { DEFAULT_REMINDERS, type ReminderPrefs } from '../services/notifications';
import type {
  Adjustment,
  CoachMessage,
  CoachTone,
  DailyLog,
  FoodInfo,
  LoggedMeal,
  Measurement,
  MealItem,
  OnboardingProfile,
  Plan,
  ExpertMessage,
  PlanReview,
  ProgressPhoto,
  RestaurantHistoryItem,
  TwinAdjustment,
  User,
  WeeklyReview,
  WearableId,
  Weekday,
} from '../types';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const EMPTY_USER_DATA = {
  profile: null,
  plan: null,
  logs: {},
  reviews: [],
  adjustments: [],
  chat: [],
  ownedIngredients: [],
  measurements: {},
  repairsCompleted: 0,
  progressPhotos: [],
  reminderPrefs: DEFAULT_REMINDERS,
  restaurantHistory: [],
  connectedWearables: [],
  assignedExpertId: null,
  expertMessages: [],
  planReviews: [],
};

interface AppState {
  hydrated: boolean;
  sessionReady: boolean;
  authToken: string | null;
  authLoading: boolean;
  authError: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline';
  lastSyncedAt: string | null;
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

  // Phase 5 — camera & sensor features
  progressPhotos: ProgressPhoto[];
  reminderPrefs: ReminderPrefs;
  restaurantHistory: RestaurantHistoryItem[];

  // Phase 6 — integrations & professional support
  connectedWearables: WearableId[];
  assignedExpertId: string | null;
  expertMessages: ExpertMessage[];
  planReviews: PlanReview[];

  // auth
  register: (name: string, email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  bootstrapSession: () => Promise<void>;
  clearAuthError: () => void;
  acceptConsent: () => Promise<boolean>;
  signOut: () => void;
  syncNow: () => Promise<void>;

  // onboarding + plan
  setProfile: (p: OnboardingProfile) => void;
  generatePlan: () => Promise<void>;
  regenerate: () => Promise<void>;

  // tracking
  updateTodayLog: (patch: Partial<DailyLog>) => void;
  toggleMealLogged: (slot: MealItem['slot']) => void;
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
  setProteinPerKgOverride: (value: number | undefined) => void;

  // Phase 5 actions
  addProgressPhoto: (photo: Omit<ProgressPhoto, 'id'>) => void;
  removeProgressPhoto: (id: string) => void;
  logPhotoMeal: (meal: Omit<LoggedMeal, 'id' | 'loggedAt'>) => void;
  setReminderPrefs: (prefs: ReminderPrefs) => void;
  addRestaurantEvaluation: (evaluation: Omit<RestaurantHistoryItem, 'id' | 'createdAt'>) => void;

  // Phase 7 actions
  applyTwinAdjustment: (rec: TwinAdjustment) => Adjustment | null;

  // Phase 6 actions
  connectWearable: (id: WearableId) => number; // returns days imported
  disconnectWearable: (id: WearableId) => void;
  assignExpert: (expertId: string) => void;
  sendExpertMessage: (text: string) => void;
  requestPlanReview: () => PlanReview | null;
}

function cloudStatePatch(state: CloudState): Partial<AppState> {
  return {
    profile: (state.profile as OnboardingProfile | null | undefined) ?? null,
    plan: (state.plan as Plan | null | undefined) ?? null,
    logs: (state.logs as Record<string, DailyLog> | undefined) ?? {},
    reviews: (state.reviews as WeeklyReview[] | undefined) ?? [],
    adjustments: (state.adjustments as Adjustment[] | undefined) ?? [],
    chat: (state.chat as CoachMessage[] | undefined) ?? [],
    ownedIngredients: (state.ownedIngredients as string[] | undefined) ?? [],
    measurements: (state.measurements as Record<string, Measurement> | undefined) ?? {},
    repairsCompleted: (state.repairsCompleted as number | undefined) ?? 0,
    progressPhotos: (state.progressPhotos as ProgressPhoto[] | undefined) ?? [],
    reminderPrefs: (state.reminderPrefs as ReminderPrefs | undefined) ?? DEFAULT_REMINDERS,
    restaurantHistory: (state.restaurantHistory as RestaurantHistoryItem[] | undefined) ?? [],
    connectedWearables: (state.connectedWearables as WearableId[] | undefined) ?? [],
    assignedExpertId: (state.assignedExpertId as string | null | undefined) ?? null,
    expertMessages: (state.expertMessages as ExpertMessage[] | undefined) ?? [],
    planReviews: (state.planReviews as PlanReview[] | undefined) ?? [],
  };
}

function cloudStateFromStore(state: AppState): CloudState {
  return {
    profile: state.profile,
    plan: state.plan,
    logs: state.logs,
    reviews: state.reviews,
    adjustments: state.adjustments,
    chat: state.chat,
    ownedIngredients: state.ownedIngredients,
    measurements: state.measurements,
    repairsCompleted: state.repairsCompleted,
    progressPhotos: state.progressPhotos,
    reminderPrefs: state.reminderPrefs,
    restaurantHistory: state.restaurantHistory,
    connectedWearables: state.connectedWearables,
    assignedExpertId: state.assignedExpertId,
    expertMessages: state.expertMessages,
    planReviews: state.planReviews,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      sessionReady: false,
      authToken: null,
      authLoading: false,
      authError: null,
      syncStatus: 'idle',
      lastSyncedAt: null,
      user: null,
      ...EMPTY_USER_DATA,
      generating: false,

      register: async (name, email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const session = await authApi.register(name.trim(), email.trim(), password);
          setApiToken(session.token);
          set({
            ...EMPTY_USER_DATA,
            ...cloudStatePatch(session.state),
            user: session.user,
            authToken: session.token,
            authLoading: false,
            authError: null,
            sessionReady: true,
            syncStatus: 'synced',
          });
          return true;
        } catch (error) {
          set({ authLoading: false, authError: errorMessage(error) });
          return false;
        }
      },

      signIn: async (email, password) => {
        set({ authLoading: true, authError: null });
        try {
          const session = await authApi.login(email.trim(), password);
          setApiToken(session.token);
          set({
            ...EMPTY_USER_DATA,
            ...cloudStatePatch(session.state),
            user: session.user,
            authToken: session.token,
            authLoading: false,
            authError: null,
            sessionReady: true,
            syncStatus: 'synced',
          });
          return true;
        } catch (error) {
          set({ authLoading: false, authError: errorMessage(error) });
          return false;
        }
      },

      bootstrapSession: async () => {
        const token = get().authToken;
        if (!token) {
          set({ user: null, sessionReady: true });
          return;
        }

        setApiToken(token);
        try {
          const [{ user }, { state }] = await Promise.all([
            authApi.me(token),
            authApi.loadState(token),
          ]);
          set({
            ...cloudStatePatch(state),
            user,
            sessionReady: true,
            syncStatus: 'synced',
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            setApiToken(null);
            set({
              ...EMPTY_USER_DATA,
              user: null,
              authToken: null,
              sessionReady: true,
              syncStatus: 'idle',
            });
            return;
          }
          // Preserve the last valid local cache when the network is unavailable.
          set({ sessionReady: true, syncStatus: 'offline' });
        }
      },

      clearAuthError: () => set({ authError: null }),

      acceptConsent: async () => {
        const { user, authToken } = get();
        if (!user || !authToken) return false;
        set({ authLoading: true, authError: null });
        try {
          const response = await authApi.acceptConsent(authToken);
          set({ user: response.user, authLoading: false, syncStatus: 'synced' });
          return true;
        } catch (error) {
          set({ authLoading: false, authError: errorMessage(error), syncStatus: 'offline' });
          return false;
        }
      },

      signOut: () => {
        setApiToken(null);
        set({
          ...EMPTY_USER_DATA,
          user: null,
          authToken: null,
          authError: null,
          authLoading: false,
          syncStatus: 'idle',
          lastSyncedAt: null,
        });
      },

      syncNow: async () => {
        const { authToken, user } = get();
        if (!authToken || !user) return;
        set({ syncStatus: 'syncing' });
        try {
          const response = await authApi.saveState(authToken, cloudStateFromStore(get()));
          set({ syncStatus: 'synced', lastSyncedAt: response.savedAt });
        } catch {
          set({ syncStatus: 'offline' });
        }
      },

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

      toggleMealLogged: (slot) => {
        const key = todayKey();
        const existing = get().logs[key] ?? { date: key };
        const logged = new Set(existing.mealsLogged ?? []);
        const removing = logged.has(slot);
        removing ? logged.delete(slot) : logged.add(slot);
        const mealEntries = removing
          ? (existing.mealEntries ?? []).filter((entry) => entry.slot !== slot)
          : existing.mealEntries ?? [];
        const next: DailyLog = {
          ...existing,
          mealsLogged: [...logged],
          mealEntries,
        };
        next.proteinG = calculateDailyProtein(next, get().plan);
        set({ logs: { ...get().logs, [key]: next } });
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

      setProteinPerKgOverride: (value) => {
        const p = get().profile;
        if (!p) return;
        const profile = { ...p, proteinPerKgOverride: value };
        // Recompute macros so the protein target updates everywhere without
        // rebuilding meals/workouts (only the numbers depend on this).
        const plan = get().plan;
        set(plan ? { profile, plan: { ...plan, macros: computeMacros(profile) } } : { profile });
      },

      addProgressPhoto: (photo) =>
        set({ progressPhotos: [...get().progressPhotos, { ...photo, id: uid('photo') }] }),

      removeProgressPhoto: (id) =>
        set({ progressPhotos: get().progressPhotos.filter((p) => p.id !== id) }),

      logPhotoMeal: (meal) => {
        const key = todayKey();
        const existing = get().logs[key] ?? { date: key };
        const entry: LoggedMeal = {
          ...meal,
          id: uid('meal'),
          loggedAt: new Date().toISOString(),
        };
        const mealEntries = [
          ...(existing.mealEntries ?? []).filter((item) => item.slot !== meal.slot),
          entry,
        ];
        const mealsLogged = [...new Set([...(existing.mealsLogged ?? []), meal.slot])];
        const next: DailyLog = { ...existing, mealsLogged, mealEntries };
        next.proteinG = calculateDailyProtein(next, get().plan);
        set({
          logs: {
            ...get().logs,
            [key]: next,
          },
        });
      },

      setReminderPrefs: (reminderPrefs) => set({ reminderPrefs }),

      addRestaurantEvaluation: (evaluation) =>
        set({
          restaurantHistory: [
            { ...evaluation, id: uid('dish'), createdAt: new Date().toISOString() },
            ...get().restaurantHistory,
          ].slice(0, 12),
        }),

      applyTwinAdjustment: (rec) => {
        const plan = get().plan;
        if (!plan || rec.calorieDelta === 0) return null;
        const { plan: nextPlan, adjustment } = applyAdjustment(
          plan,
          { calorieDelta: rec.calorieDelta, changes: [rec.explanation, ...rec.factors] },
          'digital-twin',
          uid('adj'),
          new Date().toISOString(),
        );
        set({ plan: nextPlan, adjustments: [...get().adjustments, adjustment] });
        return adjustment;
      },

      connectWearable: (id) => {
        if (!get().connectedWearables.includes(id)) {
          set({ connectedWearables: [...get().connectedWearables, id] });
        }
        // Only the simulated provider can actually import in this build.
        if (id !== 'simulated') return 0;
        const baseline = get().profile?.currentWeightKg ?? 75;
        const imported = simulateImport(14, baseline);
        set({ logs: mergeImportIntoLogs(get().logs, imported) });
        return imported.length;
      },

      disconnectWearable: (id) =>
        set({ connectedWearables: get().connectedWearables.filter((w) => w !== id) }),

      assignExpert: (expertId) => {
        set({ assignedExpertId: expertId });
        const expert = EXPERTS.find((e) => e.id === expertId);
        if (expert && get().expertMessages.length === 0) {
          set({
            expertMessages: [
              {
                id: uid('em'),
                from: 'expert',
                text: `Hi, I\'m ${expert.name}. I\'ll be supporting you as your ${expert.kind}. How can I help?`,
                createdAt: new Date().toISOString(),
              },
            ],
          });
        }
      },

      sendExpertMessage: (text) => {
        const expert = EXPERTS.find((e) => e.id === get().assignedExpertId);
        if (!expert) return;
        const now = new Date().toISOString();
        const userMsg: ExpertMessage = { id: uid('em'), from: 'user', text, createdAt: now };
        const reply: ExpertMessage = {
          id: uid('em'),
          from: 'expert',
          text: expertReply(expert, text),
          createdAt: now,
        };
        set({ expertMessages: [...get().expertMessages, userMsg, reply] });
      },

      requestPlanReview: () => {
        const { profile, plan, reviews, assignedExpertId } = get();
        const expert = EXPERTS.find((e) => e.id === assignedExpertId);
        if (!expert || !profile || !plan) return null;
        const review = generatePlanReview(
          expert,
          profile,
          plan,
          reviews,
          uid('pr'),
          new Date().toISOString(),
        );
        set({ planReviews: [...get().planReviews, review] });
        return review;
      },
    }),
    {
      name: 'fitplan-store-v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        authToken: s.authToken,
        lastSyncedAt: s.lastSyncedAt,
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
        progressPhotos: s.progressPhotos,
        reminderPrefs: s.reminderPrefs,
        restaurantHistory: s.restaurantHistory,
        connectedWearables: s.connectedWearables,
        assignedExpertId: s.assignedExpertId,
        expertMessages: s.expertMessages,
        planReviews: s.planReviews,
      }),
      onRehydrateStorage: () => (state) => {
        useAppStore.setState({ hydrated: true });
        void state;
      },
    },
  ),
);

function calculateDailyProtein(log: DailyLog, plan: Plan | null): number {
  const entries = new Map((log.mealEntries ?? []).map((entry) => [entry.slot, entry]));
  const planned = new Map(
    (plan?.meals.find((day) => day.day === currentWeekday())?.items ?? []).map((meal) => [meal.slot, meal]),
  );
  return (log.mealsLogged ?? []).reduce((total, slot) => {
    const actual = entries.get(slot as MealItem['slot']);
    const fallback = planned.get(slot as MealItem['slot']);
    return total + (actual?.proteinG ?? fallback?.proteinG ?? 0);
  }, 0);
}

const CLOUD_FIELDS: (keyof AppState)[] = [
  'profile',
  'plan',
  'logs',
  'reviews',
  'adjustments',
  'chat',
  'ownedIngredients',
  'measurements',
  'repairsCompleted',
  'progressPhotos',
  'reminderPrefs',
  'restaurantHistory',
  'connectedWearables',
  'assignedExpertId',
  'expertMessages',
  'planReviews',
];

let syncTimer: ReturnType<typeof setTimeout> | null = null;
useAppStore.subscribe((state, previous) => {
  if (!state.hydrated || !state.sessionReady || !state.authToken || !state.user) return;
  if (!CLOUD_FIELDS.some((key) => state[key] !== previous[key])) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void useAppStore.getState().syncNow();
  }, 700);
});
