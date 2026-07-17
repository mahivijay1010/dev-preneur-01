import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, CheckCircle2, ListOrdered, ScanLine, Target } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { useReducedMotion } from '@/components/motion';
import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { EXERCISES } from '@/data/exercises';
import { FORM_GUIDES } from '@/data/formCues';
import { colors, font, radius, spacing } from '@/theme';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = EXERCISES.find((e) => e.id === id);

  if (!exercise) {
    return (
      <Screen>
        <Title>Exercise not found</Title>
        <Subtitle>We couldn’t find that movement. Head back and pick another.</Subtitle>
        <Button label="Back" variant="ghost" icon={<ArrowLeft size={18} color={colors.text} />} onPress={() => router.back()} />
      </Screen>
    );
  }

  const kind = demoKindFor(exercise.name);
  const guide = FORM_GUIDES[FORM_FOR_KIND[kind]];
  const steps = toSteps(exercise.instructions);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>{exercise.name}</Title>
      <Subtitle>{MUSCLES[kind]} · {exercise.defaultSets} sets × {exercise.defaultReps} · rest {exercise.restSec}s</Subtitle>

      <FigureDemo kind={kind} />

      <Card>
        <View style={styles.rowHead}><ListOrdered size={17} color={colors.primary} /><Text style={styles.rowHeadText}>How to perform</Text></View>
        {steps.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.rowHead}><Target size={17} color={colors.success} /><Text style={styles.rowHeadText}>Form cues · tempo {guide.tempo}</Text></View>
        {guide.cues.map((c, i) => (
          <View key={i} style={styles.cueRow}>
            <CheckCircle2 size={14} color={colors.success} />
            <Text style={styles.cue}>{c}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <View style={styles.rowHead}><AlertTriangle size={17} color={colors.warning} /><Text style={styles.rowHeadText}>Common mistakes</Text></View>
        {guide.warnings.map((w, i) => (
          <Text key={i} style={styles.warn}>• {w}</Text>
        ))}
      </Card>

      {exercise.beginnerAlternative ? (
        <Card>
          <SectionHeader>Easier option</SectionHeader>
          <Text style={styles.cue}>{exercise.beginnerAlternative}</Text>
        </Card>
      ) : null}

      <Button label="Check my form with a photo" icon={<ScanLine size={18} color={colors.black} />} onPress={() => router.push('/form-check')} />
      <Text style={styles.disclaimer}>General coaching guidance — not a medical assessment. Stop if anything hurts.</Text>
    </Screen>
  );
}

const JOINTS: Joint[] = ['head', 'shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle'];

function FigureDemo({ kind }: { kind: DemoKind }) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  const [frame, setFrame] = useState(reduced ? 0.5 : 0);
  const { start, end, label } = POSES[kind];

  useEffect(() => {
    if (reduced) { setFrame(0.5); return; }
    const id = t.addListener(({ value }) => setFrame(value));
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

  return (
    <View style={styles.figureCard}>
      <Svg viewBox="0 0 120 130" style={styles.figure}>
        <Line x1={0} y1={124} x2={120} y2={124} stroke={colors.border} strokeWidth={2} />
        {bone('shoulder', 'hip', 6)}{/* torso */}
        {bone('hip', 'knee')}{bone('knee', 'ankle')}{/* leg */}
        {bone('shoulder', 'elbow')}{bone('elbow', 'hand')}{/* arm */}
        {bone('head', 'shoulder', 4)}{/* neck */}
        <Circle cx={co('head', 0)} cy={co('head', 1)} r={9} fill={colors.primary} />
      </Svg>
      <View style={styles.figureLabels}>
        <View style={styles.figureLabel}><View style={[styles.figureDot, { backgroundColor: colors.textMuted }]} /><Text style={styles.figureLabelText}>{label[0]}</Text></View>
        <Text style={styles.figureArrow}>→</Text>
        <View style={styles.figureLabel}><View style={[styles.figureDot, { backgroundColor: colors.primary }]} /><Text style={styles.figureLabelText}>{label[1]}</Text></View>
      </View>
      <Text style={styles.figureHint}>Loops through the movement so you can match the range and tempo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  figureCard: { backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  figure: { width: '100%', height: 240 },
  figureLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  figureLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  figureDot: { width: 9, height: 9, borderRadius: 5 },
  figureLabelText: { color: colors.textDim, fontSize: font.small, fontWeight: '700' },
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
  warn: { color: colors.warning, fontSize: font.small, lineHeight: 21 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center' },
});
