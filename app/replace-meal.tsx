import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, Eyebrow, InlineNotice, ProgressRing, Screen, StatTile, StatusPill, Subtitle, Title } from '@/components/ui';
import { AchievementBurst, Reveal, StaggerText, usePressMotion } from '@/components/motion';
import { Gradient, ShineSweep } from '@/components/depth';
import { findReplacements, type ReplacementCandidate } from '@/engine/mealReplacement';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { MealItem, Weekday } from '@/types';

// Meal replacement screen — reached from the "Replace" button on any meal.
export default function ReplaceMeal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const params = useLocalSearchParams<{ day: Weekday; slot: MealItem['slot'] }>();
  const { plan, profile, replaceMeal } = useAppStore();
  // Guards against double-commit + drives the swap-shine on the chosen card.
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);

  const meal = useMemo(
    () => plan?.meals.find((d) => d.day === params.day)?.items.find((i) => i.slot === params.slot),
    [plan, params.day, params.slot],
  );

  const candidates = useMemo(
    () => (meal && profile ? findReplacements(meal, profile) : []),
    [meal, profile],
  );

  if (!meal || !profile) {
    return (
      <Screen>
        <Title>Replace meal</Title>
        <Subtitle>Meal not found.</Subtitle>
      </Screen>
    );
  }

  const diff = (n: number, unit: string) => `${n > 0 ? '+' : ''}${n}${unit}`;

  // Store mutation fires immediately (never delayed/duplicated); the burst then
  // plays and navigates back when it finishes.
  const swapIn = (c: ReplacementCandidate) => {
    if (swappingId) return;
    replaceMeal(params.day as Weekday, params.slot as MealItem['slot'], c.food);
    setSwappingId(c.food.id);
    setBurst(true);
  };

  const currentCard = (
    <View style={swappingId ? styles.dimmed : undefined}>
      <Reveal>
        <Card tone="tinted">
          <Eyebrow>CURRENTLY PLANNED</Eyebrow>
          <Text style={styles.currentName}>{meal.name}</Text>
          <View style={styles.currentStats}>
            <StatTile label="Calories" value={`${meal.calories}`} accent={colors.peach} />
            <StatTile label="Protein" value={`${meal.proteinG}g`} accent={colors.primary} />
            <StatTile label={params.slot ?? 'Slot'} value={params.day ?? '—'} accent={colors.accent} />
          </View>
        </Card>
      </Reveal>
    </View>
  );

  const list = (
    <View style={styles.listColumn}>
      {candidates.length === 0 ? (
        <Card tone="glass">
          <InlineNotice tone="danger">No close alternatives for your current filters.</InlineNotice>
          <Button label="Back to plan" variant="ghost" onPress={() => router.back()} />
        </Card>
      ) : (
        candidates.map((c, index) => (
          <CandidateCard
            key={c.food.id}
            candidate={c}
            mealCalories={meal.calories}
            diff={diff}
            delay={index * 70}
            swapping={swappingId === c.food.id}
            disabled={swappingId !== null}
            onSwap={() => swapIn(c)}
          />
        ))
      )}
    </View>
  );

  return (
    <>
    <Screen maxWidth={1040}>
      <View style={styles.closeRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close meal swap" style={styles.closeButton} onPress={() => router.back()}>
          <X size={20} color={colors.textDim} />
        </Pressable>
      </View>
      <Reveal style={styles.headerCopy}>
        <Eyebrow>MEAL SWAP</Eyebrow>
        <StaggerText text="Replace meal" accentWords={['Replace']} style={styles.titleText} />
        <Subtitle>Options match calories, protein, cost &amp; time.</Subtitle>
      </Reveal>

      {compact ? (
        <>
          {currentCard}
          <InlineNotice tone="info">Match scores compare each option’s calories against your current meal.</InlineNotice>
          {list}
        </>
      ) : (
        <View style={styles.twoCol}>
          {list}
          <View style={styles.sideColumn}>
            {currentCard}
            <InlineNotice tone="info">Match scores compare each option’s calories against your current meal.</InlineNotice>
          </View>
        </View>
      )}
    </Screen>
    <AchievementBurst
      visible={burst}
      title="Meal swapped"
      detail="PLAN UPDATED"
      onFinished={() => router.back()}
    />
    </>
  );
}

function CandidateCard({
  candidate,
  mealCalories,
  diff,
  delay,
  swapping,
  disabled,
  onSwap,
}: {
  candidate: ReplacementCandidate;
  mealCalories: number;
  diff: (n: number, unit: string) => string;
  delay: number;
  swapping: boolean;
  disabled: boolean;
  onSwap: () => void;
}) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  const c = candidate;
  const matchScore = Math.max(0, Math.round(100 - Math.min(100, (Math.abs(c.calorieDiff) / (mealCalories || 1)) * 100)));
  const calorieColor = c.calorieDiff < 0 ? colors.success : c.calorieDiff > 0 ? colors.warning : colors.textDim;
  const proteinColor = c.proteinDiff > 0 ? colors.primary : c.proteinDiff < 0 ? colors.warning : colors.textDim;

  return (
    <Reveal delay={delay}>
      <Animated.View style={animatedStyle}>
        <Card tone="glass" style={styles.candidateCard}>
          {swapping ? <ShineSweep interval={9000} delay={0} /> : null}
          <View style={styles.candidateBody}>
            <ProgressRing progress={matchScore} value={`${matchScore}`} label="match" size={56} accent={colors.primary} />
            <View style={styles.candidateCopy}>
              <Text style={styles.name}>{c.food.name}</Text>
              <Text style={styles.macros}>{c.food.calories} kcal · {c.food.proteinG}g protein · {c.food.cookingTimeMin} min</Text>
              <View style={styles.costRow}>
                <View style={styles.costDot}><Gradient colors={gradients.primary} direction="diagonal" radius={4} /></View>
                <Text style={styles.cost}>₹{c.food.approxCost}</Text>
              </View>
              <View style={styles.diffRow}>
                <Text style={[styles.diff, { color: calorieColor, backgroundColor: `${calorieColor}1F` }]}>{diff(c.calorieDiff, ' kcal')}</Text>
                <Text style={[styles.diff, { color: proteinColor, backgroundColor: `${proteinColor}1F` }]}>{diff(c.proteinDiff, 'g protein')}</Text>
                {c.food.availability !== 'common' ? <StatusPill label={c.food.availability} color={colors.warning} /> : null}
              </View>
            </View>
          </View>
          <Button label={swapping ? 'Swapping…' : 'Swap in'} onPress={onSwap} disabled={disabled} />
        </Card>
      </Animated.View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end', marginBottom: -8 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  headerCopy: { gap: spacing.xs },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  twoCol: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  listColumn: { flex: 1.3, width: '100%', gap: spacing.md },
  sideColumn: { flex: 0.8, width: '100%', gap: spacing.md },
  dimmed: { opacity: 0.45 },
  currentName: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 2 },
  currentStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  candidateCard: { gap: spacing.md },
  candidateBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  candidateCopy: { flex: 1, gap: 4 },
  name: { color: colors.text, fontWeight: '800', fontSize: font.body },
  macros: { color: colors.textDim, fontSize: font.small },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  costDot: { width: 8, height: 8, borderRadius: 4, overflow: 'hidden' },
  cost: { color: colors.primary, fontSize: font.small, fontWeight: '900' },
  diffRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  diff: { fontSize: font.tiny, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
});
