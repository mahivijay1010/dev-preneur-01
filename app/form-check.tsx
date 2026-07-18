import { useRouter } from 'expo-router';
import { ArrowRight, CheckCircle2, Minus, Pause, Play, Plus, RotateCcw, ScanLine, TriangleAlert, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { Gradient, GlowPulse, ShineSweep } from '@/components/depth';
import { AnimatedNumber, EnergyLoader, Reveal, StaggerText, usePressMotion, useReducedMotion } from '@/components/motion';
import { Card, ChipGroup, Screen, StatusPill } from '@/components/ui';
import { FORM_EXERCISES, FORM_GUIDES } from '@/data/formCues';
import type { PickedImage } from '@/services/imagePicker';
import { checkForm, isVisionEnabled } from '@/services/vision';
import { colors, font, gradients, radius, shadow, spacing } from '@/theme';
import type { Confidence, FormExercise, FormFeedback } from '@/types';

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.textDim,
};

// Derive phase durations from the printed tempo (e.g. "2s down · 1s up") so the
// pulse actually matches the coaching copy. Falls back gently for hold-style tempos.
function tempoDurations(tempo: string): Record<'lower' | 'hold' | 'drive', number> {
  const seconds = (pattern: RegExp) => {
    const match = pattern.exec(tempo);
    if (!match) return 1100;
    return Math.min(4000, Math.max(500, Number.parseFloat(match[1]) * 1000));
  };
  return {
    lower: seconds(/([\d.]+)\s*s\s*down/i),
    drive: seconds(/([\d.]+)\s*s\s*up/i),
    hold: 650,
  };
}

