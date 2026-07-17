import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Award,
  Camera,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Dna,
  LockKeyhole,
  Ruler,
  Sparkles,
  Target,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Button, Card, PageHeader, ProgressRing, Screen, StatusPill } from '@/components/ui';
import { AnimatedNumber } from '@/components/motion';
import { Gradient } from '@/components/depth';
import { computeAdherence } from '@/engine/adherence';
import { detectHabits } from '@/engine/habits';
import { computeMilestones } from '@/engine/milestones';
import { goalLabel } from '@/engine/nutrition';
import { summarize } from '@/engine/progress';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { DailyLog, HabitInsight } from '@/types';

const BAND_COLOR = { building: colors.warning, solid: colors.primary, excellent: colors.success };
const BAND_GRADIENT = { building: gradients.peach, solid: gradients.primary, excellent: gradients.success };
const SEVERITY_COLOR: Record<HabitInsight['severity'], string> = {
  info: colors.textDim,
  suggestion: colors.accent,
  warning: colors.warning,
};

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

export default function Progress() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const { logs, profile, plan, adjustments, measurements, reviews, repairsCompleted } = useAppStore();
  const summary = useMemo(() => summarize(logs, profile, plan), [logs, profile, plan]);
  const adherence = useMemo(() => computeAdherence(logs, measurements, profile, plan), [logs, measurements, profile, plan]);
  const insights = useMemo(() => detectHabits(logs, profile), [logs, profile]);
  const milestones = useMemo(() => computeMilestones({ logs, measurements, reviews, repairsCompleted, profile }), [logs, measurements, reviews, repairsCompleted, profile]);
  const weightLogs = useMemo(() => Object.values(logs)
    .filter((item): item is DailyLog & { weightKg: number } => typeof item.weightKg === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14), [logs]);

  if (!profile) {
    return <Screen><PageHeader title="Progress" subtitle="Finish onboarding to start tracking progress." /></Screen>;
  }

  const achieved = milestones.filter((item) => item.achieved).length;
  const lastAdjustment = adjustments[adjustments.length - 1];
  const currentWeight = summary.currentWeight ?? profile.currentWeightKg;
  const distance = Math.abs(currentWeight - profile.targetWeightKg).toFixed(1);
  const goalProgress = summary.goalProgressPct ?? 0;

  return (
    <Screen maxWidth={1180}>
      <PageHeader
        eyebrow="YOUR MOMENTUM"
        title="Progress you can actually read."
        subtitle={`${goalLabel(profile.goal)} · ${profile.targetWeightKg} kg target · ${distance} kg remaining`}
        action={<StatusPill label={`${adherence.band} consistency`} color={BAND_COLOR[adherence.band]} icon={<Sparkles size={13} color={BAND_COLOR[adherence.band]} />} />}
      />

      <View style={[styles.heroGrid, compact && styles.heroGridCompact]}>
        <View style={styles.goalCard}>
          <View style={styles.goalCopy}>
            <Text style={styles.cardEyebrow}>GOAL TRAJECTORY</Text>
            <AnimatedNumber value={currentWeight} suffix=" kg" decimals={1} style={styles.goalTitle} />
            <Text style={styles.goalSub}>Current trend toward {profile.targetWeightKg} kg</Text>
            <View style={styles.goalStats}>
              <MiniStat label="7-day avg" value={summary.sevenDayAvg !== null ? `${summary.sevenDayAvg} kg` : 'Collecting'} color={colors.accent} />
              <MiniStat label="Change" value={summary.weightChange !== null ? `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange} kg` : 'No trend yet'} color={colors.peach} />
            </View>
          </View>
          <ProgressRing progress={goalProgress} value={`${goalProgress}%`} label="to goal" size={compact ? 112 : 140} gradient={gradients.primary} />
        </View>

        <Card tone="raised" style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View><Text style={styles.cardEyebrow}>WEIGHT SIGNAL</Text><Text style={styles.cardTitle}>Last 14 check-ins</Text></View>
            <ChartNoAxesCombined size={21} color={colors.accent} />
          </View>
          <WeightChart data={weightLogs} target={profile.targetWeightKg} baseline={profile.currentWeightKg} />
        </Card>
      </View>

      <Pressable style={[styles.twinBanner, compact && styles.twinBannerCompact]} onPress={() => router.push('/digital-twin')}>
        <EvidenceMatrix score={adherence.score} compact={compact} />
        <View style={[styles.twinCopy, compact && styles.twinCopyCompact]}>
          <View style={styles.twinLabel}><Dna size={15} color={colors.accent} /><Text style={styles.twinEyebrow}>FITPLAN DIGITAL TWIN</Text></View>
          <Text style={styles.twinTitle}>Your plan learns from your real behavior.</Text>
          <Text style={styles.twinSub}>See the evidence behind recovery, calorie, and adherence recommendations.</Text>
        </View>
        <View style={[styles.twinArrow, compact && styles.twinArrowCompact]}>
          <Gradient colors={gradients.accent} direction="diagonal" radius={radius.md} />
          <View><ArrowUpRight size={20} color={colors.black} /></View>
        </View>
      </Pressable>

      <View style={[styles.dashboardGrid, compact && styles.dashboardGridCompact]}>
        <Card tone="raised" style={styles.adherenceCard}>
          <View style={styles.scoreHeader}>
            <View><Text style={styles.cardEyebrow}>14-DAY BEHAVIOR SCORE</Text><Text style={styles.cardTitle}>Adherence</Text></View>
            <ProgressRing progress={adherence.score} value={`${adherence.score}`} label="score" size={96} accent={BAND_COLOR[adherence.band]} gradient={BAND_GRADIENT[adherence.band]} />
          </View>
          <Text style={styles.supportCopy}>{scoreMessage(adherence.band)}</Text>
          <View style={styles.componentList}>
            {adherence.components.map((component) => (
              <View key={component.key} style={styles.componentRow}>
                <View style={styles.componentLabelRow}><Text style={styles.componentLabel}>{component.label}</Text><Text style={styles.componentValue}>{component.score}%</Text></View>
                <Bar pct={component.score} color={BAND_COLOR[adherence.band]} />
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.sideStack}>
          <Pressable onPress={() => router.push('/milestones')}>
            <Card style={styles.milestoneCard}>
              <View style={styles.cardActionHeader}>
                <View><Text style={styles.cardEyebrow}>MOMENTUM MARKERS</Text><Text style={styles.cardTitle}>Milestones</Text></View>
                <Text style={styles.link}>{achieved}/{milestones.length}</Text>
              </View>
              <View style={styles.milestoneRow}>
                {milestones.map((milestone) => (
                  <View key={milestone.id} style={[styles.milestone, milestone.achieved && styles.milestoneOn]}>
                    {milestone.achieved ? <Check size={16} color={colors.black} strokeWidth={3} /> : <LockKeyhole size={14} color={colors.textMuted} />}
                  </View>
                ))}
              </View>
            </Card>
          </Pressable>

          <Card style={styles.actionsCard}>
            <Text style={styles.cardEyebrow}>MORE THAN THE SCALE</Text>
            <Text style={styles.cardTitle}>Capture the full change.</Text>
            <Text style={styles.supportCopy}>Measurements, photos, strength, and how your clothes fit all count.</Text>
            <View style={styles.actionButtons}>
              <Button label="Measurements" variant="ghost" icon={<Ruler size={17} color={colors.text} />} onPress={() => router.push('/measurements')} style={styles.actionButton} />
              <Button label="Photos" variant="ghost" icon={<Camera size={17} color={colors.text} />} onPress={() => router.push('/progress-photo')} style={styles.actionButton} />
            </View>
          </Card>
        </View>
      </View>

      {insights.length ? (
        <Card tone="raised">
          <View style={styles.cardActionHeader}><View><Text style={styles.cardEyebrow}>PATTERN DETECTION</Text><Text style={styles.cardTitle}>What your data is saying</Text></View><Sparkles size={20} color={colors.primary} /></View>
          <View style={styles.insightGrid}>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insight}>
                <View style={[styles.insightMarker, { backgroundColor: SEVERITY_COLOR[insight.severity] }]} />
                <View style={styles.insightCopy}><Text style={styles.insightPattern}>{insight.pattern}</Text><Text style={styles.insightAction}>{insight.intervention}</Text></View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <View style={[styles.reviewBand, compact && styles.reviewBandCompact]}>
        <View style={styles.reviewIcon}><Award size={22} color={colors.primary} /></View>
        <View style={styles.reviewCopy}>
          <Text style={styles.reviewTitle}>Weekly calibration</Text>
          <Text style={styles.reviewSub}>{lastAdjustment ? `Last plan update: ${lastAdjustment.calorieDelta >= 0 ? '+' : ''}${lastAdjustment.calorieDelta} kcal.` : 'A two-minute review keeps the next week realistic.'}</Text>
        </View>
        <Button label="Start review" icon={<ChevronRight size={17} color={colors.black} />} onPress={() => router.push('/weekly-review')} style={compact ? styles.reviewButtonCompact : styles.reviewButton} />
      </View>
    </Screen>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const fill = useRef(new Animated.Value(0)).current;
  const safe = Math.max(3, Math.min(100, pct));
  useEffect(() => {
    Animated.spring(fill, { toValue: safe, damping: 18, stiffness: 100, mass: 0.8, useNativeDriver: false }).start();
  }, [fill, safe]);
  return <View style={styles.barTrack}><Animated.View style={[styles.barFill, { width: fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: color }]} /></View>;
}

function EvidenceMatrix({ score, compact }: { score: number; compact: boolean }) {
  const values = [Math.max(22, score), Math.max(34, Math.round(score * 0.82)), Math.max(18, Math.round(score * 0.64))];
  const labels = ['TRAINING LOAD', 'RECOVERY', 'NUTRITION'];
  return (
    <View style={[styles.evidenceMatrix, compact && styles.evidenceMatrixCompact]}>
      <View style={styles.evidenceTarget}><Dna size={23} color={colors.accent} /><View style={styles.evidenceTargetDot} /></View>
      <View style={styles.evidenceRows}>
        {values.map((value, index) => (
          <View key={labels[index]} style={styles.evidenceRow}>
            <Text style={styles.evidenceLabel}>{labels[index]}</Text>
            <View style={styles.evidenceTrack}><View style={[styles.evidenceFill, { width: `${value}%`, backgroundColor: [colors.primary, colors.accent, colors.peach][index] }]} /></View>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={styles.miniStat}><View style={[styles.miniMarker, { backgroundColor: color }]} /><Text style={styles.miniLabel}>{label}</Text><Text style={styles.miniValue}>{value}</Text></View>;
}

function WeightChart({ data, target, baseline }: { data: (DailyLog & { weightKg: number })[]; target: number; baseline: number }) {
  const draw = useRef(new Animated.Value(1000)).current;
  const values = data.length ? data.map((item) => item.weightKg) : [baseline];
  const min = Math.min(...values, target) - 1;
  const max = Math.max(...values, target) + 1;
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 20 : 20 + (index / (values.length - 1)) * 480;
    const y = 124 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  const targetY = 124 - ((target - min) / range) * 100;
  const last = points.split(' ').at(-1)?.split(',').map(Number) ?? [20, 70];

  useEffect(() => {
    draw.setValue(1000);
    Animated.timing(draw, { toValue: 0, duration: 1100, useNativeDriver: false }).start();
  }, [draw, points]);

  return (
    <View style={styles.chartWrap}>
      <Svg width="100%" height={146} viewBox="0 0 520 146">
        {[24, 74, 124].map((y) => <Line key={y} x1="20" y1={y} x2="500" y2={y} stroke={colors.border} strokeWidth="1" />)}
        <Line x1="20" y1={targetY} x2="500" y2={targetY} stroke={colors.primary} strokeWidth="1.5" strokeDasharray="6 7" opacity={0.65} />
        {values.length > 1 ? <AnimatedPolyline points={points} fill="none" stroke={colors.accent} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset={draw as any} /> : null}
        <Circle cx={last[0]} cy={last[1]} r="7" fill={colors.bg} stroke={colors.accent} strokeWidth="4" />
      </Svg>
      <View style={styles.chartLegend}><View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.accent }]} /><Text style={styles.legendText}>{data.length ? `${data.length} weigh-ins` : 'Log weight to build the trend'}</Text></View><View style={styles.legendItem}><View style={[styles.legendDash, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Target {target} kg</Text></View></View>
    </View>
  );
}

function scoreMessage(band: 'building' | 'solid' | 'excellent') {
  if (band === 'excellent') return 'Excellent. Your routine is consistent enough for reliable adjustments.';
  if (band === 'solid') return 'Solid. Keep the repeatable behaviors and improve one weak signal at a time.';
  return 'Building. Small logged actions matter more than perfect days.';
}

const styles = StyleSheet.create({
  cardEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 3 },
  heroGrid: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  heroGridCompact: { flexDirection: 'column' },
  goalCard: { flex: 0.9, minHeight: 238, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#52682B', borderRadius: radius.md, padding: spacing.xl },
  goalCopy: { flex: 1, gap: spacing.xs },
  goalTitle: { color: colors.text, fontSize: 34, fontWeight: '900' },
  goalSub: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  goalStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  miniStat: { gap: 2 },
  miniMarker: { width: 21, height: 3, borderRadius: 2, marginBottom: 4 },
  miniLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase' },
  miniValue: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  chartCard: { flex: 1.1, minHeight: 238 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartWrap: { flex: 1, justifyContent: 'flex-end' },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendDash: { width: 14, height: 2 },
  legendText: { color: colors.textMuted, fontSize: font.tiny },
  twinBanner: { minHeight: 168, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: '#345274', backgroundColor: colors.accentDim, paddingRight: spacing.lg },
  twinBannerCompact: { minHeight: 330, flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingRight: 0 },
  evidenceMatrix: { width: 250, alignSelf: 'stretch', justifyContent: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.black, borderRightWidth: 1, borderRightColor: '#345274' },
  evidenceMatrixCompact: { width: '100%', minHeight: 145, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: '#345274' },
  evidenceTarget: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  evidenceTargetDot: { position: 'absolute', right: -3, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  evidenceRows: { gap: 8 },
  evidenceRow: { gap: 4 },
  evidenceLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  evidenceTrack: { height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.surfaceMuted },
  evidenceFill: { height: '100%', borderRadius: 2 },
  twinCopy: { flex: 1, gap: 5, paddingVertical: spacing.lg },
  twinCopyCompact: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, paddingRight: 70 },
  twinLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  twinEyebrow: { color: colors.accent, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  twinTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  twinSub: { color: colors.textDim, fontSize: font.small, lineHeight: 20, maxWidth: 640 },
  twinArrow: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, overflow: 'hidden' },
  twinArrowCompact: { position: 'absolute', right: spacing.md, bottom: spacing.md },
  dashboardGrid: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  dashboardGridCompact: { flexDirection: 'column' },
  adherenceCard: { flex: 1.25 },
  sideStack: { flex: 0.75, gap: spacing.md },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  supportCopy: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  componentList: { gap: spacing.sm, marginTop: spacing.sm },
  componentRow: { gap: 5 },
  componentLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  componentLabel: { color: colors.textDim, fontSize: font.tiny },
  componentValue: { color: colors.text, fontSize: font.tiny, fontWeight: '800' },
  barTrack: { height: 7, backgroundColor: colors.surfaceMuted, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  milestoneCard: { minHeight: 128 },
  cardActionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  link: { color: colors.primary, fontSize: font.small, fontWeight: '900' },
  milestoneRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  milestone: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  milestoneOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionsCard: { flex: 1 },
  actionButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  insight: { flexGrow: 1, flexBasis: 300, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  insightMarker: { width: 4, minHeight: 44, borderRadius: 2 },
  insightCopy: { flex: 1, gap: 4 },
  insightPattern: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  insightAction: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  reviewBand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  reviewBandCompact: { flexWrap: 'wrap' },
  reviewIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  reviewCopy: { flex: 1, minWidth: 200 },
  reviewTitle: { color: colors.text, fontSize: font.small, fontWeight: '900' },
  reviewSub: { color: colors.textDim, fontSize: font.tiny, marginTop: 3 },
  reviewButton: { minWidth: 150 },
  reviewButtonCompact: { width: '100%' },
});
