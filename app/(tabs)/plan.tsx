import { useRouter } from 'expo-router';
import {
  CalendarDays,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  Flame,
  MapPin,
  RefreshCw,
  Salad,
  ShoppingBasket,
  Sparkles,
  Utensils,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card, PageHeader, ProgressRing, Screen, StatusPill } from '@/components/ui';
import { currentWeekday, WEEKDAY_LABEL } from '@/engine/week';
import { isAIEnabled } from '@/services/claude';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { Weekday } from '@/types';

type PlanTab = 'meals' | 'workouts' | 'nutrition';

export default function PlanScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const { plan, profile } = useAppStore();
  const [tab, setTab] = useState<PlanTab>('meals');
  const [day, setDay] = useState<Weekday>(currentWeekday());
  const [openEx, setOpenEx] = useState<string | null>(null);

  const dayMeals = useMemo(() => plan?.meals.find((item) => item.day === day), [day, plan]);
  const workout = useMemo(() => plan?.workouts.find((item) => item.day === day), [day, plan]);
  const totals = useMemo(() => dayMeals?.items.reduce(
    (sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.proteinG }),
    { calories: 0, protein: 0 },
  ) ?? { calories: 0, protein: 0 }, [dayMeals]);

  if (!plan) {
    return (
      <Screen>
        <PageHeader title="Your plan" subtitle="Finish onboarding to generate a plan around your routine." />
      </Screen>
    );
  }

  const regionLabel = profile?.region === 'north_india'
    ? 'North Indian'
    : profile?.region === 'south_india'
      ? 'South Indian'
      : 'Flexible cuisine';
  const trainingDays = plan.workouts.filter((item) => !item.isRest).length;

  return (
    <Screen maxWidth={1180}>
      <PageHeader
        eyebrow="ADAPTIVE WEEK"
        title="Your week, built around you."
        subtitle={`${regionLabel} · ${trainingDays} training days · ${profile?.cookingTimeMin ?? 30}-minute meals`}
        action={<StatusPill label={plan.personalized ? 'AI personalized' : 'Smart template'} color={plan.personalized ? colors.success : colors.accent} icon={<Sparkles size={13} color={plan.personalized ? colors.success : colors.accent} />} />}
      />

      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>WEEKLY OPERATING RANGE</Text>
          <Text style={styles.heroTitle}>{plan.macros.calorieRange[0]}–{plan.macros.calorieRange[1]} kcal</Text>
          <Text style={styles.heroBody}>Enough structure to make progress, with room for real life.</Text>
          <View style={styles.heroSignals}>
            <Signal icon={<Flame size={15} color={colors.peach} />} value={`${plan.macros.proteinG}g`} label="protein" />
            <Signal icon={<Salad size={15} color={colors.success} />} value={`${plan.macros.carbsG}g`} label="carbs" />
            <Signal icon={<CalendarDays size={15} color={colors.accent} />} value={`${trainingDays}x`} label="training" />
          </View>
        </View>
        <ProgressRing
          progress={Math.min(100, Math.round((totals.calories / plan.macros.calories) * 100))}
          value={`${totals.calories}`}
          label={`${WEEKDAY_LABEL[day]} kcal`}
          size={compact ? 112 : 138}
          accent={colors.primary}
        />
      </View>

      <View style={[styles.quickActions, compact && styles.quickActionsCompact]}>
        <QuickAction icon={<ShoppingBasket size={19} color={colors.primary} />} label="Smart grocery" sub="Costed from this week" onPress={() => router.push('/grocery')} />
        <QuickAction icon={<Utensils size={19} color={colors.peach} />} label="Restaurant mode" sub="Make any dish fit" onPress={() => router.push('/restaurant')} />
        <QuickAction icon={<MapPin size={19} color={colors.accent} />} label="Local meals" sub={regionLabel} onPress={() => router.push('/local-preferences')} />
      </View>

      <View style={styles.tabs}>
        <PlanTabButton active={tab === 'meals'} label="Meals" icon={<ChefHat size={17} color={tab === 'meals' ? colors.black : colors.textDim} />} onPress={() => setTab('meals')} />
        <PlanTabButton active={tab === 'workouts'} label="Workouts" icon={<Dumbbell size={17} color={tab === 'workouts' ? colors.black : colors.textDim} />} onPress={() => setTab('workouts')} />
        <PlanTabButton active={tab === 'nutrition'} label="Nutrition" icon={<Salad size={17} color={tab === 'nutrition' ? colors.black : colors.textDim} />} onPress={() => setTab('nutrition')} />
      </View>

      {tab !== 'nutrition' ? (
        <View style={styles.dayStrip}>
          {plan.meals.map((item) => {
            const selected = item.day === day;
            const isTraining = !plan.workouts.find((workoutDay) => workoutDay.day === item.day)?.isRest;
            return (
              <Pressable key={item.day} onPress={() => setDay(item.day)} style={[styles.dayButton, selected && styles.dayButtonOn]}>
                <Text style={[styles.dayShort, selected && styles.dayTextOn]}>{WEEKDAY_LABEL[item.day].slice(0, 3)}</Text>
                <View style={[styles.dayDot, { backgroundColor: isTraining ? colors.peach : colors.accent }, selected && styles.dayDotOn]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {tab === 'meals' && dayMeals ? (
        <Card key={`meals-${day}`} tone="raised" style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <View>
              <Text style={styles.cardEyebrow}>MEALS · {WEEKDAY_LABEL[day].toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{totals.calories} kcal · {totals.protein}g protein</Text>
            </View>
            <StatusPill label={totals.protein >= plan.macros.proteinG * 0.8 ? 'Protein ready' : 'Room to improve'} color={totals.protein >= plan.macros.proteinG * 0.8 ? colors.success : colors.warning} />
          </View>
          <View style={styles.mealGrid}>
            {dayMeals.items.map((meal, index) => (
              <View key={meal.slot} style={styles.mealRow}>
                <View style={[styles.mealIcon, { backgroundColor: MEAL_COLORS[index % MEAL_COLORS.length] }]}>
                  <Text style={styles.mealIndex}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={styles.mealCopy}>
                  <Text style={styles.mealSlot}>{meal.slot}</Text>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <View style={styles.mealMetaRow}>
                    <Text style={styles.mealMeta}>{meal.calories} kcal</Text>
                    <Text style={styles.mealMeta}>{meal.proteinG}g protein</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel={`Replace ${meal.slot}`}
                  style={styles.replaceButton}
                  onPress={() => router.push({ pathname: '/replace-meal', params: { day, slot: meal.slot } })}
                >
                  <RefreshCw size={16} color={colors.primary} />
                  {!compact ? <Text style={styles.replaceText}>Swap</Text> : null}
                </Pressable>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      {tab === 'workouts' && workout ? (
        <Card key={`workouts-${day}`} tone="raised" style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <View>
              <Text style={styles.cardEyebrow}>TRAINING · {WEEKDAY_LABEL[day].toUpperCase()}</Text>
              <Text style={styles.cardTitle}>{workout.focus}</Text>
            </View>
            <StatusPill label={workout.isRest ? 'Recovery day' : `${workout.exercises.length} movements`} color={workout.isRest ? colors.accent : colors.peach} />
          </View>
          {workout.exercises.map((exercise, index) => {
            const key = `${day}:${exercise.exerciseId}`;
            const open = openEx === key;
            return (
              <Pressable key={key} style={styles.exerciseRow} onPress={() => setOpenEx(open ? null : key)}>
                <View style={styles.exerciseNumber}><Text style={styles.exerciseNumberText}>{index + 1}</Text></View>
                <View style={styles.exerciseCopy}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseMetaRow}>
                    <Clock3 size={13} color={colors.textMuted} />
                    <Text style={styles.exerciseMeta}>{exercise.sets} sets × {exercise.reps} · rest {exercise.restSec}s</Text>
                  </View>
                  {open ? (
                    <View style={styles.exerciseDetail}>
                      <Text style={styles.exerciseInstruction}>{exercise.instructions}</Text>
                      {exercise.beginnerAlternative ? <Text style={styles.exerciseAlternative}>Easier option: {exercise.beginnerAlternative}</Text> : null}
                    </View>
                  ) : null}
                </View>
                {open ? <ChevronUp size={17} color={colors.textDim} /> : <ChevronDown size={17} color={colors.textDim} />}
              </Pressable>
            );
          })}
          {workout.exercises.length === 0 ? <Text style={styles.restCopy}>Full rest. Recovery is part of the program, not time away from it.</Text> : null}
        </Card>
      ) : null}

      {tab === 'nutrition' ? (
        <View key="nutrition" style={[styles.nutritionLayout, compact && styles.nutritionLayoutCompact]}>
          <Card tone="raised" style={styles.nutritionMain}>
            <Text style={styles.cardEyebrow}>YOUR NUTRITION BLUEPRINT</Text>
            <Text style={styles.cardTitle}>Simple rules, personalized numbers.</Text>
            {plan.nutritionGuidelines.map((guideline, index) => (
              <View key={guideline} style={styles.guideRow}>
                <View style={styles.guideNumber}><Text style={styles.guideNumberText}>{index + 1}</Text></View>
                <Text style={styles.guideText}>{guideline}</Text>
              </View>
            ))}
            {!isAIEnabled() ? <Text style={styles.offlineHint}>Using validated offline planning rules. AI wording can be enabled later without changing your targets.</Text> : null}
          </Card>
          <View style={styles.macroStack}>
            <MacroTile label="Protein" value={`${plan.macros.proteinG}g`} color={colors.peach} note="recovery & fullness" />
            <MacroTile label="Carbohydrate" value={`${plan.macros.carbsG}g`} color={colors.accent} note="training fuel" />
            <MacroTile label="Fat" value={`${plan.macros.fatG}g`} color={colors.warning} note="hormones & satiety" />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const MEAL_COLORS = [colors.primaryDim, colors.accentDim, colors.peachDim, colors.successDim];

function Signal({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <View style={styles.signal}>{icon}<View><Text style={styles.signalValue}>{value}</Text><Text style={styles.signalLabel}>{label}</Text></View></View>;
}

function QuickAction({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.quickIcon}>{icon}</View>
      <View style={styles.quickCopy}><Text style={styles.quickLabel}>{label}</Text><Text style={styles.quickSub}>{sub}</Text></View>
    </Pressable>
  );
}

function PlanTabButton({ active, icon, label, onPress }: { active: boolean; icon: React.ReactNode; label: string; onPress: () => void }) {
  return <Pressable style={[styles.tab, active && styles.tabOn]} onPress={onPress}>{icon}<Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text></Pressable>;
}

function MacroTile({ label, value, color, note }: { label: string; value: string; color: string; note: string }) {
  return <View style={styles.macroTile}><View style={[styles.macroMarker, { backgroundColor: color }]} /><Text style={styles.macroLabel}>{label}</Text><Text style={styles.macroValue}>{value}</Text><Text style={styles.macroNote}>{note}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xl, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.xl, overflow: 'hidden' },
  heroCompact: { minHeight: 0, alignItems: 'flex-start', padding: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.sm },
  heroEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: colors.text, fontSize: 28, fontWeight: '900' },
  heroBody: { color: colors.textDim, fontSize: font.small, lineHeight: 20, maxWidth: 520 },
  heroSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  signalValue: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  signalLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase' },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickActionsCompact: { flexWrap: 'wrap' },
  quickAction: { flex: 1, minWidth: 190, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  quickIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  quickCopy: { flex: 1, gap: 2 },
  quickLabel: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  quickSub: { color: colors.textMuted, fontSize: font.tiny },
  pressed: { opacity: 0.78, transform: [{ translateY: 1 }] },
  tabs: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surfaceSunken, padding: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  tab: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.sm },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.textDim, fontSize: font.small, fontWeight: '700' },
  tabTextOn: { color: colors.black },
  dayStrip: { flexDirection: 'row', gap: spacing.sm },
  dayButton: { flex: 1, minWidth: 38, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dayButtonOn: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
  dayShort: { color: colors.textDim, fontSize: font.tiny, fontWeight: '800' },
  dayTextOn: { color: colors.text },
  dayDot: { width: 5, height: 5, borderRadius: 3 },
  dayDotOn: { width: 16, borderRadius: 3 },
  focusCard: { padding: spacing.xl },
  focusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  cardEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 4 },
  mealGrid: { gap: 0 },
  mealRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  mealIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  mealIndex: { color: colors.text, fontSize: font.tiny, fontWeight: '900' },
  mealCopy: { flex: 1, gap: 3 },
  mealSlot: { color: colors.textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  mealName: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  mealMetaRow: { flexDirection: 'row', gap: spacing.md },
  mealMeta: { color: colors.textDim, fontSize: font.tiny },
  replaceButton: { minWidth: 42, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryDim, paddingHorizontal: 11 },
  replaceText: { color: colors.primary, fontSize: font.tiny, fontWeight: '800' },
  exerciseRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  exerciseNumber: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.peachDim },
  exerciseNumberText: { color: colors.peach, fontSize: font.small, fontWeight: '900' },
  exerciseCopy: { flex: 1, gap: 4 },
  exerciseName: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  exerciseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  exerciseMeta: { color: colors.textDim, fontSize: font.tiny },
  exerciseDetail: { marginTop: spacing.sm, gap: 5, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.peach },
  exerciseInstruction: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  exerciseAlternative: { color: colors.accent, fontSize: font.tiny },
  restCopy: { color: colors.textDim, fontSize: font.small, paddingVertical: spacing.lg },
  nutritionLayout: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  nutritionLayoutCompact: { flexDirection: 'column' },
  nutritionMain: { flex: 1.35 },
  macroStack: { flex: 0.65, gap: spacing.sm },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  guideNumber: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  guideNumberText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  guideText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 21 },
  offlineHint: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, marginTop: spacing.sm },
  macroTile: { flex: 1, minHeight: 112, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  macroMarker: { width: 26, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  macroLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase' },
  macroValue: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 3 },
  macroNote: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
});
