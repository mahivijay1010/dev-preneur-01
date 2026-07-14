import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { FORM_EXERCISES, FORM_GUIDES } from '@/data/formCues';
import type { PickedImage } from '@/services/imagePicker';
import { checkForm, isVisionEnabled } from '@/services/vision';
import { colors, font, radius, spacing } from '@/theme';
import type { FormExercise, FormFeedback } from '@/types';

// Exercise form assistance. Live pose tracking is out of scope for the MVP, so
// we combine: a photo-based AI form check, always-on expert cues, a manual rep
// counter, and a tempo guide. We never diagnose injuries.
export default function FormCheck() {
  const router = useRouter();
  const [exercise, setExercise] = useState<FormExercise>('squat');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [reps, setReps] = useState(0);
  const [tempoOn, setTempoOn] = useState(false);
  const [phase, setPhase] = useState<'down' | 'up'>('down');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const guide = FORM_GUIDES[exercise];

  // Simple tempo metronome alternating phases.
  useEffect(() => {
    if (tempoOn) {
      timer.current = setInterval(() => setPhase((p) => (p === 'down' ? 'up' : 'down')), 1500);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [tempoOn]);

  const analyze = async (img: PickedImage) => {
    setImage(img);
    setFeedback(null);
    if (!img.base64 || !isVisionEnabled()) return;
    setBusy(true);
    try {
      setFeedback(await checkForm(img.base64, img.mimeType, exercise));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Exercise form check</Title>
      <Subtitle>Pick an exercise, use the cues and tempo, and snap a photo mid-rep for feedback.</Subtitle>

      <View style={styles.exRow}>
        {FORM_EXERCISES.map((e) => (
          <Pressable
            key={e}
            onPress={() => { setExercise(e); setFeedback(null); }}
            style={[styles.exChip, exercise === e && styles.exChipOn]}
          >
            <Text style={[styles.exText, exercise === e && { color: colors.bg }]}>
              {FORM_GUIDES[e].label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Rep counter + tempo */}
      <Card>
        <View style={styles.counterRow}>
          <View>
            <Text style={styles.dim}>Reps</Text>
            <Text style={styles.repCount}>{reps}</Text>
          </View>
          <View style={styles.counterBtns}>
            <Pressable style={styles.round} onPress={() => setReps((r) => Math.max(0, r - 1))}>
              <Text style={styles.roundText}>–</Text>
            </Pressable>
            <Pressable style={styles.round} onPress={() => setReps((r) => r + 1)}>
              <Text style={styles.roundText}>+</Text>
            </Pressable>
            <Pressable style={styles.resetBtn} onPress={() => setReps(0)}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.counterRow}>
          <View>
            <Text style={styles.dim}>Tempo · {guide.tempo}</Text>
            {tempoOn && (
              <Text style={[styles.phase, { color: phase === 'down' ? colors.warning : colors.success }]}>
                {phase === 'down' ? '▼ Lower' : '▲ Lift'}
              </Text>
            )}
          </View>
          <Pressable
            style={[styles.tempoBtn, tempoOn && styles.tempoOn]}
            onPress={() => setTempoOn((t) => !t)}
          >
            <Text style={[styles.tempoText, tempoOn && { color: colors.bg }]}>
              {tempoOn ? 'Stop' : 'Start tempo'}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Always-on expert cues */}
      <Card>
        <SectionHeader>Form cues</SectionHeader>
        {guide.cues.map((c, i) => (
          <Text key={i} style={styles.cue}>• {c}</Text>
        ))}
        <Text style={styles.warnHead}>Watch out for</Text>
        {guide.warnings.map((w, i) => (
          <Text key={i} style={styles.warn}>• {w}</Text>
        ))}
      </Card>

      {/* Photo-based AI check */}
      <SectionHeader>Photo form check</SectionHeader>
      <Subtitle>
        {isVisionEnabled()
          ? 'Snap a photo at the hardest point of the rep for AI feedback.'
          : 'Add an API key to enable photo-based feedback. The cues above still apply.'}
      </Subtitle>
      <CaptureButtons image={image} onPicked={analyze} busy={busy} />

      {busy && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.dim}>Checking your form…</Text>
        </View>
      )}

      {feedback && feedback.source === 'ai' && (
        <>
          {feedback.goodPoints.length > 0 && (
            <Card>
              <SectionHeader>Looking good</SectionHeader>
              {feedback.goodPoints.map((g, i) => (
                <Text key={i} style={styles.good}>✓ {g}</Text>
              ))}
            </Card>
          )}
          {feedback.corrections.length > 0 && (
            <Card>
              <SectionHeader>Corrections</SectionHeader>
              {feedback.corrections.map((c, i) => (
                <Text key={i} style={styles.cue}>• {c}</Text>
              ))}
            </Card>
          )}
          {feedback.postureWarnings.length > 0 && (
            <Card>
              <SectionHeader>Posture warnings</SectionHeader>
              {feedback.postureWarnings.map((w, i) => (
                <Text key={i} style={styles.warn}>• {w}</Text>
              ))}
            </Card>
          )}
          <Text style={styles.disclaimer}>
            General guidance only — not a medical assessment. Stop and see a professional if
            anything hurts.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: font.small },
  exRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  exChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  exText: { color: colors.textDim, fontWeight: '700', fontSize: font.small },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterBtns: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  repCount: { color: colors.primary, fontSize: font.h1, fontWeight: '900' },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: { color: colors.text, fontSize: 24, fontWeight: '700' },
  resetBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  resetText: { color: colors.textDim, fontWeight: '600', fontSize: font.small },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  phase: { fontSize: font.h3, fontWeight: '800' },
  tempoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tempoOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tempoText: { color: colors.text, fontWeight: '700', fontSize: font.small },
  cue: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  warnHead: { color: colors.warning, fontWeight: '700', fontSize: font.small, marginTop: spacing.xs },
  warn: { color: colors.warning, fontSize: font.small, lineHeight: 20 },
  good: { color: colors.success, fontSize: font.small, lineHeight: 21 },
  loading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic' },
});
