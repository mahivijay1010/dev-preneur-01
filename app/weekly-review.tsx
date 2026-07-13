import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { summarize } from '@/engine/progress';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { Adjustment } from '@/types';

type Scale = 1 | 2 | 3 | 4 | 5;

function ScaleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: Scale;
  onChange: (v: Scale) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {([1, 2, 3, 4, 5] as Scale[]).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={[styles.dot, value === n && styles.dotOn]}
          >
            <Text style={[styles.dotText, value === n && { color: colors.bg }]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { l: 'No', v: false },
          { l: 'Yes', v: true },
        ].map((o) => (
          <Pressable
            key={o.l}
            onPress={() => onChange(o.v)}
            style={[styles.toggle, value === o.v && styles.toggleOn]}
          >
            <Text style={[styles.dotText, value === o.v && { color: colors.bg }]}>{o.l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function WeeklyReview() {
  const router = useRouter();
  const { logs, profile, plan, submitWeeklyReview } = useAppStore();
  const s = useMemo(() => summarize(logs, profile, plan), [logs, profile, plan]);

  const plannedWorkouts = profile?.workoutDays.length ?? 3;

  const [waist, setWaist] = useState('');
  const [strengthImproved, setStrength] = useState(false);
  const [hunger, setHunger] = useState<Scale>(3);
  const [energy, setEnergy] = useState<Scale>(3);
  const [sleep, setSleep] = useState<Scale>(3);
  const [mealDifficulty, setMealDifficulty] = useState<Scale>(2);
  const [painOrInjury, setPain] = useState(false);
  const [satisfaction, setSatisfaction] = useState<Scale>(4);
  const [result, setResult] = useState<Adjustment | null>(null);

  const submit = () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const adj = submitWeeklyReview({
      weekStart: weekStart.toISOString().slice(0, 10),
      avgWeightKg: s.sevenDayAvg,
      waistCm: waist ? parseFloat(waist) : undefined,
      workoutsCompleted: s.workoutsCompleted,
      workoutsPlanned: plannedWorkouts,
      strengthImproved,
      hunger,
      energy,
      sleep,
      mealDifficulty,
      painOrInjury,
      satisfaction,
    });
    setResult(adj);
  };

  if (result) {
    return (
      <Screen>
        <Title>Plan updated</Title>
        <Subtitle>Based on your week, here’s what changed and why.</Subtitle>
        <Card>
          <SectionHeader>
            {result.calorieDelta === 0
              ? 'No calorie change'
              : `${result.calorieDelta > 0 ? '+' : ''}${result.calorieDelta} kcal / day`}
          </SectionHeader>
          {result.changes.map((c, i) => (
            <Text key={i} style={styles.change}>• {c}</Text>
          ))}
        </Card>
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Weekly review</Title>
      <Subtitle>Two minutes each week lets us adapt your plan to what’s actually working.</Subtitle>

      <Card>
        <SectionHeader>This week, from your logs</SectionHeader>
        <Text style={styles.auto}>
          7-day avg weight: {s.sevenDayAvg !== null ? `${s.sevenDayAvg} kg` : '—'}
        </Text>
        <Text style={styles.auto}>
          Workouts: {s.workoutsCompleted} / {plannedWorkouts} planned
        </Text>
      </Card>

      <Card>
        <SectionHeader>Waist measurement (optional)</SectionHeader>
        <TextInput
          value={waist}
          onChangeText={setWaist}
          keyboardType="numeric"
          placeholder="cm"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
      </Card>

      <Card>
        <Toggle label="Did strength improve?" value={strengthImproved} onChange={setStrength} />
        <Toggle label="Any pain or injury?" value={painOrInjury} onChange={setPain} />
      </Card>

      <Card>
        <ScaleRow label="Hunger" hint="1 = never hungry, 5 = very hungry" value={hunger} onChange={setHunger} />
        <ScaleRow label="Energy" hint="1 = drained, 5 = great" value={energy} onChange={setEnergy} />
        <ScaleRow label="Sleep quality" hint="1 = poor, 5 = excellent" value={sleep} onChange={setSleep} />
        <ScaleRow label="How hard were the meals to follow?" hint="1 = easy, 5 = very hard" value={mealDifficulty} onChange={setMealDifficulty} />
        <ScaleRow label="Overall satisfaction" hint="1 = unhappy, 5 = loving it" value={satisfaction} onChange={setSatisfaction} />
      </Card>

      <Button label="Submit & update my plan" onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  label: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: font.tiny },
  auto: { color: colors.textDim, fontSize: font.small },
  dot: {
    width: 48,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotText: { color: colors.textDim, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: {
    paddingHorizontal: 18,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
  change: { color: colors.text, fontSize: font.small, lineHeight: 22 },
});
