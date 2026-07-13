import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, Subtitle, Title } from '@/components/ui';
import { findReplacements } from '@/engine/mealReplacement';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { MealItem, Weekday } from '@/types';

// Meal replacement screen — reached from the "Replace" button on any meal.
export default function ReplaceMeal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day: Weekday; slot: MealItem['slot'] }>();
  const { plan, profile, replaceMeal } = useAppStore();

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

  const diff = (n: number, unit: string) =>
    `${n > 0 ? '+' : ''}${n}${unit}`;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Replace meal</Title>
      <Subtitle>
        Swapping <Text style={{ color: colors.text }}>{meal.name}</Text> ({meal.calories} kcal ·{' '}
        {meal.proteinG}g protein). Options match calories, protein, cost & time.
      </Subtitle>

      {candidates.length === 0 && (
        <Card>
          <Text style={styles.none}>No close alternatives for your current filters.</Text>
        </Card>
      )}

      {candidates.map((c) => (
        <Pressable
          key={c.food.id}
          onPress={() => {
            replaceMeal(params.day as Weekday, params.slot as MealItem['slot'], c.food);
            router.back();
          }}
        >
          <Card>
            <View style={styles.row}>
              <Text style={styles.name}>{c.food.name}</Text>
              <Text style={styles.cost}>₹{c.food.approxCost}</Text>
            </View>
            <Text style={styles.macros}>
              {c.food.calories} kcal · {c.food.proteinG}g protein · {c.food.cookingTimeMin} min
            </Text>
            <View style={styles.diffRow}>
              <Text style={[styles.diff, c.calorieDiff === 0 && { color: colors.textDim }]}>
                {diff(c.calorieDiff, ' kcal')}
              </Text>
              <Text style={[styles.diff, { color: colors.accent }]}>
                {diff(c.proteinDiff, 'g protein')}
              </Text>
              {c.food.availability !== 'common' && (
                <Text style={[styles.diff, { color: colors.warning }]}>{c.food.availability}</Text>
              )}
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  none: { color: colors.textDim, fontSize: font.small },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: font.body, flex: 1 },
  cost: { color: colors.textDim, fontSize: font.small },
  macros: { color: colors.textDim, fontSize: font.small },
  diffRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  diff: {
    color: colors.primary,
    fontSize: font.tiny,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
