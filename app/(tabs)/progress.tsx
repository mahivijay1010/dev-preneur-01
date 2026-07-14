import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, SectionHeader, StatTile, Subtitle, Title } from '@/components/ui';
import { computeAdherence } from '@/engine/adherence';
import { detectHabits } from '@/engine/habits';
import { computeMilestones } from '@/engine/milestones';
import { summarize } from '@/engine/progress';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { HabitInsight } from '@/types';

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}

const BAND_COLOR = { building: colors.warning, solid: colors.primary, excellent: colors.success };
const SEVERITY_COLOR: Record<HabitInsight['severity'], string> = {
  info: colors.textDim,
  suggestion: colors.accent,
  warning: colors.warning,
};

export default function Progress() {
  const router = useRouter();
  const { logs, profile, plan, adjustments, measurements, reviews, repairsCompleted } =
    useAppStore();
  const s = useMemo(() => summarize(logs, profile, plan), [logs, profile, plan]);
  const adherence = useMemo(
    () => computeAdherence(logs, measurements, profile, plan),
    [logs, measurements, profile, plan],
  );
  const insights = useMemo(() => detectHabits(logs, profile), [logs, profile]);
  const milestones = useMemo(
    () => computeMilestones({ logs, measurements, reviews, repairsCompleted, profile }),
    [logs, measurements, reviews, repairsCompleted, profile],
  );
  const milestonesAchieved = milestones.filter((m) => m.achieved).length;
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

      {/* Digital Twin — the moat */}
      <Pressable onPress={() => router.push('/digital-twin')}>
        <View style={styles.twinBanner}>
          <Text style={styles.twinIcon}>🧬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.twinTitle}>Your Digital Twin</Text>
            <Text style={styles.twinSub}>Learned insights & explainable adjustments</Text>
          </View>
          <Text style={styles.twinArrow}>›</Text>
        </View>
      </Pressable>

      {/* Adherence score */}
      <Card>
        <View style={styles.scoreRow}>
          <View style={{ flex: 1 }}>
            <SectionHeader>Adherence score</SectionHeader>
            <Text style={styles.pct}>
              {adherence.band === 'excellent'
                ? 'Excellent — you\'re remarkably consistent.'
                : adherence.band === 'solid'
                  ? 'Solid — keep the momentum going.'
                  : 'Building — small consistent wins add up.'}
            </Text>
          </View>
          <Text style={[styles.bigScore, { color: BAND_COLOR[adherence.band] }]}>
            {adherence.score}
          </Text>
        </View>
        {adherence.components.map((c) => (
          <View key={c.key} style={styles.compRow}>
            <Text style={styles.compLabel}>{c.label}</Text>
            <View style={{ flex: 1 }}>
              <Bar pct={c.score} color={BAND_COLOR[adherence.band]} />
            </View>
            <Text style={styles.compVal}>{c.score}</Text>
          </View>
        ))}
        <Text style={styles.note}>One bad day won’t sink this — it’s a 14-day rolling view.</Text>
      </Card>

      {/* Habit intelligence */}
      {insights.length > 0 && (
        <Card>
          <SectionHeader>Insights for you</SectionHeader>
          {insights.map((h) => (
            <View key={h.id} style={styles.insight}>
              <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[h.severity] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.insightPattern}>{h.pattern}</Text>
                <Text style={styles.insightAction}>{h.intervention}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Milestones summary */}
      <Pressable onPress={() => router.push('/milestones')}>
        <Card>
          <View style={styles.scoreRow}>
            <SectionHeader>Milestones</SectionHeader>
            <Text style={styles.link}>{milestonesAchieved}/{milestones.length} ›</Text>
          </View>
          <View style={styles.badgeRow}>
            {milestones.map((m) => (
              <Text key={m.id} style={[styles.msIcon, !m.achieved && styles.msLocked]}>
                {m.achieved ? m.icon : '🔒'}
              </Text>
            ))}
          </View>
        </Card>
      </Pressable>

      {/* Non-scale progress */}
      <Card>
        <SectionHeader>Non-scale progress</SectionHeader>
        <Text style={styles.pct}>Waist, chest, arms, hips, resting HR, clothing fit & capacity.</Text>
        <Button label="Log measurements" variant="ghost" onPress={() => router.push('/measurements')} />
        <Button label="📸 Progress photos" variant="ghost" onPress={() => router.push('/progress-photo')} />
      </Card>

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
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigScore: { fontSize: 44, fontWeight: '900' },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compLabel: { color: colors.textDim, fontSize: font.tiny, width: 78 },
  compVal: { color: colors.textDim, fontSize: font.tiny, width: 26, textAlign: 'right' },
  note: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', marginTop: 4 },
  insight: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  insightPattern: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  insightAction: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  link: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  msIcon: { fontSize: 26 },
  msLocked: { opacity: 0.4 },
  twinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  twinIcon: { fontSize: 28 },
  twinTitle: { color: colors.text, fontWeight: '800', fontSize: font.h3 },
  twinSub: { color: colors.textDim, fontSize: font.tiny },
  twinArrow: { color: colors.accent, fontSize: 28, fontWeight: '700' },
});
