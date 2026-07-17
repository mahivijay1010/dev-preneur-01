import { useRouter } from 'expo-router';
import { CheckCircle2, Minus, Pause, Play, Plus, RotateCcw, ScanLine, TriangleAlert, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { EnergyLoader, Reveal, useReducedMotion } from '@/components/motion';
import { ChipGroup, PageHeader, Screen } from '@/components/ui';
import { FORM_EXERCISES, FORM_GUIDES } from '@/data/formCues';
import type { PickedImage } from '@/services/imagePicker';
import { checkForm, isVisionEnabled } from '@/services/vision';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { FormExercise, FormFeedback } from '@/types';

export default function FormCheck() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const [exercise, setExercise] = useState<FormExercise>('squat');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [reps, setReps] = useState(0);
  const [tempoOn, setTempoOn] = useState(false);
  const [phase, setPhase] = useState<'lower' | 'hold' | 'drive'>('lower');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const guide = FORM_GUIDES[exercise];

  useEffect(() => {
    if (!tempoOn) {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setPhase('lower');
      return;
    }
    const phases: ('lower' | 'hold' | 'drive')[] = ['lower', 'hold', 'drive'];
    let index = 0;
    timer.current = setInterval(() => {
      index = (index + 1) % phases.length;
      setPhase(phases[index]);
    }, 1100);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [tempoOn]);

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
      <PageHeader
        eyebrow="MOVEMENT LAB"
        title="See the rep before you repeat it."
        subtitle="Use a clear tempo, focused cues, and a mid-rep photo to make each set more intentional."
        action={<CloseButton onPress={() => router.back()} />}
      />

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
          <View style={styles.visualScrim} />
          <View style={styles.visualBadge}><ScanLine size={15} color={colors.black} /><Text style={styles.visualBadgeText}>ALIGNMENT VIEW</Text></View>
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
              <Text style={styles.repValue}>{String(reps).padStart(2, '0')}</Text>
            </View>
            <View style={styles.repActions}>
              <IconAction label="Decrease repetitions" icon={<Minus size={20} color={colors.text} />} onPress={() => setReps((value) => Math.max(0, value - 1))} />
              <IconAction label="Increase repetitions" icon={<Plus size={20} color={colors.black} />} onPress={() => setReps((value) => value + 1)} primary />
              <IconAction label="Reset repetitions" icon={<RotateCcw size={18} color={colors.textDim} />} onPress={() => setReps(0)} />
            </View>
          </View>

          <Pressable style={[styles.tempoButton, tempoOn && styles.tempoButtonOn]} onPress={() => setTempoOn((value) => !value)}>
            {tempoOn ? <Pause size={19} color={colors.black} /> : <Play size={19} color={colors.black} />}
            <Text style={styles.tempoButtonText}>{tempoOn ? `Pause ${phase}` : 'Start guided tempo'}</Text>
          </Pressable>
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
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active || reduced) {
      pulse.setValue(0);
      return;
    }
    pulse.setValue(0);
    Animated.spring(pulse, { toValue: 1, damping: 10, stiffness: 160, useNativeDriver: true }).start();
  }, [active, phase, pulse, reduced]);
  return (
    <View style={styles.pulseShell}>
      <Animated.View style={[styles.pulseHalo, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.25] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }) }]} />
      <View style={[styles.pulseCore, active && styles.pulseCoreOn]}><Text style={[styles.pulseText, active && styles.pulseTextOn]}>{active ? phase.toUpperCase() : 'READY'}</Text></View>
    </View>
  );
}

function Cue({ index, text, warning = false }: { index: number; text: string; warning?: boolean }) {
  return <View style={styles.cueRow}><Text style={[styles.cueIndex, warning && styles.cueIndexWarning]}>{String(index).padStart(2, '0')}</Text><Text style={styles.cueText}>{text}</Text></View>;
}

function FeedbackPanel({ feedback }: { feedback: FormFeedback }) {
  return (
    <Reveal style={styles.feedback}>
      <Text style={styles.bandEyebrow}>FORM READOUT · {feedback.confidence.toUpperCase()} CONFIDENCE</Text>
      <Text style={styles.captureTitle}>Your next useful adjustment</Text>
      {feedback.goodPoints.map((item) => <Text key={item} style={styles.feedbackGood}>✓ {item}</Text>)}
      {feedback.corrections.map((item) => <Text key={item} style={styles.feedbackCorrection}>→ {item}</Text>)}
      {feedback.postureWarnings.map((item) => <Text key={item} style={styles.feedbackWarning}>! {item}</Text>)}
      <Text style={styles.safetyCopy}>General guidance only. Stop and seek professional help if movement causes pain.</Text>
    </Reveal>
  );
}

function IconAction({ label, icon, primary = false, onPress }: { label: string; icon: ReactNode; primary?: boolean; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} style={[styles.iconAction, primary && styles.iconActionPrimary]} onPress={onPress}>{icon}</Pressable>;
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityLabel="Close form check" style={styles.closeButton} onPress={onPress}><X size={21} color={colors.text} /></Pressable>;
}

const styles = StyleSheet.create({
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  exerciseBand: { gap: spacing.md, paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  bandEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  bandTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginTop: 3 },
  stage: { flexDirection: 'row', minHeight: 390, gap: spacing.md },
  stageStack: { flexDirection: 'column' },
  visualStage: { flex: 1.15, minHeight: 360, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.accentDim, backgroundColor: colors.black, ...shadow.card },
  guideImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  visualScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,7,6,0.18)' },
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
  pulseHalo: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: colors.primary },
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
  feedback: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentDim },
  feedbackGood: { color: colors.success, fontSize: font.small },
  feedbackCorrection: { color: colors.text, fontSize: font.small },
  feedbackWarning: { color: colors.warning, fontSize: font.small },
});