export default function FormCheck() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const compactHeader = width < 700;
  const reduced = useReducedMotion();
  const [exercise, setExercise] = useState<FormExercise>('squat');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [reps, setReps] = useState(0);
  const [tempoOn, setTempoOn] = useState(false);
  const [phase, setPhase] = useState<'lower' | 'hold' | 'drive'>('lower');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guide = FORM_GUIDES[exercise];

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!tempoOn) {
      setPhase('lower');
      return;
    }
    const durations = tempoDurations(guide.tempo);
    const phases: ('lower' | 'hold' | 'drive')[] = ['lower', 'hold', 'drive'];
    let index = 0;
    setPhase('lower');
    const schedule = () => {
      timer.current = setTimeout(() => {
        index = (index + 1) % phases.length;
        setPhase(phases[index]);
        schedule();
      }, durations[phases[index]]);
    };
    schedule();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [tempoOn, guide.tempo]);

  const analyze = async (picked: PickedImage) => {
    setImage(picked);
    setFeedback(null);
    if (!picked.base64 || !isVisionEnabled()) return;
    setBusy(true);
    try {
      setFeedback(await checkForm(picked.base64, picked.mimeType, exercise));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen maxWidth={1080}>
      <Reveal style={[styles.header, compactHeader && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>MOVEMENT LAB</Text>
          <StaggerText text="See the rep before you repeat it." accentWords={['rep']} stagger={55} style={styles.headerTitle} />
          <Text style={styles.headerSubtitle}>Use a clear tempo, focused cues, and a mid-rep photo to make each set more intentional.</Text>
        </View>
        <View style={compactHeader ? styles.headerActionCompact : null}>
          <CloseButton onPress={() => router.back()} />
        </View>
      </Reveal>

      <Reveal delay={40} style={styles.exerciseBand}>
        <View>
          <Text style={styles.bandEyebrow}>CHOOSE MOVEMENT</Text>
          <Text style={styles.bandTitle}>{guide.label} technique</Text>
        </View>
        <ChipGroup
          options={FORM_EXERCISES.map((item) => ({ label: FORM_GUIDES[item].label, value: item }))}
          value={exercise}
          onChange={(value) => { setExercise(value); setFeedback(null); setReps(0); setTempoOn(false); }}
        />
      </Reveal>

      <View style={[styles.stage, !wide && styles.stageStack]}>
        <Reveal delay={80} style={styles.visualStage}>
          <Image source={require('../assets/images/form-check-guide-v1.png')} style={styles.guideImage} resizeMode="cover" />
          <Gradient colors={gradients.heroScrim} direction="vertical" locations={[0, 0.5, 1]} />
          {/* Tempo scan-line: a light band sweeps the alignment photo once per
              lower–hold–drive cycle while the guided tempo runs. */}
          {tempoOn && !reduced ? <ShineSweep interval={3300} delay={0} /> : null}
          <View style={styles.visualBadge}><View><ScanLine size={15} color={colors.black} /></View><Text style={styles.visualBadgeText}>ALIGNMENT VIEW</Text></View>
          <View style={styles.visualCopy}>
            <Text style={styles.visualTitle}>Own the hard position.</Text>
            <Text style={styles.visualSub}>Keep your full body visible and capture the point where control matters most.</Text>
          </View>
        </Reveal>

        <Reveal delay={120} style={styles.console}>
          <View style={styles.consoleHeader}>
            <View>
              <Text style={styles.bandEyebrow}>LIVE SET</Text>
              <Text style={styles.consoleTitle}>{guide.tempo}</Text>
            </View>
            <TempoPulse active={tempoOn} phase={phase} />
          </View>

          <View style={styles.repStation}>
            <View>
              <Text style={styles.repLabel}>REPETITIONS</Text>
              <AnimatedNumber value={reps} duration={300} style={styles.repValue} />
            </View>
            <View style={styles.repActions}>
              <IconAction label="Decrease repetitions" icon={<Minus size={20} color={colors.text} />} onPress={() => setReps((value) => Math.max(0, value - 1))} />
              <IconAction label="Increase repetitions" icon={<Plus size={20} color={colors.black} />} onPress={() => setReps((value) => value + 1)} primary />
              <IconAction label="Reset repetitions" icon={<RotateCcw size={18} color={colors.textDim} />} onPress={() => setReps(0)} />
            </View>
          </View>

          <TempoButton on={tempoOn} phase={phase} onPress={() => setTempoOn((value) => !value)} />
          <Text style={styles.safetyCopy}>Move within a pain-free range. Tempo is a guide, not a test.</Text>
        </Reveal>
      </View>

      <Reveal delay={150} style={[styles.cuesGrid, !wide && styles.cuesGridStack]}>
        <View style={styles.cuePane}>
          <View style={styles.cueHeading}><CheckCircle2 size={19} color={colors.success} /><Text style={styles.cueTitle}>Build the rep</Text></View>
          {guide.cues.map((cue, index) => <Cue key={cue} index={index + 1} text={cue} />)}
        </View>
        <View style={[styles.cuePane, styles.warningPane]}>
          <View style={styles.cueHeading}><TriangleAlert size={19} color={colors.warning} /><Text style={styles.cueTitle}>Protect the position</Text></View>
          {guide.warnings.map((warning, index) => <Cue key={warning} index={index + 1} text={warning} warning />)}
        </View>
      </Reveal>

      <Reveal delay={180} style={styles.captureSection}>
        <Text style={styles.bandEyebrow}>PHOTO FEEDBACK</Text>
        <Text style={styles.captureTitle}>Freeze your hardest point.</Text>
        <Text style={styles.captureSub}>{isVisionEnabled() ? 'Take one clear photo and receive general posture feedback.' : 'Photo capture works now. Add an AI key to enable automatic posture feedback.'}</Text>
        <CaptureButtons
          image={image}
          onPicked={(picked) => void analyze(picked)}
          busy={busy}
          emptyImage={require('../assets/images/form-check-guide-v1.png')}
          title={`Frame your ${guide.label.toLowerCase()}`}
          description="Show the full movement position from the side or a three-quarter angle."
          accent={colors.accent}
        />
      </Reveal>

      {busy ? <View style={styles.loading}><EnergyLoader /><Text style={styles.captureSub}>Mapping your position…</Text></View> : null}
      {feedback?.source === 'ai' ? <FeedbackPanel feedback={feedback} /> : null}
    </Screen>
  );
}

function TempoPulse({ active, phase }: { active: boolean; phase: 'lower' | 'hold' | 'drive' }) {
  const phaseColor = phase === 'drive' ? colors.primary : phase === 'hold' ? colors.peach : colors.accent;
  return (
    <View style={styles.pulseShell}>
      <GlowPulse color={phaseColor} radius={34} intensity={active ? 0.45 : 0} style={styles.pulseGlow}>
        <View style={[styles.pulseCore, active && styles.pulseCoreOn]}>
          <Text style={[styles.pulseText, active && styles.pulseTextOn]}>{active ? phase.toUpperCase() : 'READY'}</Text>
        </View>
      </GlowPulse>
    </View>
  );
}

function TempoButton({ on, phase, onPress }: { on: boolean; phase: 'lower' | 'hold' | 'drive'; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={on ? 'Pause guided tempo' : 'Start guided tempo'}
        style={[styles.tempoButton, on && styles.tempoButtonOn]}
        onPress={onPress}
        {...pressHandlers}
      >
        {on ? <Pause size={19} color={colors.black} /> : <Play size={19} color={colors.black} />}
        <Text style={styles.tempoButtonText}>{on ? `Pause ${phase}` : 'Start guided tempo'}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Cue({ index, text, warning = false }: { index: number; text: string; warning?: boolean }) {
  return <View style={styles.cueRow}><Text style={[styles.cueIndex, warning && styles.cueIndexWarning]}>{String(index).padStart(2, '0')}</Text><Text style={styles.cueText}>{text}</Text></View>;
}

function FeedbackPanel({ feedback }: { feedback: FormFeedback }) {
  const goodCount = feedback.goodPoints.length;
  const correctionCount = feedback.corrections.length;
  return (
    <Card tone="glass" style={styles.feedback}>
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackHeaderCopy}>
          <Text style={styles.bandEyebrow}>FORM READOUT</Text>
          <Text style={styles.captureTitle}>Your next useful adjustment</Text>
        </View>
        <StatusPill label={`${feedback.confidence} confidence`} color={CONFIDENCE_COLOR[feedback.confidence]} />
      </View>
      {feedback.goodPoints.map((item, index) => (
        <Reveal key={item} delay={90 + index * 70}>
          <View style={styles.feedbackRow}>
            <View style={styles.feedbackIcon}><CheckCircle2 size={16} color={colors.success} /></View>
            <Text style={styles.feedbackText}>{item}</Text>
          </View>
        </Reveal>
      ))}
      {feedback.corrections.map((item, index) => (
        <Reveal key={item} delay={90 + (goodCount + index) * 70}>
          <View style={styles.feedbackRow}>
            <View style={styles.feedbackIcon}><ArrowRight size={16} color={colors.accent} /></View>
            <Text style={styles.feedbackText}>{item}</Text>
          </View>
        </Reveal>
      ))}
      {feedback.postureWarnings.map((item, index) => (
        <Reveal key={item} delay={90 + (goodCount + correctionCount + index) * 70}>
          <View style={styles.feedbackRow}>
            <View style={styles.feedbackIcon}><TriangleAlert size={16} color={colors.warning} /></View>
            <Text style={styles.feedbackText}>{item}</Text>
          </View>
        </Reveal>
      ))}
      <Text style={styles.safetyCopy}>General guidance only. Stop and seek professional help if movement causes pain.</Text>
    </Card>
  );
}

function IconAction({ label, icon, primary = false, onPress }: { label: string; icon: ReactNode; primary?: boolean; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={animatedStyle}>
      <Pressable accessibilityLabel={label} style={[styles.iconAction, primary && styles.iconActionPrimary]} onPress={onPress} {...pressHandlers}>{icon}</Pressable>
    </Animated.View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityLabel="Close form check" style={styles.closeButton} onPress={onPress}><X size={21} color={colors.text} /></Pressable>;
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
  exerciseBand: { gap: spacing.md, paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  bandEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  bandTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 3 },
  stage: { flexDirection: 'row', minHeight: 390, gap: spacing.md },
  stageStack: { flexDirection: 'column' },
  visualStage: { flex: 1.15, minHeight: 360, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.accentDim, backgroundColor: colors.black, ...shadow.card },
  guideImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  visualBadge: { position: 'absolute', top: spacing.md, left: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.accent },
  visualBadgeText: { color: colors.black, fontSize: font.tiny, fontWeight: '900' },
  visualCopy: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, left: spacing.lg },
  visualTitle: { color: colors.white, fontSize: font.h2, fontWeight: '900' },
  visualSub: { color: '#D8DEDA', fontSize: font.small, lineHeight: 19, marginTop: 4, maxWidth: 460 },
  console: { flex: 0.85, minHeight: 360, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, justifyContent: 'space-between', ...shadow.card },
  consoleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  consoleTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 4 },
  repStation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  repLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800' },
  repValue: { color: colors.primary, fontSize: 56, lineHeight: 62, fontWeight: '900' },
  repActions: { flexDirection: 'row', gap: spacing.sm },
  iconAction: { width: 46, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  iconActionPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  tempoButton: { minHeight: 52, borderRadius: radius.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, ...shadow.glow },
  tempoButtonOn: { backgroundColor: colors.warning },
  tempoButtonText: { color: colors.black, fontSize: font.body, fontWeight: '900', textTransform: 'capitalize' },
  safetyCopy: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, textAlign: 'center' },
  pulseShell: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center' },
  pulseGlow: { width: 68, height: 68 },
  pulseCore: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.borderStrong },
  pulseCoreOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  pulseText: { color: colors.textDim, fontSize: 9, fontWeight: '900' },
  pulseTextOn: { color: colors.primary },
  cuesGrid: { flexDirection: 'row', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, overflow: 'hidden' },
  cuesGridStack: { flexDirection: 'column' },
  cuePane: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface },
  warningPane: { backgroundColor: colors.warningDim, borderLeftWidth: 1, borderLeftColor: colors.borderStrong },
  cueHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  cueTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  cueRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cueIndex: { color: colors.success, fontSize: font.tiny, fontWeight: '900', paddingTop: 2 },
  cueIndexWarning: { color: colors.warning },
  cueText: { color: colors.text, fontSize: font.small, lineHeight: 20, flex: 1 },
  captureSection: { gap: spacing.sm, paddingTop: spacing.md },
  captureTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  captureSub: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 72 },
  feedback: { gap: spacing.sm },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.xs },
  feedbackHeaderCopy: { gap: 3, flexShrink: 1 },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  feedbackIcon: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  feedbackText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20, paddingTop: 4 },
});
