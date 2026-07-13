import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { WEEKDAY_LABEL } from '@/engine/week';
import { isAIEnabled } from '@/services/claude';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

export default function PlanScreen() {
  const router = useRouter();
  const { plan, profile } = useAppStore();
  const [tab, setTab] = useState<'meals' | 'workouts' | 'nutrition'>('meals');
  const [openEx, setOpenEx] = useState<string | null>(null);
  const regionLabel =
    profile?.region && profile.region !== 'generic'
      ? profile.region === 'north_india'
        ? 'North Indian'
        : 'South Indian'
      : null;

  if (!plan) {
    return (
      <Screen>
        <Title>Your plan</Title>
        <Subtitle>Finish onboarding to generate your plan.</Subtitle>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Your 7-day plan</Title>
      <Subtitle>
        {plan.macros.calorieRange[0]}–{plan.macros.calorieRange[1]} kcal ·{' '}
        {plan.macros.proteinG}g protein · {plan.macros.carbsG}g carbs ·{' '}
        {plan.macros.fatG}g fat
        {plan.personalized ? '  ·  ✨ AI-personalized' : ''}
        {regionLabel ? `  ·  📍 ${regionLabel}` : ''}
      </Subtitle>

      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => router.push('/grocery')}>
          <Text style={styles.actionText}>🛒 Grocery</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => router.push('/restaurant')}>
          <Text style={styles.actionText}>🍽️ Restaurant</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => router.push('/local-preferences')}>
          <Text style={styles.actionText}>📍 Local</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['meals', 'workouts', 'nutrition'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === t && { color: colors.bg }]}>
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'nutrition' && (
        <Card>
          <SectionHeader>Nutrition guidelines</SectionHeader>
          {plan.nutritionGuidelines.map((g, i) => (
            <Text key={i} style={styles.line}>• {g}</Text>
          ))}
          {!isAIEnabled() && (
            <Text style={styles.aiHint}>
              Tip: add an ANTHROPIC API key to personalize meal wording.
            </Text>
          )}
        </Card>
      )}

      {tab === 'meals' &&
        plan.meals.map((d) => {
          const total = d.items.reduce((a, m) => a + m.calories, 0);
          const protein = d.items.reduce((a, m) => a + m.proteinG, 0);
          return (
            <Card key={d.day}>
              <View style={styles.dayHead}>
                <Text style={styles.dayName}>{WEEKDAY_LABEL[d.day]}</Text>
                <Text style={styles.dayTotal}>{total} kcal · {protein}g P</Text>
              </View>
              {d.items.map((m) => (
                <View key={m.slot} style={styles.mealRow}>
                  <Text style={styles.slot}>{m.slot}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealName}>{m.name}</Text>
                    <Text style={styles.macros}>{m.calories} kcal · {m.proteinG}g protein</Text>
                  </View>
                  <Pressable
                    style={styles.replaceBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/replace-meal',
                        params: { day: d.day, slot: m.slot },
                      })
                    }
                  >
                    <Text style={styles.replaceText}>Replace</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          );
        })}

      {tab === 'workouts' &&
        plan.workouts.map((w) => (
          <Card key={w.day}>
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>{WEEKDAY_LABEL[w.day]}</Text>
              <Text style={[styles.dayTotal, w.isRest && { color: colors.textDim }]}>
                {w.focus}
              </Text>
            </View>
            {w.exercises.length === 0 ? (
              <Text style={styles.line}>Full rest — recovery matters.</Text>
            ) : (
              w.exercises.map((e) => {
                const key = `${w.day}:${e.exerciseId}`;
                const open = openEx === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setOpenEx(open ? null : key)}
                    style={styles.exRow}
                  >
                    <View style={styles.exHead}>
                      <Text style={styles.exName}>{e.name}</Text>
                      <Text style={styles.exMeta}>
                        {e.sets}×{e.reps} · rest {e.restSec}s
                      </Text>
                    </View>
                    {open && (
                      <View style={{ gap: 4, marginTop: 4 }}>
                        <Text style={styles.instr}>{e.instructions}</Text>
                        {e.beginnerAlternative ? (
                          <Text style={styles.alt}>
                            Beginner: {e.beginnerAlternative}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </Card>
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.text, fontWeight: '700', fontSize: font.small },
  replaceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primaryDim,
  },
  replaceText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textDim, fontWeight: '700', fontSize: font.small },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: { color: colors.text, fontWeight: '800', fontSize: font.h3 },
  dayTotal: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
  },
  slot: { color: colors.textDim, fontSize: font.tiny, width: 64, textTransform: 'capitalize' },
  mealName: { color: colors.text, fontSize: font.small, flex: 1 },
  macros: { color: colors.textDim, fontSize: font.tiny },
  line: { color: colors.text, fontSize: font.small, lineHeight: 22 },
  aiHint: { color: colors.textDim, fontSize: font.tiny, marginTop: spacing.sm, fontStyle: 'italic' },
  exRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  exHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { color: colors.text, fontWeight: '600', fontSize: font.small, flex: 1 },
  exMeta: { color: colors.textDim, fontSize: font.tiny },
  instr: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  alt: { color: colors.accent, fontSize: font.tiny },
});
