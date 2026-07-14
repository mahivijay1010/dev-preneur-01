import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { currentWeekday, WEEKDAY_LABEL } from '@/engine/week';
import { todayKey } from '@/services/storage';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { DailyLog } from '@/types';

// Stepper used for frictionless numeric logging.
function Stepper({
  label,
  unit,
  value,
  step,
  onChange,
  accent = colors.primary,
}: {
  label: string;
  unit: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  accent?: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={[styles.stepValue, { color: accent }]}>
          {value} <Text style={styles.stepUnit}>{unit}</Text>
        </Text>
      </View>
      <Pressable style={styles.round} onPress={() => onChange(Math.max(0, value - step))}>
        <Text style={styles.roundText}>–</Text>
      </Pressable>
      <Pressable style={styles.round} onPress={() => onChange(value + step)}>
        <Text style={styles.roundText}>+</Text>
      </Pressable>
    </View>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.scaleDot, value === n && styles.scaleDotOn]}
          >
            <Text style={[styles.scaleText, value === n && { color: colors.bg }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Today() {
  const router = useRouter();
  const { plan, profile, user, updateTodayLog, logs } = useAppStore();
  const day = currentWeekday();
  const log: DailyLog = logs[todayKey()] ?? { date: todayKey() };

  const workout = useMemo(
    () => plan?.workouts.find((w) => w.day === day),
    [plan, day],
  );
  const meals = useMemo(
    () => plan?.meals.find((m) => m.day === day),
    [plan, day],
  );

  if (!plan || !profile) {
    return (
      <Screen>
        <Title>Today</Title>
        <Subtitle>No plan yet — finish onboarding to generate one.</Subtitle>
      </Screen>
    );
  }

  const mealsLogged = new Set(log.mealsLogged ?? []);
  const toggleMeal = (slot: string, proteinG: number) => {
    const next = new Set(mealsLogged);
    let deltaProtein = 0;
    if (next.has(slot)) {
      next.delete(slot);
      deltaProtein = -proteinG;
    } else {
      next.add(slot);
      deltaProtein = proteinG;
    }
    updateTodayLog({
      mealsLogged: [...next],
      proteinG: Math.max(0, (log.proteinG ?? 0) + deltaProtein),
    });
  };

  return (
    <Screen>
      <View>
        <Text style={styles.hi}>Hi {user?.name ?? 'there'} 👋</Text>
        <Title>{WEEKDAY_LABEL[day]}</Title>
        <Subtitle>
          Target {plan.macros.calorieRange[0]}–{plan.macros.calorieRange[1]} kcal ·{' '}
          {plan.macros.proteinG} g protein
        </Subtitle>
      </View>

      {/* Plan Repair entry — the day gets fixed, never marked a failure. */}
      <Pressable style={styles.repairBanner} onPress={() => router.push('/repair')}>
        <Text style={styles.repairIcon}>🛠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.repairTitle}>Day not going to plan?</Text>
          <Text style={styles.repairSub}>Tap to repair it — missed workout, travel, tired…</Text>
        </View>
        <Text style={styles.repairArrow}>›</Text>
      </Pressable>

      {/* Today's workout */}
      <Card>
        <SectionHeader>Today's workout</SectionHeader>
        <Text style={styles.focus}>{workout?.focus ?? 'Rest day'}</Text>
        {workout && !workout.isRest ? (
          <>
            {workout.exercises.map((e) => (
              <Text key={e.exerciseId} style={styles.exLine}>
                • {e.name} — {e.sets}×{e.reps}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.exLine}>Take it easy. A short walk counts.</Text>
        )}
        <Pressable
          style={[styles.doneBtn, log.workoutCompleted && styles.doneBtnOn]}
          onPress={() => updateTodayLog({ workoutCompleted: !log.workoutCompleted })}
        >
          <Text style={[styles.doneText, log.workoutCompleted && { color: colors.bg }]}>
            {log.workoutCompleted ? '✓ Workout completed' : 'Mark workout complete'}
          </Text>
        </Pressable>
        <Pressable style={styles.cameraLink} onPress={() => router.push('/form-check')}>
          <Text style={styles.cameraLinkText}>🎥 Check my form</Text>
        </Pressable>
      </Card>

      {/* Today's meals */}
      <Card>
        <View style={styles.mealsHead}>
          <SectionHeader>Today's meals</SectionHeader>
          <Pressable style={styles.cameraChip} onPress={() => router.push('/food-camera')}>
            <Text style={styles.cameraChipText}>📷 Log meal</Text>
          </Pressable>
        </View>
        {meals?.items.map((m) => {
          const checked = mealsLogged.has(m.slot);
          return (
            <Pressable
              key={m.slot}
              style={styles.mealRow}
              onPress={() => toggleMeal(m.slot, m.proteinG)}
            >
              <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
                {checked ? <Text style={styles.tick}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mealSlot}>{m.slot.toUpperCase()}</Text>
                <Text style={styles.mealName}>{m.name}</Text>
                {m.note ? <Text style={styles.mealNote}>“{m.note}”</Text> : null}
              </View>
              <Text style={styles.mealMacros}>
                {m.calories}kcal{'\n'}
                {m.proteinG}g P
              </Text>
            </Pressable>
          );
        })}
      </Card>

      {/* Quick log */}
      <Card>
        <SectionHeader>Quick log</SectionHeader>
        <Stepper
          label="Weight"
          unit="kg"
          step={0.1}
          value={round1(log.weightKg ?? profile.currentWeightKg)}
          onChange={(v) => updateTodayLog({ weightKg: round1(v) })}
        />
        <Stepper
          label="Water"
          unit="ml"
          step={250}
          value={log.waterMl ?? 0}
          onChange={(v) => updateTodayLog({ waterMl: v })}
          accent={colors.accent}
        />
        <Stepper
          label="Steps"
          unit=""
          step={500}
          value={log.steps ?? 0}
          onChange={(v) => updateTodayLog({ steps: v })}
          accent={colors.success}
        />
        <Stepper
          label="Sleep"
          unit="h"
          step={0.5}
          value={round1(log.sleepHours ?? 0)}
          onChange={(v) => updateTodayLog({ sleepHours: round1(v) })}
          accent={colors.warning}
        />
        <View style={{ height: spacing.sm }} />
        <Scale label="Energy" value={log.energy} onChange={(v) => updateTodayLog({ energy: v })} />
        <Scale label="Hunger" value={log.hunger} onChange={(v) => updateTodayLog({ hunger: v })} />
      </Card>
    </Screen>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

const styles = StyleSheet.create({
  hi: { color: colors.textDim, fontSize: font.body },
  repairBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  repairIcon: { fontSize: 24 },
  repairTitle: { color: colors.text, fontWeight: '700', fontSize: font.body },
  repairSub: { color: colors.textDim, fontSize: font.tiny },
  repairArrow: { color: colors.accent, fontSize: 28, fontWeight: '700' },
  focus: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  exLine: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  doneBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneBtnOn: { backgroundColor: colors.success, borderColor: colors.success },
  doneText: { color: colors.text, fontWeight: '700' },
  cameraLink: { alignItems: 'center', paddingVertical: 8 },
  cameraLinkText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  mealsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraChip: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cameraChipText: { color: colors.primary, fontWeight: '700', fontSize: font.tiny },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.success, borderColor: colors.success },
  tick: { color: colors.bg, fontWeight: '900' },
  mealSlot: { color: colors.textDim, fontSize: font.tiny, letterSpacing: 1 },
  mealName: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  mealNote: { color: colors.accent, fontSize: font.tiny, fontStyle: 'italic' },
  mealMacros: { color: colors.textDim, fontSize: font.tiny, textAlign: 'right' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  stepLabel: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  stepValue: { fontSize: font.h3, fontWeight: '800' },
  stepUnit: { fontSize: font.small, color: colors.textDim, fontWeight: '600' },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: { color: colors.text, fontSize: 22, fontWeight: '700' },
  scaleDot: {
    width: 48,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleDotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleText: { color: colors.textDim, fontWeight: '700' },
});
