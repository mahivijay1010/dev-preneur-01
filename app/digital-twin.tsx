import { useRouter } from 'expo-router';
import { Activity, BrainCircuit, Dumbbell, Flame, Gauge, ShieldAlert, Sparkles, TrendingUp, X } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedNumber, Reveal } from '@/components/motion';
import { Button, PageHeader, ProgressRing, Screen } from '@/components/ui';
import { buildTwin, recommendTwinAdjustment, type TwinInputs } from '@/engine/digitalTwin';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { Confidence } from '@/types';

const CONF_COLOR: Record<Confidence, string> = { low: colors.textDim, medium: colors.warning, high: colors.success };
const RISK_COLOR = { low: colors.success, moderate: colors.warning, high: colors.danger };

export default function DigitalTwin() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const store = useAppStore();
  const inputs: TwinInputs = {
    logs: store.logs,
    measurements: store.measurements,
    reviews: store.reviews,
    adjustments: store.adjustments,
    profile: store.profile,
    plan: store.plan,
  };
  const twin = useMemo(() => buildTwin(inputs), [store.logs, store.measurements, store.reviews, store.adjustments, store.profile, store.plan]);
  const recommendation = useMemo(() => recommendTwinAdjustment(inputs), [store.logs, store.reviews, store.adjustments, store.profile, store.plan]);
  const [applied, setApplied] = useState(false);
  const signal = Math.min(100, Math.round((twin.dataDays / 14) * 100));

  const apply = () => {
    store.applyTwinAdjustment(recommendation);
    setApplied(true);
  };

  return (
    <Screen maxWidth={1080}>
      <PageHeader
        eyebrow="ADAPTIVE INTELLIGENCE"
        title="Your body, translated into useful signals."
        subtitle="The twin learns only from your approved logs and explains why it recommends a change."
        action={<CloseButton onPress={() => router.back()} />}
      />

      <Reveal delay={50} style={[styles.signalHero, !wide && styles.signalHeroStack]}>
        <View style={styles.signalVisual}>
          <View style={styles.orbitOne} />
          <View style={styles.orbitTwo} />
          <View style={styles.brainCore}><BrainCircuit size={42} color={colors.primary} /></View>
          <View style={styles.signalRing}><ProgressRing progress={signal} value={`${signal}%`} label="signal" size={112} accent={signal >= 70 ? colors.success : colors.accent} /></View>
        </View>
        <View style={styles.signalCopy}>
          <View style={styles.livePill}><Sparkles size={14} color={colors.black} /><Text style={styles.liveText}>{twin.ready ? 'TWIN ONLINE' : 'LEARNING LIVE'}</Text></View>
          <Text style={styles.signalTitle}>{twin.ready ? 'Your patterns are becoming actionable.' : `${Math.max(0, 14 - twin.dataDays)} more logged days sharpen the model.`}</Text>
          <Text style={styles.signalBody}>{recommendation.explanation}</Text>
          <View style={styles.signalStats}>
            <SignalStat value={String(twin.dataDays)} label="data days" />
            <SignalStat value={recommendation.confidence} label="confidence" accent={CONF_COLOR[recommendation.confidence]} />
            <SignalStat value={twin.preferredCoaching} label="coach mode" accent={colors.peach} />
          </View>
        </View>
      </Reveal>

      <Reveal delay={90} style={styles.adjustmentBand}>
        <View style={styles.adjustmentIcon}><Gauge size={24} color={colors.primary} /></View>
        <View style={styles.adjustmentCopy}>
          <Text style={styles.sectionEyebrow}>NEXT CALIBRATION</Text>
          <Text style={styles.adjustmentTitle}>{recommendation.calorieDelta === 0 ? 'Hold the current target' : `${recommendation.calorieDelta > 0 ? '+' : ''}${recommendation.calorieDelta} kcal adjustment`}</Text>
          {recommendation.factors.map((factor) => <Text key={factor} style={styles.factor}>• {factor}</Text>)}
        </View>
        {recommendation.calorieDelta !== 0 && !applied ? <Button label="Apply adjustment" onPress={apply} style={styles.applyButton} /> : null}
        {applied ? <View style={styles.appliedPill}><Text style={styles.appliedText}>APPLIED</Text></View> : null}
      </Reveal>

      <View style={[styles.metricGrid, !wide && styles.metricGridStack]}>
        <TwinMetric
          icon={<Flame size={23} color={colors.peach} />}
          eyebrow="ENERGY MODEL"
          title="Maintenance calories"
          value={twin.maintenanceCalories.value !== null ? `~${twin.maintenanceCalories.value} kcal` : 'Learning'}
          basis={twin.maintenanceCalories.basis}
          confidence={twin.maintenanceCalories.confidence}
          accent={colors.peach}
        />
        <TwinMetric
          icon={<Activity size={23} color={colors.accent} />}
          eyebrow="RECOVERY MODEL"
          title="Recovery pattern"
          value={capitalize(twin.recovery.value.quality)}
          basis={twin.recovery.basis}
          confidence={twin.recovery.confidence}
          accent={colors.accent}
        />
        <TwinMetric
          icon={<Dumbbell size={23} color={colors.success} />}
          eyebrow="STRENGTH MODEL"
          title="Progression"
          value={twin.strength.value.trend === 'up' ? 'Trending up' : twin.strength.value.trend === 'flat' ? 'Holding steady' : 'Collecting sets'}
          basis={twin.strength.basis}
          confidence={twin.strength.confidence}
          accent={colors.success}
        />
        <TwinMetric
          icon={<ShieldAlert size={23} color={RISK_COLOR[twin.dropoutRisk.value.level]} />}
          eyebrow="CONSISTENCY MODEL"
          title="Dropout risk"
          value={`${capitalize(twin.dropoutRisk.value.level)} · ${twin.dropoutRisk.value.score}`}
          basis={twin.dropoutRisk.value.triggers.join(' ') || 'No current consistency risk signals.'}
          confidence={twin.dropoutRisk.confidence}
          accent={RISK_COLOR[twin.dropoutRisk.value.level]}
        />
      </View>

      <Reveal delay={170} style={[styles.learningStrip, !wide && styles.learningStripStack]}>
        <View style={styles.learningIcon}><TrendingUp size={24} color={colors.black} /></View>
        <View style={styles.learningCopy}>
          <Text style={styles.sectionEyebrow}>WHAT HELPS YOU STAY CONSISTENT</Text>
          <Text style={styles.learningTitle}>{twin.adherenceDrivers.length ? twin.adherenceDrivers.join(' · ') : 'Your first repeatable pattern is still forming.'}</Text>
          <Text style={styles.learningBody}>Calorie response: {capitalize(twin.calorieResponse.value.sensitivity)}. {twin.calorieResponse.basis}</Text>
        </View>
        <View style={styles.dataCounter}>
          <AnimatedNumber value={twin.dataDays} style={styles.dataValue} />
          <Text style={styles.dataLabel}>DAYS MODELED</Text>
        </View>
      </Reveal>

      <Text style={styles.footer}>This is an explainable estimate, not a diagnosis. More consistent logs produce more useful recommendations.</Text>
    </Screen>
  );
}

