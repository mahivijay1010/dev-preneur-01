import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ShineSweep } from '@/components/depth';
import { AchievementBurst, AnimatedNumber, Reveal } from '@/components/motion';
import { Button, Card, ChipGroup, Field, ProgressRing, Screen, SectionHeader, StatTile } from '@/components/ui';
import { summarize } from '@/engine/progress';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { Adjustment } from '@/types';

type Scale = 1 | 2 | 3 | 4 | 5;

const SCALE_OPTIONS: { label: string; value: Scale }[] = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n as Scale }));

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
    <View style={styles.scaleRow}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <ChipGroup options={SCALE_OPTIONS} value={value} onChange={(v) => onChange(v as Scale)} />
    </View>
  );
}

function BoolRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.boolRow}>
      <Text style={styles.label}>{label}</Text>
      <ChipGroup
        options={[
          { label: 'No', value: 0 },
          { label: 'Yes', value: 1 },
        ]}
        value={value ? 1 : 0}
        onChange={(v) => onChange(v === 1)}
      />
    </View>
  );
}

export default function WeeklyReview() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
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
  const [celebrating, setCelebrating] = useState(false);

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
    setCelebrating(true);
  };

  const workoutPct = plannedWorkouts > 0 ? Math.min(100, (s.workoutsCompleted / plannedWorkouts) * 100) : 0;

  if (result) {
    const delta = result.calorieDelta;
    return (
      <>
        <Screen maxWidth={880}>
          <Reveal style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>PLAN RECALIBRATED</Text>
              <Text style={styles.headerTitle}>Your plan just clicked into its new setting.</Text>
              <Text style={styles.headerSubtitle}>Based on your week, here’s what changed and why.</Text>
            </View>
          </Reveal>

          <Reveal delay={60}>
            <Card tone="tinted" glow style={styles.resultHero}>
              <ShineSweep interval={7000} delay={600} />
              <Text style={styles.resultEyebrow}>CALORIE TARGET</Text>
              {delta === 0 ? (
                <Text style={styles.resultHeadline}>No calorie change</Text>
              ) : (
                <AnimatedNumber
                  value={delta}
                  prefix={delta > 0 ? '+' : ''}
                  suffix=" kcal / day"
                  duration={1000}
                  style={styles.resultHeadline}
                />
              )}
              <Text style={styles.resultSub}>
                {delta === 0
                  ? 'Your current target still fits the data — hold steady.'
                  : 'The dial moved to match how your body responded this week.'}
              </Text>
            </Card>
          </Reveal>

          <Card style={styles.changesCard}>
            <SectionHeader>What changed</SectionHeader>
            {result.changes.map((c, i) => (
              <Reveal key={i} delay={120 + i * 70} style={styles.changeRow}>
                <View style={styles.changeDot} />
                <Text style={styles.change}>{c}</Text>
              </Reveal>
            ))}
          </Card>

          <Button label="Done" onPress={() => router.back()} />
        </Screen>
        <AchievementBurst
          visible={celebrating}
          title="Plan recalibrated"
          detail={delta === 0 ? 'HELD STEADY' : `${delta > 0 ? '+' : ''}${delta} kcal`}
          onFinished={() => setCelebrating(false)}
        />
      </>
    );
  }

  const summaryCard = (
    <Reveal delay={60}>
      <Card tone="raised" style={styles.summaryCard}>
        <SectionHeader>This week, from your logs</SectionHeader>
        <View style={styles.summaryRow}>
          <StatTile
            label="7-day avg weight"
            value={s.sevenDayAvg !== null ? String(s.sevenDayAvg) : '—'}
            sub={s.sevenDayAvg !== null ? 'kg' : 'log weight to track'}
            accent={colors.accent}
          />
          <ProgressRing
            progress={workoutPct}
            value={`${s.workoutsCompleted}/${plannedWorkouts}`}
            label="workouts"
            size={92}
            gradient={gradients.primary}
          />
        </View>
      </Card>
    </Reveal>
  );

  const waistCard = (
    <Reveal delay={120}>
      <Card style={styles.formCard}>
        <SectionHeader>Waist measurement (optional)</SectionHeader>
        <Field
          label="Waist"
          hint="cm"
          value={waist}
          onChangeText={setWaist}
          keyboardType="numeric"
          placeholder="e.g. 82"
        />
      </Card>
    </Reveal>
  );

  const togglesCard = (
    <Reveal delay={180}>
      <Card style={styles.formCard}>
        <BoolRow label="Did strength improve?" value={strengthImproved} onChange={setStrength} />
        <BoolRow label="Any pain or injury?" value={painOrInjury} onChange={setPain} />
      </Card>
    </Reveal>
  );

  const scalesCard = (
    <Reveal delay={wide ? 60 : 240}>
      <Card style={styles.formCard}>
        <ScaleRow label="Hunger" hint="1 = never hungry, 5 = very hungry" value={hunger} onChange={setHunger} />
        <ScaleRow label="Energy" hint="1 = drained, 5 = great" value={energy} onChange={setEnergy} />
        <ScaleRow label="Sleep quality" hint="1 = poor, 5 = excellent" value={sleep} onChange={setSleep} />
        <ScaleRow label="How hard were the meals to follow?" hint="1 = easy, 5 = very hard" value={mealDifficulty} onChange={setMealDifficulty} />
        <ScaleRow label="Overall satisfaction" hint="1 = unhappy, 5 = loving it" value={satisfaction} onChange={setSatisfaction} />
      </Card>
    </Reveal>
  );

  return (
    <Screen maxWidth={1080}>
      <Reveal style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>WEEKLY CALIBRATION</Text>
          <Text style={styles.headerTitle}>
            Two minutes that <Text style={styles.accentWord}>tune</Text> your plan.
          </Text>
          <Text style={styles.headerSubtitle}>Two minutes each week lets us adapt your plan to what’s actually working.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close weekly review"
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={21} color={colors.text} />
        </Pressable>
      </Reveal>

      {wide ? (
        <View style={styles.columns}>
          <View style={styles.column}>
            {summaryCard}
            {waistCard}
            {togglesCard}
          </View>
          <View style={styles.column}>{scalesCard}</View>
        </View>
      ) : (
        <>
          {summaryCard}
          {waistCard}
          {togglesCard}
          {scalesCard}
        </>
      )}

      <Button label="Submit & update my plan" onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  headerTitle: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  accentWord: { color: colors.primary },
  headerSubtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 680 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  column: { flex: 1, gap: spacing.md },
  summaryCard: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  formCard: { gap: spacing.md },
  scaleRow: { gap: 6 },
  boolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  label: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  hint: { color: colors.textDim, fontSize: font.tiny },
  resultHero: { alignItems: 'flex-start', gap: spacing.xs, padding: spacing.xl },
  resultEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  resultHeadline: { color: colors.text, fontSize: font.display, fontWeight: '900', lineHeight: 46 },
  resultSub: { color: colors.textDim, fontSize: font.small, lineHeight: 20, maxWidth: 460 },
  changesCard: { gap: spacing.sm },
  changeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  changeDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: colors.primary },
  change: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 22 },
});
