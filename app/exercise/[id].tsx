import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, ListOrdered, ScanLine, Target, TriangleAlert, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Gradient, GlowPulse } from '@/components/depth';
import { AnimatedNumber, Reveal, StaggerText, usePressMotion, useReducedMotion } from '@/components/motion';
import { Button, Card, PageHeader, Screen, SectionHeader, StatusPill } from '@/components/ui';
import { EXERCISES } from '@/data/exercises';
import { FORM_GUIDES } from '@/data/formCues';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { FormExercise } from '@/types';

type Joint = 'head' | 'shoulder' | 'elbow' | 'hand' | 'hip' | 'knee' | 'ankle';
type Pose = Record<Joint, [number, number]>;
type DemoKind = 'squat' | 'pushup' | 'lunge' | 'plank' | 'press' | 'curl';

// Two keyframes per movement (start ↔ working position), authored in a
// 120×130 side-view space. The figure animates between them to show tempo and
// range of motion.
const POSES: Record<DemoKind, { start: Pose; end: Pose; label: [string, string] }> = {
  squat: {
    label: ['Stand tall', 'Sit down & back'],
    start: { head: [55, 16], shoulder: [55, 32], elbow: [64, 40], hand: [72, 44], hip: [55, 64], knee: [55, 92], ankle: [55, 118] },
    end: { head: [48, 42], shoulder: [49, 52], elbow: [60, 54], hand: [70, 54], hip: [45, 74], knee: [63, 92], ankle: [56, 118] },
  },
  lunge: {
    label: ['Split stance', 'Drop the hips'],
    start: { head: [55, 16], shoulder: [55, 32], elbow: [59, 48], hand: [60, 62], hip: [55, 64], knee: [64, 92], ankle: [66, 118] },
    end: { head: [55, 40], shoulder: [55, 54], elbow: [59, 68], hand: [60, 80], hip: [55, 84], knee: [76, 96], ankle: [76, 118] },
  },
  pushup: {
    label: ['Arms extended', 'Chest to floor'],
    start: { head: [95, 60], shoulder: [86, 62], elbow: [86, 88], hand: [86, 112], hip: [58, 70], knee: [38, 74], ankle: [18, 78] },
    end: { head: [95, 74], shoulder: [86, 76], elbow: [78, 96], hand: [86, 112], hip: [58, 84], knee: [38, 88], ankle: [18, 92] },
  },
  plank: {
    label: ['Hold the line', 'Brace & breathe'],
    start: { head: [95, 66], shoulder: [86, 68], elbow: [80, 92], hand: [66, 112], hip: [58, 74], knee: [38, 78], ankle: [18, 82] },
    end: { head: [95, 68], shoulder: [86, 70], elbow: [80, 94], hand: [66, 112], hip: [58, 77], knee: [38, 81], ankle: [18, 85] },
  },
  press: {
    label: ['At the shoulders', 'Press overhead'],
    start: { head: [55, 18], shoulder: [55, 34], elbow: [67, 36], hand: [64, 24], hip: [55, 66], knee: [55, 94], ankle: [55, 120] },
    end: { head: [55, 18], shoulder: [55, 34], elbow: [58, 18], hand: [57, 4], hip: [55, 66], knee: [55, 94], ankle: [55, 120] },
  },
  curl: {
    label: ['Arm extended', 'Curl to shoulder'],
    start: { head: [55, 16], shoulder: [55, 32], elbow: [60, 52], hand: [62, 70], hip: [55, 64], knee: [55, 92], ankle: [55, 118] },
    end: { head: [55, 16], shoulder: [55, 32], elbow: [60, 52], hand: [58, 34], hip: [55, 64], knee: [55, 92], ankle: [55, 118] },
  },
};

const FORM_FOR_KIND: Record<DemoKind, FormExercise> = {
  squat: 'squat', pushup: 'pushup', lunge: 'lunge', plank: 'plank', press: 'shoulder_press', curl: 'bicep_curl',
};