function SignalStat({ value, label, accent = colors.primary }: { value: string; label: string; accent?: string }) {
  return <View style={styles.signalStat}><View style={[styles.statMarker, { backgroundColor: accent }]} /><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function TwinMetric({ icon, eyebrow, title, value, basis, confidence, accent }: { icon: ReactNode; eyebrow: string; title: string; value: string; basis: string; confidence: Confidence; accent: string }) {
  return (
    <Reveal style={[styles.metricPanel, { borderTopColor: accent }]}>
      <View style={styles.metricTop}><View style={[styles.metricIcon, { backgroundColor: `${accent}1F` }]}>{icon}</View><ConfidenceBadge value={confidence} /></View>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricBasis}>{basis}</Text>
    </Reveal>
  );
}

function ConfidenceBadge({ value }: { value: Confidence }) {
  return <View style={[styles.confidence, { borderColor: CONF_COLOR[value] }]}><View style={[styles.confidenceDot, { backgroundColor: CONF_COLOR[value] }]} /><Text style={[styles.confidenceText, { color: CONF_COLOR[value] }]}>{value.toUpperCase()}</Text></View>;
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityLabel="Close digital twin" style={styles.closeButton} onPress={onPress}><X size={21} color={colors.text} /></Pressable>;
}

function capitalize(value: string) { return `${value.charAt(0).toUpperCase()}${value.slice(1)}`; }

const styles = StyleSheet.create({
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  signalHero: { minHeight: 330, flexDirection: 'row', borderWidth: 1, borderColor: colors.accentDim, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken, overflow: 'hidden', ...shadow.card },
  signalHeroStack: { flexDirection: 'column' },
  signalVisual: { minHeight: 300, flex: 0.8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentDim, overflow: 'hidden' },
  orbitOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: '#315172' },
  orbitTwo: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: colors.primaryDim },
  brainCore: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#13202C', borderWidth: 1, borderColor: colors.accent },
  signalRing: { position: 'absolute', right: spacing.md, bottom: spacing.md },
  signalCopy: { flex: 1.2, padding: spacing.xl, justifyContent: 'center', gap: spacing.md },
  livePill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.primary },
  liveText: { color: colors.black, fontSize: font.tiny, fontWeight: '900' },
  signalTitle: { color: colors.text, fontSize: font.h1, lineHeight: 36, fontWeight: '900', maxWidth: 590 },
  signalBody: { color: colors.textDim, fontSize: font.body, lineHeight: 23, maxWidth: 620 },
  signalStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  signalStat: { minWidth: 100, gap: 3 },
  statMarker: { width: 24, height: 3, borderRadius: 2 },
  statValue: { color: colors.text, fontSize: font.h3, fontWeight: '900', textTransform: 'capitalize' },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, textTransform: 'uppercase' },
  adjustmentBand: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.primaryDim, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  adjustmentIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  adjustmentCopy: { flex: 1, minWidth: 220, gap: 3 },
  sectionEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900' },
  adjustmentTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  factor: { color: colors.textDim, fontSize: font.small },
  applyButton: { minWidth: 190 },
  appliedPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.successDim, borderWidth: 1, borderColor: colors.success },
  appliedText: { color: colors.success, fontSize: font.tiny, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricGridStack: { flexDirection: 'column' },
  metricPanel: { flexGrow: 1, flexBasis: '45%', minHeight: 230, padding: spacing.lg, borderWidth: 1, borderTopWidth: 3, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.sm },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  confidence: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  confidenceDot: { width: 5, height: 5, borderRadius: 3 },
  confidenceText: { fontSize: 9, fontWeight: '900' },
  metricTitle: { color: colors.textDim, fontSize: font.small, fontWeight: '700' },
  metricValue: { fontSize: font.h2, fontWeight: '900', textTransform: 'capitalize' },
  metricBasis: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  learningStrip: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.accentDim, borderWidth: 1, borderColor: '#345878' },
  learningStripStack: { flexDirection: 'column', alignItems: 'flex-start' },
  learningIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  learningCopy: { flex: 1, minWidth: 0, gap: 4 },
  learningTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  learningBody: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  dataCounter: { minWidth: 110, alignItems: 'center' },
  dataValue: { color: colors.accent, fontSize: 40, fontWeight: '900' },
  dataLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  footer: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, textAlign: 'center' },
});
