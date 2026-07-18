import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, Eyebrow, Screen, SectionHeader, StatusPill, Subtitle, Title } from '@/components/ui';
import { AchievementBurst, DirectionalReveal, Reveal, StaggerText, usePressMotion } from '@/components/motion';
import { AnimatedBorder, Gradient, GlowPulse, ParticleField } from '@/components/depth';
import { repairDay, SITUATIONS } from '@/engine/planRepair';
import { useAppStore } from '@/store/appStore';
import { colors, font, glass, gradients, radius, spacing } from '@/theme';
import type { RepairResult, RepairSituation } from '@/types';

const TILE_TINTS = [colors.primaryDim, colors.peachDim, colors.accentDim, colors.successDim, colors.warningDim];

const REPAIR_STEPS: { title: string; text: string }[] = [
  { title: 'Pick the situation', text: 'Choose whatever actually got in the way today.' },
  { title: 'We rework the day', text: 'A shorter session, smarter swaps, or a recovery focus.' },
  { title: 'The week stays intact', text: 'Your weekly target adjusts instead of breaking.' },
];

// Plan Repair — the app repairs the day instead of showing failure.
export default function Repair() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const { plan, profile, updateTodayLog, recordRepairCompleted } = useAppStore();
  const [result, setResult] = useState<RepairResult | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Count the repaired day once (drives the "First repaired day" milestone).
  const commitRepair = (opts?: { markWorkoutDone?: boolean }) => {
    if (opts?.markWorkoutDone) updateTodayLog({ workoutCompleted: true });
    if (!recorded) {
      recordRepairCompleted();
      setRecorded(true);
    }
  };

  const finishRepair = (opts?: { markWorkoutDone?: boolean }) => {
    commitRepair(opts);
    router.back();
  };

  // Celebrated path: store calls fire immediately, the burst plays, then we
  // return to Today when it finishes (never double-fires — guarded below).
  const markSessionDone = () => {
    if (celebrating) return;
    commitRepair({ markWorkoutDone: true });
    setCelebrating(true);
  };

  if (!plan || !profile) {
    return (
      <Screen>
        <Title>Plan Repair</Title>
        <Subtitle>You need an active plan first.</Subtitle>
      </Screen>
    );
  }

  const choose = (s: RepairSituation) => setResult(repairDay(s, plan, profile));
  const safeColor = result?.weeklyTargetSafe ? colors.success : colors.warning;

  return (
    <>
    <Screen maxWidth={1080}>
      <View style={styles.closeRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close plan repair"
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={20} color={colors.textDim} />
        </Pressable>
      </View>

      {!result ? (
        <>
          <Reveal style={[styles.header, compact && styles.headerCompact]}>
            <View style={styles.headerCopy}>
              <Eyebrow>PLAN REPAIR</Eyebrow>
              <StaggerText text="What happened?" accentWords={['happened?']} style={styles.titleText} />
              <Subtitle>
                Life gets in the way. Pick what’s going on and we’ll fix today —
                no guilt, no broken streak.
              </Subtitle>
            </View>
            <View style={compact ? styles.headerActionCompact : undefined}>
              <StatusPill label="No-guilt mode" color={colors.success} />
            </View>
          </Reveal>

          <View style={[styles.pickerLayout, compact && styles.pickerLayoutCompact]}>
            <View style={[styles.grid, compact && styles.gridCompact]}>
              {SITUATIONS.map((s, index) => (
                <SituationTile
                  key={s.key}
                  icon={s.icon}
                  label={s.label}
                  tint={TILE_TINTS[index % TILE_TINTS.length]}
                  delay={index * 60}
                  wide={!compact}
                  onPress={() => choose(s.key)}
                />
              ))}
            </View>

            {!compact ? (
              <DirectionalReveal delay={180} style={styles.explainer}>
                <ParticleField count={10} />
                <Text style={styles.explainerEyebrow}>HOW REPAIR WORKS</Text>
                <Text style={styles.explainerTitle}>Bad days are part of the plan.</Text>
                {REPAIR_STEPS.map((step, index) => (
                  <View key={step.title} style={styles.explainerRow}>
                    <View style={styles.explainerNumber}>
                      <Text style={styles.explainerNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.explainerCopy}>
                      <Text style={styles.explainerRowTitle}>{step.title}</Text>
                      <Text style={styles.explainerRowText}>{step.text}</Text>
                    </View>
                  </View>
                ))}
              </DirectionalReveal>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Reveal key={result.situation} style={styles.headerCopy}>
            <Eyebrow>PLAN REPAIR</Eyebrow>
            <StaggerText
              text={result.title}
              accentWords={[result.title.split(' ').slice(-1)[0]]}
              style={styles.titleText}
            />
          </Reveal>

          {/* Signature: the "repair stitch" — an animated seam traces around the
              verdict card while a glow breathes behind it. */}
          <Reveal delay={40}>
            <GlowPulse color={safeColor} radius={radius.lg} intensity={0.14}>
              <AnimatedBorder
                radius={radius.lg}
                borderWidth={1.5}
                colors={['rgba(216,255,114,0)', colors.success, colors.primary, 'rgba(216,255,114,0)']}
                fill={colors.surfaceSunken}
                speed={6400}
              >
                <View style={styles.verdictInner}>
                  <Gradient
                    colors={result.weeklyTargetSafe ? gradients.success : gradients.peach}
                    direction="diagonal"
                    opacity={0.12}
                    radius={radius.lg - 2}
                  />
                  <StatusPill
                    label={result.weeklyTargetSafe ? 'Weekly target still achievable' : 'Weekly target at risk'}
                    color={safeColor}
                  />
                  <Text style={styles.message}>{result.message}</Text>
                  {!result.weeklyTargetSafe ? (
                    <Text style={styles.verdictHint}>Try not to miss the next one.</Text>
                  ) : null}
                </View>
              </AnimatedBorder>
            </GlowPulse>
          </Reveal>

          {result.workout && (
            <Reveal delay={80}>
              <Card tone="glass">
                <SectionHeader>{result.workout.focus}</SectionHeader>
                {result.workout.exercises.map((e) => (
                  <View key={e.exerciseId} style={styles.exRow}>
                    <View style={styles.exDot}>
                      <Gradient colors={gradients.primary} radius={3} />
                    </View>
                    <Text style={styles.exName}>{e.name}</Text>
                    <Text style={styles.exMeta}>{e.sets}×{e.reps} · rest {e.restSec}s</Text>
                  </View>
                ))}
              </Card>
            </Reveal>
          )}

          {result.mealSwaps && result.mealSwaps.length > 0 && (
            <Reveal delay={160}>
              <Card tone="glass">
                <SectionHeader>Suggested swaps</SectionHeader>
                {result.mealSwaps.map((sw, i) => (
                  <Text key={i} style={styles.swap}>
                    {sw.slot}: {sw.from} → <Text style={{ color: colors.primary }}>{sw.to}</Text>
                  </Text>
                ))}
              </Card>
            </Reveal>
          )}

          <Reveal delay={240}>
            <Card tone="glass">
              <SectionHeader>How to handle it</SectionHeader>
              {result.guidance.map((g, i) => (
                <View key={i} style={styles.guideRow}>
                  <View style={[styles.exDot, styles.guideDot]}>
                    <Gradient colors={gradients.success} radius={3} />
                  </View>
                  <Text style={styles.guide}>{g}</Text>
                </View>
              ))}
            </Card>
          </Reveal>

          {result.workout && (
            <Button
              label="Mark this session done"
              onPress={markSessionDone}
              disabled={celebrating}
            />
          )}
          <View style={[styles.secondaryActions, compact && styles.secondaryActionsCompact]}>
            <Button
              label="Choose something else"
              variant="ghost"
              onPress={() => setResult(null)}
              disabled={celebrating}
              style={compact ? undefined : styles.secondaryButton}
            />
            <Button
              label="Done"
              variant="secondary"
              onPress={() => finishRepair()}
              disabled={celebrating}
              style={compact ? undefined : styles.secondaryButton}
            />
          </View>
        </>
      )}
    </Screen>
    <AchievementBurst
      visible={celebrating}
      title="Session locked in"
      detail="DAY REPAIRED"
      onFinished={() => router.back()}
    />
    </>
  );
}

function SituationTile({
  icon,
  label,
  tint,
  delay,
  wide,
  onPress,
}: {
  icon: string;
  label: string;
  tint: string;
  delay: number;
  wide: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Reveal delay={delay} style={[styles.tileWrap, wide && styles.tileWrapWide]}>
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          {...pressHandlers}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        >
          <View style={[styles.tileIcon, { backgroundColor: tint }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Text style={styles.tileLabel}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end', marginBottom: -8 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.xs },
  headerActionCompact: { alignSelf: 'flex-start' },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  pickerLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  pickerLayoutCompact: { flexDirection: 'column' },
  grid: { flex: 1.3, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCompact: { flex: undefined, width: '100%' },
  tileWrap: { flexGrow: 1, flexBasis: '44%' },
  tileWrapWide: { flexBasis: '30%' },
  tile: {
    minHeight: 96,
    backgroundColor: glass.fill,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  tilePressed: { opacity: 0.85 },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 19 },
  tileLabel: { color: colors.text, fontWeight: '700', fontSize: font.body },
  explainer: {
    flex: 0.7,
    minWidth: 250,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryDim,
    overflow: 'hidden',
  },
  explainerEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.1 },
  explainerTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  explainerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  explainerNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDim,
  },
  explainerNumberText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  explainerCopy: { flex: 1, gap: 2 },
  explainerRowTitle: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  explainerRowText: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  verdictInner: { padding: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
  message: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  verdictHint: { color: colors.textDim, fontSize: font.small },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exDot: { width: 8, height: 8, borderRadius: 4, overflow: 'hidden' },
  exName: { color: colors.text, fontSize: font.small, fontWeight: '600', flex: 1 },
  exMeta: { color: colors.textDim, fontSize: font.tiny },
  swap: { color: colors.text, fontSize: font.small, lineHeight: 22, textTransform: 'capitalize' },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 3 },
  guideDot: { marginTop: 7 },
  guide: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 22 },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryActionsCompact: { flexDirection: 'column' },
  secondaryButton: { flex: 1 },
});
