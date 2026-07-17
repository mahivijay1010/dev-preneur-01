import { useRouter } from 'expo-router';
import {
  Camera,
  Check,
  ChevronRight,
  CircleGauge,
  CloudOff,
  Droplets,
  Footprints,
  Minus,
  Moon,
  Plus,
  RefreshCcw,
  ScanLine,
  Sparkles,
  Utensils,
  Weight,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AchievementBurst, Reveal } from '@/components/motion';
import { Button, Card, ProgressRing, Screen } from '@/components/ui';
import { currentWeekday, WEEKDAY_LABEL } from '@/engine/week';
import { todayKey } from '@/services/storage';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { DailyLog } from '@/types';

function Stepper({
  icon,
  label,
  unit,
  value,
  step,
  onChange,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
  accent: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}1F` }]}>{icon}</View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}<Text style={styles.metricUnit}> {unit}</Text></Text>
      </View>
      <View style={styles.stepActions}>
        <Pressable accessibilityLabel={`Decrease ${label}`} style={styles.iconButton} onPress={() => onChange(Math.max(0, value - step))}>
          <Minus size={16} color={colors.text} />
        </Pressable>
        <Pressable accessibilityLabel={`Increase ${label}`} style={styles.iconButton} onPress={() => onChange(value + step)}>
          <Plus size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function Scale({ label, value, onChange }: { label: string; value?: number; onChange: (value: 1 | 2 | 3 | 4 | 5) => void }) {
  return (
    <View style={styles.scaleBlock}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.scaleRow}>
        {([1, 2, 3, 4, 5] as const).map((number) => (
          <Pressable
            key={number}
            onPress={() => onChange(number)}
            style={[styles.scaleButton, value === number && styles.scaleButtonOn]}
          >
            <Text style={[styles.scaleText, value === number && styles.scaleTextOn]}>{number}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Today() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 940;
  const compact = width < 620;
  const { plan, profile, user, updateTodayLog, toggleMealLogged, logs, syncStatus } = useAppStore();
  const [celebrating, setCelebrating] = useState(false);
  const day = currentWeekday();
  const log: DailyLog = logs[todayKey()] ?? { date: todayKey() };
  const workout = useMemo(() => plan?.workouts.find((item) => item.day === day), [day, plan]);
  const meals = useMemo(() => plan?.meals.find((item) => item.day === day), [day, plan]);

  if (!plan || !profile) {
    return (
      <Screen maxWidth={760} contentStyle={styles.emptyState}>
        <Sparkles size={28} color={colors.primary} />
        <Text style={styles.pageTitle}>Your plan is not ready yet.</Text>
        <Text style={styles.pageSub}>Finish onboarding to generate today’s training and meals.</Text>
        <Button label="Finish setup" onPress={() => router.replace('/onboarding')} />
      </Screen>
    );
  }

  const mealsLogged = new Set(log.mealsLogged ?? []);
  const actualMeals = new Map((log.mealEntries ?? []).map((entry) => [entry.slot, entry]));
  const mealProgress = meals?.items.length ? Math.round((mealsLogged.size / meals.items.length) * 100) : 0;
  const workoutCount = workout && !workout.isRest ? workout.exercises.length : 0;
  const readiness = getReadiness(log);
  const dayCompletion = getDayCompletion(log, mealProgress);

  return (
    <>
    <Screen maxWidth={1180} contentStyle={styles.screenContent}>
      <Reveal style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {timeOfDay()}, {firstName(user?.name)}</Text>
          <Text style={styles.pageTitle}>{WEEKDAY_LABEL[day]}’s plan</Text>
          <Text style={styles.pageSub}>{formatDate(new Date())}</Text>
        </View>
        <View style={[styles.syncBadge, syncStatus === 'offline' && styles.syncBadgeOffline]}>
          {syncStatus === 'offline' ? <CloudOff size={14} color={colors.warning} /> : <RefreshCcw size={14} color={colors.success} />}
          <Text style={styles.syncText}>{syncStatus === 'offline' ? 'Saved locally' : syncStatus === 'syncing' ? 'Saving' : 'Up to date'}</Text>
        </View>
      </Reveal>

      <Reveal delay={60} style={styles.summaryHero}>
        <View style={[styles.summaryBand, !wide && styles.summaryBandStack]}>
          <Image
            source={require('../../assets/images/today-lunge-v3.png')}
            resizeMode="cover"
            style={[styles.summaryBandImage, !wide && styles.summaryBandImageNarrow]}
          />
          <View style={[styles.summaryContent, !wide && styles.summaryContentNarrow]}>
            <View style={[styles.summaryMain, !wide && styles.summaryMainNarrow]}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryEyebrow}>TODAY’S TARGET</Text>
                <Text style={styles.summaryTitle}>{workout?.focus ?? 'Recovery and consistency'}</Text>
                <Text style={styles.summaryBody}>
                  {workout?.isRest ? 'A lighter day is part of the plan. A short walk and regular meals are enough.' : `${workoutCount} exercises selected for your ${profile.location} setup.`}
                </Text>
                <View style={styles.sessionRoute}>
                  <View style={styles.sessionRouteLine} />
                  <Text style={styles.sessionRouteText}>{workout?.isRest ? 'RECOVER · RESET · RETURN' : 'WARM UP · BUILD · FINISH'}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.summaryStats, !wide && styles.summaryStatsNarrow]}>
              <ProgressRing progress={dayCompletion} value={`${dayCompletion}%`} label="day done" size={88} />
              <SummaryStat value={`${plan.macros.calorieRange[0]}–${plan.macros.calorieRange[1]}`} label="kcal range" />
              <SummaryStat value={`${plan.macros.proteinG}g`} label="protein" accent={colors.peach} />
              <SummaryStat value={readiness.label} label="readiness" accent={readiness.color} />
            </View>
          </View>
        </View>
      </Reveal>

      <Pressable style={styles.repairBanner} onPress={() => router.push('/repair')}>
        <View style={styles.repairIcon}><RefreshCcw size={19} color={colors.primary} /></View>
        <View style={styles.repairCopy}>
          <Text style={styles.repairTitle}>Need to change today’s plan?</Text>
          <Text style={styles.repairSub}>Adjust around travel, low energy, missed meals, or limited time.</Text>
        </View>
        <ChevronRight size={20} color={colors.textDim} />
      </Pressable>

      <View style={[styles.columns, !wide && styles.columnsStack]}>
        <View style={styles.mainColumn}>
          <Card style={styles.workoutCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>MOVEMENT</Text>
                <Text style={styles.cardTitle}>Today’s workout</Text>
              </View>
              <View style={styles.metaBadge}><Text style={styles.metaBadgeText}>{workout?.isRest ? 'Recovery' : `${workoutCount} exercises`}</Text></View>
            </View>

            <View style={styles.exerciseList}>
              {workout && !workout.isRest ? workout.exercises.map((exercise, index) => (
                <View key={exercise.exerciseId} style={styles.exerciseRow}>
                  <View style={styles.exerciseNumber}><Text style={styles.exerciseNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                  <View style={styles.exerciseCopy}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>{exercise.sets} sets × {exercise.reps} reps</Text>
                  </View>
                </View>
              )) : (
                <View style={styles.restState}>
                  <Moon size={22} color={colors.accent} />
                  <Text style={styles.exerciseName}>Active recovery</Text>
                  <Text style={styles.exerciseMeta}>Take a walk, stretch, and protect your next training day.</Text>
                </View>
              )}
            </View>

            <View style={[styles.workoutActions, compact && styles.workoutActionsCompact]}>
              <Button
                label={log.workoutCompleted ? 'Workout completed' : 'Mark complete'}
                variant={log.workoutCompleted ? 'secondary' : 'primary'}
                icon={<Check size={18} color={log.workoutCompleted ? colors.black : colors.black} />}
                onPress={() => {
                  const completed = !log.workoutCompleted;
                  updateTodayLog({ workoutCompleted: completed });
                  if (completed) setCelebrating(true);
                }}
                style={styles.flexButton}
              />
              <Pressable accessibilityLabel="Check exercise form" style={styles.formButton} onPress={() => router.push('/form-check')}>
                <ScanLine size={19} color={colors.text} />
                <Text style={styles.formButtonText}>Check form</Text>
              </Pressable>
            </View>
          </Card>

          <Card>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>NUTRITION</Text>
                <Text style={styles.cardTitle}>Meals for today</Text>
              </View>
              <Pressable accessibilityLabel="Log meal with camera" style={styles.iconCommand} onPress={() => router.push('/food-camera')}>
                <Camera size={18} color={colors.primary} />
                <Text style={styles.iconCommandText}>Log meal</Text>
              </Pressable>
            </View>

            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${mealProgress}%` }]} /></View>
            <Text style={styles.progressCaption}>{mealsLogged.size} of {meals?.items.length ?? 0} meals logged</Text>

            <View style={styles.mealList}>
              {meals?.items.map((meal) => {
                const checked = mealsLogged.has(meal.slot);
                const actual = actualMeals.get(meal.slot);
                const displayed = actual ?? meal;
                return (
                  <Pressable key={meal.slot} style={[styles.mealRow, checked && styles.mealRowLogged]} onPress={() => toggleMealLogged(meal.slot)}>
                    <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
                      {checked ? <Check size={15} color={colors.black} strokeWidth={3} /> : null}
                    </View>
                    <View style={styles.mealCopy}>
                      <View style={styles.mealMetaRow}>
                        <Text style={styles.mealSlot}>{meal.slot}</Text>
                        {actual ? (
                          <View style={styles.actualBadge}>
                            <Camera size={11} color={colors.accent} />
                            <Text style={styles.actualBadgeText}>{actual.source === 'camera' ? 'PHOTO LOG' : 'CUSTOM LOG'}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.mealName, checked && styles.mealNameDone]}>{displayed.name}</Text>
                      {actual ? <Text style={styles.plannedMeal}>Planned: {meal.name}</Text> : null}
                    </View>
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealCalories}>{displayed.calories} kcal</Text>
                      <Text style={styles.mealProtein}>{displayed.proteinG}g protein</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </View>

        <View style={styles.sideColumn}>
          <Card>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>QUICK LOG</Text>
                <Text style={styles.cardTitle}>Daily signals</Text>
              </View>
              <CircleGauge size={21} color={colors.primary} />
            </View>
            <Stepper icon={<Weight size={18} color={colors.primary} />} label="Weight" unit="kg" step={0.1} value={round1(log.weightKg ?? profile.currentWeightKg)} onChange={(value) => updateTodayLog({ weightKg: round1(value) })} accent={colors.primary} />
            <Stepper icon={<Droplets size={18} color={colors.accent} />} label="Water" unit="ml" step={250} value={log.waterMl ?? 0} onChange={(value) => updateTodayLog({ waterMl: value })} accent={colors.accent} />
            <Stepper icon={<Footprints size={18} color={colors.success} />} label="Steps" unit="" step={500} value={log.steps ?? 0} onChange={(value) => updateTodayLog({ steps: value })} accent={colors.success} />
            <Stepper icon={<Moon size={18} color={colors.warning} />} label="Sleep" unit="h" step={0.5} value={round1(log.sleepHours ?? 0)} onChange={(value) => updateTodayLog({ sleepHours: round1(value) })} accent={colors.warning} />
          </Card>

          <Card>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>CHECK-IN</Text>
                <Text style={styles.cardTitle}>How do you feel?</Text>
              </View>
              <Sparkles size={20} color={colors.peach} />
            </View>
            <Scale label="Energy" value={log.energy} onChange={(value) => updateTodayLog({ energy: value })} />
            <Scale label="Hunger" value={log.hunger} onChange={(value) => updateTodayLog({ hunger: value })} />
          </Card>

          <Pressable style={styles.restaurantButton} onPress={() => router.push('/restaurant')}>
            <View style={styles.restaurantIcon}><Utensils size={20} color={colors.black} /></View>
            <View style={styles.restaurantCopy}>
              <Text style={styles.restaurantTitle}>Eating out?</Text>
              <Text style={styles.restaurantSub}>Compare a restaurant dish with your target.</Text>
            </View>
            <ChevronRight size={19} color={colors.textDim} />
          </Pressable>
        </View>
      </View>
    </Screen>
    <AchievementBurst
      visible={celebrating}
      title="Workout locked in"
      detail="+120 MOMENTUM"
      onFinished={() => setCelebrating(false)}
    />
    </>
  );
}

function SummaryStat({ value, label, accent = colors.primary }: { value: string; label: string; accent?: string }) {
  return (
    <View style={styles.summaryStat}>
      <View style={[styles.summaryMarker, { backgroundColor: accent }]} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function getReadiness(log: DailyLog) {
  if (!log.energy && !log.sleepHours) return { label: 'Baseline', color: colors.accent };
  const score = (log.energy ?? 3) + Math.min(5, (log.sleepHours ?? 7) / 1.5);
  if (score >= 8) return { label: 'Strong', color: colors.success };
  if (score >= 6) return { label: 'Steady', color: colors.warning };
  return { label: 'Low', color: colors.peach };
}

function getDayCompletion(log: DailyLog, mealProgress: number) {
  const workout = log.workoutCompleted ? 35 : 0;
  const meals = Math.round(mealProgress * 0.4);
  const signals = [log.waterMl, log.steps, log.sleepHours, log.energy, log.hunger].filter((value) => value !== undefined).length;
  return Math.min(100, workout + meals + signals * 5);
}

function round1(value: number) { return Math.round(value * 10) / 10; }
function firstName(name?: string) { return name?.trim().split(/\s+/)[0] || 'there'; }
function timeOfDay() { const hour = new Date().getHours(); return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'; }
function formatDate(date: Date) { return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }); }

const styles = StyleSheet.create({
  screenContent: { gap: spacing.lg },
  emptyState: { paddingTop: spacing.xxl, alignItems: 'flex-start' },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  greeting: { color: colors.primary, fontSize: font.small, fontWeight: '700', marginBottom: 3 },
  pageTitle: { color: colors.text, fontSize: font.h1, lineHeight: 36, fontWeight: '800' },
  pageSub: { color: colors.textDim, fontSize: font.small, marginTop: 4 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.md, backgroundColor: '#17271E', borderWidth: 1, borderColor: '#31533E' },
  syncBadgeOffline: { backgroundColor: '#2B2516', borderColor: '#5A4B22' },
  syncText: { color: colors.textDim, fontSize: font.tiny, fontWeight: '700' },
  summaryHero: { minHeight: 350, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.black },
  summaryBand: { flex: 1, minHeight: 350, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.black },
  summaryBandImage: { position: 'absolute', top: 0, right: 0, width: '52%', height: '100%', opacity: 0.9, borderTopRightRadius: radius.md, borderBottomRightRadius: radius.md },
  summaryBandImageNarrow: { width: '100%', height: 235, borderBottomRightRadius: 0 },
  summaryBandStack: { minHeight: 610, justifyContent: 'flex-end' },
  summaryContent: { width: '64%', gap: spacing.lg, zIndex: 1 },
  summaryContentNarrow: { width: '100%', paddingTop: 238 },
  summaryMain: { minWidth: 280, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryMainNarrow: { minWidth: 0, width: '100%' },
  summaryCopy: { flex: 1, gap: 5, zIndex: 1 },
  summaryEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.1 },
  summaryTitle: { color: colors.text, fontSize: font.h1, lineHeight: 36, fontWeight: '900', textTransform: 'capitalize', maxWidth: 460 },
  summaryBody: { color: '#DDE2DA', fontSize: font.small, lineHeight: 20, maxWidth: 430 },
  sessionRoute: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  sessionRouteLine: { width: 42, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  sessionRouteText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  summaryStats: { maxWidth: 500, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, backgroundColor: 'rgba(9,10,9,0.78)' },
  summaryStatsNarrow: { width: '100%', maxWidth: '100%', justifyContent: 'space-between', gap: spacing.sm },
  summaryStat: { minWidth: 92, gap: 3 },
  summaryMarker: { width: 22, height: 3, borderRadius: 2, marginBottom: 5 },
  summaryValue: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  summaryLabel: { color: colors.textMuted, fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.7 },
  repairBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#506328', backgroundColor: '#20291A' },
  repairIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  repairCopy: { flex: 1, gap: 2 },
  repairTitle: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  repairSub: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  columnsStack: { flexDirection: 'column' },
  mainColumn: { flex: 1.28, width: '100%', gap: spacing.md },
  sideColumn: { flex: 0.72, width: '100%', gap: spacing.md },
  workoutCard: { backgroundColor: colors.bgElevated },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  cardEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: 2 },
  metaBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  metaBadgeText: { color: colors.textDim, fontSize: font.tiny, fontWeight: '700' },
  exerciseList: { gap: 0 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 62, borderTopWidth: 1, borderTopColor: colors.border },
  exerciseNumber: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  exerciseNumberText: { color: colors.primary, fontSize: font.tiny, fontWeight: '800' },
  exerciseCopy: { flex: 1, gap: 2 },
  exerciseName: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  exerciseMeta: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  restState: { alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  workoutActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  workoutActionsCompact: { flexDirection: 'column' },
  flexButton: { flex: 1 },
  formButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  formButtonText: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  iconCommand: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  iconCommandText: { color: colors.primary, fontSize: font.tiny, fontWeight: '800' },
  progressTrack: { height: 5, backgroundColor: colors.surfaceMuted, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  progressCaption: { color: colors.textMuted, fontSize: font.tiny },
  mealList: { marginTop: spacing.xs },
  mealRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.md },
  mealRowLogged: { backgroundColor: colors.successDim },
  checkBox: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: colors.success, borderColor: colors.success },
  mealCopy: { flex: 1, gap: 3 },
  mealMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  mealSlot: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  actualBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.accentDim },
  actualBadgeText: { color: colors.accent, fontSize: 8, fontWeight: '900' },
  mealName: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  mealNameDone: { color: colors.text },
  plannedMeal: { color: colors.textMuted, fontSize: font.tiny },
  mealMacros: { alignItems: 'flex-end', gap: 2 },
  mealCalories: { color: colors.text, fontSize: font.tiny, fontWeight: '700' },
  mealProtein: { color: colors.peach, fontSize: font.tiny },
  stepRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metricIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  metricCopy: { flex: 1, gap: 1 },
  metricLabel: { color: colors.textDim, fontSize: font.tiny, fontWeight: '700' },
  metricValue: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  metricUnit: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600' },
  stepActions: { flexDirection: 'row', gap: 6 },
  iconButton: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  scaleBlock: { gap: spacing.sm, paddingTop: spacing.sm },
  scaleRow: { flexDirection: 'row', gap: 6 },
  scaleButton: { flex: 1, minWidth: 34, height: 38, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  scaleButtonOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleText: { color: colors.textDim, fontSize: font.small, fontWeight: '700' },
  scaleTextOn: { color: colors.black },
  restaurantButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  restaurantIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  restaurantCopy: { flex: 1, gap: 2 },
  restaurantTitle: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  restaurantSub: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
});
