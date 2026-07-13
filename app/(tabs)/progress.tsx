import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, SectionHeader, StatTile, Subtitle, Title } from '@/components/ui';
import { summarize } from '@/engine/progress';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function Progress() {
  const router = useRouter();
  const { logs, profile, plan, adjustments } = useAppStore();
  const s = useMemo(() => summarize(logs, profile, plan), [logs, profile, plan]);
  const lastAdjustment = adjustments[adjustments.length - 1];

  if (!profile) {
    return (
      <Screen>
        <Title>Progress</Title>
        <Subtitle>Finish onboarding to start tracking progress.</Subtitle>
      </Screen>
    );
  }

  const changeColor =
    s.weightChange === null
      ? colors.textDim
      : profile.goal === 'weight_loss'
        ? s.weightChange <= 0 ? colors.success : colors.warning
        : s.weightChange >= 0 ? colors.success : colors.warning;

  return (
    <Screen>
      <Title>Progress</Title>
      <Subtitle>Goal: {profile.goal === 'weight_loss' ? 'Weight loss' : 'Muscle gain'} · {profile.targetWeightKg} kg target</Subtitle>

      <View style={styles.tiles}>
        <StatTile
          label="Current"
          value={s.currentWeight !== null ? `${s.currentWeight}` : '—'}
          sub="kg"
        />
        <StatTile
          label="7-day avg"
          value={s.sevenDayAvg !== null ? `${s.sevenDayAvg}` : '—'}
          sub="kg"
          accent={colors.accent}
        />
        <StatTile
          label="Change"
          value={s.weightChange !== null ? `${s.weightChange > 0 ? '+' : ''}${s.weightChange}` : '—'}
          sub="kg since start"
          accent={changeColor}
        />
        <StatTile
          label="Workouts"
          value={`${s.workoutsCompleted}`}
          sub="this week"
          accent={colors.success}
        />
      </View>

      <Card>
        <SectionHeader>Goal progress</SectionHeader>
        <Bar pct={s.goalProgressPct ?? 0} color={colors.primary} />
        <Text style={styles.pct}>
          {s.goalProgressPct !== null ? `${s.goalProgressPct}% toward target` : 'Log your weight to track this'}
        </Text>
      </Card>

      <Card>
        <SectionHeader>Daily protein adherence</SectionHeader>
        <Bar pct={s.proteinAdherencePct ?? 0} color={colors.accent} />
        <Text style={styles.pct}>
          {s.proteinAdherencePct !== null
            ? `${s.proteinAdherencePct}% of your ${plan?.macros.proteinG ?? '—'}g target`
            : 'Log meals to track this'}
        </Text>
      </Card>

      <Card>
        <SectionHeader>Weekly consistency</SectionHeader>
        <Bar pct={s.weeklyConsistencyPct} color={colors.success} />
        <Text style={styles.pct}>{s.weeklyConsistencyPct}% of days logged this week</Text>
      </Card>

      <Card>
        <SectionHeader>Weekly review</SectionHeader>
        <Text style={styles.pct}>
          Check in every 7 days so your plan adapts to your results.
        </Text>
        {lastAdjustment && (
          <Text style={styles.lastAdj}>
            Last update: {lastAdjustment.calorieDelta === 0
              ? 'no calorie change'
              : `${lastAdjustment.calorieDelta > 0 ? '+' : ''}${lastAdjustment.calorieDelta} kcal`}
          </Text>
        )}
        <Button label="Start weekly review" onPress={() => router.push('/weekly-review')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  barTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill },
  pct: { color: colors.textDim, fontSize: font.small },
  lastAdj: { color: colors.primary, fontSize: font.small, fontWeight: '600' },
});