const MUSCLES: Record<DemoKind, string> = {
  squat: 'Quads, glutes, and core',
  lunge: 'Quads, glutes, and balance',
  pushup: 'Chest, shoulders, and triceps',
  plank: 'Deep core and shoulders',
  press: 'Shoulders and triceps',
  curl: 'Biceps and forearms',
};

// The joint that travels most during the movement — the range-of-motion focus.
const WORKING_JOINT: Record<DemoKind, Joint> = {
  squat: 'hip', lunge: 'hip', curl: 'elbow', press: 'elbow', pushup: 'shoulder', plank: 'shoulder',
};

function demoKindFor(name: string): DemoKind {
  const n = name.toLowerCase();
  if (/shoulder press|overhead|ohp|military|push press/.test(n)) return 'press';
  if (/curl/.test(n)) return 'curl';
  if (/lunge|split squat|step.?up/.test(n)) return 'lunge';
  if (/plank|hold|hollow/.test(n)) return 'plank';
  if (/push.?up|press.?up|chest press|bench|dip/.test(n)) return 'pushup';
  if (/squat|sit|hinge|deadlift|glute/.test(n)) return 'squat';
  return 'squat';
}

function toSteps(instructions: string): string[] {
  return instructions
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ExerciseDemo() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = EXERCISES.find((e) => e.id === id);

  if (!exercise) {
    return (
      <Screen>
        <PageHeader
          eyebrow="MOVEMENT LIBRARY"
          title="Exercise not found"
          subtitle="We couldn’t find that movement. Head back and pick another."
          action={<CloseButton onPress={() => router.back()} />}
        />
        <Button label="Back" variant="ghost" icon={<ArrowLeft size={18} color={colors.text} />} onPress={() => router.back()} />
      </Screen>
    );
  }

  const kind = demoKindFor(exercise.name);
  const guide = FORM_GUIDES[FORM_FOR_KIND[kind]];
  const steps = toSteps(exercise.instructions);
  const lastWord = exercise.name.trim().split(/\s+/).at(-1) ?? exercise.name;

  const figure = <FigureDemo kind={kind} />;

  const formCuesCard = (
    <Card tone="raised">
      <View style={styles.rowHead}><View><Target size={17} color={colors.success} /></View><Text style={styles.rowHeadText}>Form cues · tempo {guide.tempo}</Text></View>
      {guide.cues.map((c, i) => (
        <View key={i} style={styles.cueRow}>
          <CheckCircle2 size={14} color={colors.success} />
          <Text style={styles.cue}>{c}</Text>
        </View>
      ))}
    </Card>
  );

  const howToCard = (
    <Card tone="raised">
      <View style={styles.rowHead}><View><ListOrdered size={17} color={colors.primary} /></View><Text style={styles.rowHeadText}>How to perform</Text></View>
      {steps.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
          <Text style={styles.stepText}>{s}</Text>
        </View>
      ))}
    </Card>
  );

  const mistakesCard = (
    <Card tone="raised" style={styles.mistakesCard}>
      <View style={styles.rowHead}><View><TriangleAlert size={17} color={colors.warning} /></View><Text style={styles.rowHeadText}>Common mistakes</Text></View>
      {guide.warnings.map((w, i) => (
        <Reveal key={i} delay={60 + i * 70}>
          <View style={styles.mistakeRow}>
            <View style={styles.mistakeIcon}><TriangleAlert size={14} color={colors.warning} /></View>
            <Text style={styles.mistakeIndex}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={styles.mistakeText}>{w}</Text>
          </View>
        </Reveal>
      ))}
    </Card>
  );

  const easierCard = exercise.beginnerAlternative ? (
    <Card>
      <SectionHeader>Easier option</SectionHeader>
      <Text style={styles.cue}>{exercise.beginnerAlternative}</Text>
    </Card>
  ) : null;

  return (
    <Screen maxWidth={1080}>
      <Reveal style={[styles.header, !wide && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>MOVEMENT LIBRARY</Text>
          <StaggerText text={exercise.name} accentWords={[lastWord]} stagger={55} style={styles.headerTitle} />
          <Text style={styles.headerSubtitle}>{MUSCLES[kind]}</Text>
        </View>
        <View style={!wide ? styles.headerActionCompact : null}>
          <CloseButton onPress={() => router.back()} />
        </View>
      </Reveal>

      <Reveal delay={40} style={styles.metaRow}>
        <MetaStat label="SETS" accent={colors.primary}><AnimatedNumber value={exercise.defaultSets} style={styles.metaValue} /></MetaStat>
        <MetaStat label="REPS" accent={colors.accent}><Text style={styles.metaValue}>{exercise.defaultReps}</Text></MetaStat>
        <MetaStat label="REST" accent={colors.peach}><AnimatedNumber value={exercise.restSec} suffix="s" style={styles.metaValue} /></MetaStat>
      </Reveal>

      {wide ? (
        <View style={styles.columns}>
          <View style={styles.leftCol}>{figure}{formCuesCard}</View>
          <View style={styles.rightCol}>{howToCard}{mistakesCard}{easierCard}</View>
        </View>
      ) : (
        <>
          {figure}
          {howToCard}
          {formCuesCard}
          {mistakesCard}
          {easierCard}
        </>
      )}

      <Button label="Check my form with a photo" icon={<ScanLine size={18} color={colors.black} />} onPress={() => router.push('/form-check')} />
      <Text style={styles.disclaimer}>General coaching guidance — not a medical assessment. Stop if anything hurts.</Text>
    </Screen>
  );
}

function MetaStat({ label, accent, children }: { label: string; accent: string; children: ReactNode }) {
  return (
    <View style={styles.metaStat}>
      <View style={[styles.metaMarker, { backgroundColor: accent }]} />
      <Text style={styles.metaLabel}>{label}</Text>
      {children}
    </View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Pressable accessibilityLabel="Close exercise detail" onPress={onPress} {...pressHandlers}>
      <Animated.View style={[styles.closeButton, animatedStyle]}><X size={21} color={colors.text} /></Animated.View>
    </Pressable>
  );
}

const JOINTS: Joint[] = ['head', 'shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle'];

function FigureDemo({ kind }: { kind: DemoKind }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  const [frame, setFrame] = useState(reduced ? 0.5 : 0);
  const lastFrame = useRef(reduced ? 0.5 : 0);
  const { start, end, label } = POSES[kind];
  const workingJoint = WORKING_JOINT[kind];

  useEffect(() => {
    if (reduced) { setFrame(0.5); return; }
    // Throttle: only re-render the SVG when the frame moved a visible amount,
    // cutting ~60 setState/s down to ~20-30 with no visible difference.
    const id = t.addListener(({ value }) => {
      if (Math.abs(value - lastFrame.current) < 0.03) return;
      lastFrame.current = value;
      setFrame(value);
    });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1300, useNativeDriver: false }),
        Animated.delay(180),
        Animated.timing(t, { toValue: 0, duration: 900, useNativeDriver: false }),
        Animated.delay(180),
      ]),
    );
    loop.start();
    return () => { loop.stop(); t.removeListener(id); };
  }, [reduced, t]);

  // Interpolate a joint coordinate between the two keyframes at the current frame.
  const co = (j: Joint, axis: 0 | 1) => start[j][axis] + (end[j][axis] - start[j][axis]) * frame;

  const bone = (a: Joint, b: Joint, width = 5) => (
    <Line
      x1={co(a, 0)} y1={co(a, 1)} x2={co(b, 0)} y2={co(b, 1)}
      stroke={colors.primary} strokeWidth={width} strokeLinecap="round"
    />
  );

  // Range-of-motion ghost: the start pose, drawn faintly behind the live figure.
  const ghost = (a: Joint, b: Joint, width = 5) => (
    <Line
      x1={start[a][0]} y1={start[a][1]} x2={start[b][0]} y2={start[b][1]}
      stroke={colors.border} strokeWidth={width} strokeLinecap="round" opacity={0.5}
    />
  );

  return (
    <Card tone="raised" style={styles.figureCard}>
      <Gradient colors={gradients.surfaceGlass} direction="vertical" radius={radius.lg} opacity={0.5} />
      <View style={styles.figureGlow} pointerEvents="none">
        <GlowPulse color={colors.primary} radius={40} intensity={0.16} style={styles.figureGlowInner}><View /></GlowPulse>
      </View>
      <Svg viewBox="0 0 120 130" style={styles.figure}>
        <Line x1={0} y1={124} x2={120} y2={124} stroke={colors.border} strokeWidth={2} />
        {/* Ghost start-pose skeleton behind the animated figure */}
        {ghost('shoulder', 'hip', 6)}
        {ghost('hip', 'knee')}{ghost('knee', 'ankle')}
        {ghost('shoulder', 'elbow')}{ghost('elbow', 'hand')}
        {ghost('head', 'shoulder', 4)}
        <Circle cx={start.head[0]} cy={start.head[1]} r={9} fill="none" stroke={colors.border} strokeWidth={2} opacity={0.5} />
        {/* Working-joint halo — breathes with the movement (no extra loop) */}
        <Circle cx={co(workingJoint, 0)} cy={co(workingJoint, 1)} r={9 + frame * 5} fill={colors.primary} opacity={0.12 + frame * 0.16} />
        {bone('shoulder', 'hip', 6)}{/* torso */}
        {bone('hip', 'knee')}{bone('knee', 'ankle')}{/* leg */}
        {bone('shoulder', 'elbow')}{bone('elbow', 'hand')}{/* arm */}
        {bone('head', 'shoulder', 4)}{/* neck */}
        <Circle cx={co('head', 0)} cy={co('head', 1)} r={9} fill={colors.primary} />
      </Svg>
      <View style={styles.figureLabels}>
        <StatusPill label={label[0]} color={frame < 0.5 ? colors.accent : colors.textMuted} />
        <Text style={styles.figureArrow}>→</Text>
        <StatusPill label={label[1]} color={frame >= 0.5 ? colors.primary : colors.textMuted} />
      </View>
      <Text style={styles.figureHint}>The faint outline is your starting position — match the range and tempo of the lit figure.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.xs },
  headerActionCompact: { alignSelf: 'flex-start' },
  headerEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  headerTitle: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  headerSubtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 680 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaStat: { flex: 1, minHeight: 88, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 3 },
  metaMarker: { width: 24, height: 3, borderRadius: 2, marginBottom: spacing.sm },
  metaLabel: { color: colors.textDim, fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.8 },
  metaValue: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  leftCol: { flex: 1, gap: spacing.lg },
  rightCol: { flex: 1, gap: spacing.lg },
  figureCard: { minHeight: 300, gap: spacing.sm },
  figureGlow: { position: 'absolute', left: 0, right: 0, bottom: spacing.xl, alignItems: 'center' },
  figureGlowInner: { width: 170, height: 46, borderRadius: 40 },
  figure: { width: '100%', height: 240 },
  figureLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap' },
  figureArrow: { color: colors.textMuted, fontSize: font.body, fontWeight: '800' },
  figureHint: { color: colors.textMuted, fontSize: font.tiny, textAlign: 'center' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  rowHeadText: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  stepNum: { width: 26, height: 26, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  stepText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 21 },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 3 },
  cue: { flex: 1, color: colors.textDim, fontSize: font.small, lineHeight: 22 },
  mistakesCard: { backgroundColor: colors.warningDim, borderColor: `${colors.warning}33` },
  mistakeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 4 },
  mistakeIcon: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  mistakeIndex: { color: colors.warning, fontSize: font.tiny, fontWeight: '900', paddingTop: 6 },
  mistakeText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 21, paddingTop: 4 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center' },
});
