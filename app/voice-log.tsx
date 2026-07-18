import { useRouter } from 'expo-router';
import { Check, Mic, Square, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedBorder, Gradient, GlowPulse } from '@/components/depth';
import { AchievementBurst, Reveal, StaggerText, useReducedMotion } from '@/components/motion';
import { Button, Card, Eyebrow, Field, InlineNotice, Screen, SectionHeader, Subtitle } from '@/components/ui';
import { isVoiceEnabled, parseLog, startListening, type VoiceSession } from '@/services/voice';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';

const EXAMPLES = [
  'I weighed 81.5 kilos today',
  'Drank 2 litres of water and walked 8000 steps',
  'Slept 7 hours, energy is 4',
  'Finished my workout, hunger was 2',
];

// Speak (or type) a sentence about your day; we parse it into today's log and
// let you review every field before saving. Voice uses the browser's speech
// recognition on web; on native you can type the same sentence.
export default function VoiceLog() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const updateTodayLog = useAppStore((s) => s.updateTodayLog);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState(false);
  const session = useRef<VoiceSession | null>(null);
  const voiceOn = isVoiceEnabled();

  const parsed = useMemo(() => parseLog(transcript), [transcript]);

  const toggleMic = () => {
    setError('');
    if (listening) {
      session.current?.stop();
      setListening(false);
      return;
    }
    setSaved(false);
    session.current = startListening({
      onPartial: setTranscript,
      onFinal: (text) => { if (text) setTranscript(text); setListening(false); },
      onError: (message) => { setError(message); setListening(false); },
    });
    if (session.current) setListening(true);
  };

  const save = () => {
    if (parsed.detected.length === 0) return;
    updateTodayLog(parsed.patch);
    setSaved(true);
    setBurst(true);
  };

  const buttonLabel = saved
    ? 'Logged — done'
    : parsed.detected.length
      ? `Log ${parsed.detected.length} ${parsed.detected.length === 1 ? 'entry' : 'entries'}`
      : 'Log entries';

  const micColumn = (
    <View style={styles.micColumn}>
      {voiceOn ? (
        <View style={styles.micWrap}>
          <MicButton listening={listening} onPress={toggleMic} />
          <Text style={styles.micHint}>{listening ? 'Listening… tap to stop' : 'Tap to speak'}</Text>
          <Waveform active={listening} />
        </View>
      ) : null}

      <Field
        label="What you did"
        value={transcript}
        onChangeText={(t) => { setTranscript(t); setSaved(false); }}
        placeholder={EXAMPLES[0]}
        multiline
      />

      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

      {transcript ? (
        parsed.detected.length > 0 ? (
          <Card tone="tinted" style={styles.understoodCard}>
            <SectionHeader>We understood</SectionHeader>
            {parsed.detected.map((d, i) => (
              <Reveal key={d.label} delay={i * 60}>
                <View style={[styles.row, i > 0 && styles.rowDivided]}>
                  <Check size={16} color={colors.success} strokeWidth={3} />
                  <Text style={styles.rowLabel}>{d.label}</Text>
                  <Text style={styles.rowValue}>{d.value}</Text>
                </View>
              </Reveal>
            ))}
          </Card>
        ) : (
          <InlineNotice tone="info">
            Couldn’t pick out any values yet. Try mentioning things like weight, water, steps, sleep, energy, hunger, or your workout.
          </InlineNotice>
        )
      ) : null}

      {saved ? <InlineNotice tone="success">Saved to today’s log.</InlineNotice> : null}

      <View style={styles.buttonWrap}>
        <Button
          label={buttonLabel}
          onPress={saved ? () => router.back() : save}
          disabled={!saved && parsed.detected.length === 0}
          icon={<Check size={18} color={colors.black} />}
        />
        <AchievementBurst visible={burst} title="Logged" detail="TODAY UPDATED" onFinished={() => setBurst(false)} />
      </View>
    </View>
  );

  const examplesColumn = (
    <View style={styles.examplesColumn}>
      <Card tone="glass">
        <SectionHeader>Try saying</SectionHeader>
        <Text style={styles.tryHint}>Tap one to drop it into the box.</Text>
        {EXAMPLES.map((example) => (
          <ExampleChip key={example} text={example} onPress={() => { setTranscript(example); setSaved(false); }} />
        ))}
      </Card>
    </View>
  );

  return (
    <Screen maxWidth={1040}>
      <Reveal style={[styles.header, width < 700 && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Eyebrow>HANDS-FREE LOGGING</Eyebrow>
          <StaggerText text="Say it, we log it." accentWords={['log']} style={styles.titleText} />
          <Subtitle>
            {voiceOn
              ? 'Tap the mic and say what you did today — we’ll fill in the form for you.'
              : 'Type what you did today in one sentence and we’ll fill in the form for you.'}
          </Subtitle>
        </View>
        <View style={width < 700 ? styles.headerActionCompact : null}>
          <CloseButton onPress={() => router.back()} />
        </View>
      </Reveal>

      {wide ? (
        <View style={styles.layout}>
          {micColumn}
          {examplesColumn}
        </View>
      ) : (
        <>
          {micColumn}
          {!transcript ? examplesColumn : null}
        </>
      )}
    </Screen>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Close voice logger" style={styles.closeButton} onPress={onPress}>
      <X size={21} color={colors.text} />
    </Pressable>
  );
}

function MicButton({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  return (
    <GlowPulse color={listening ? colors.peach : colors.primary} radius={64} intensity={listening ? 0.55 : 0.28} style={styles.micGlow}>
      <AnimatedBorder
        radius={56}
        borderWidth={2}
        speed={listening && !reduced ? 2600 : 9000}
        colors={['rgba(216,255,114,0)', 'rgba(216,255,114,0.9)', 'rgba(255,154,115,0.7)', 'rgba(216,255,114,0)']}
        fill={colors.bg}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Stop listening' : 'Start voice logging'}
          onPress={onPress}
          style={[styles.mic, listening && styles.micOn]}
        >
          {listening ? <Square size={30} color={colors.black} fill={colors.black} /> : <Mic size={34} color={colors.black} />}
        </Pressable>
      </AnimatedBorder>
    </GlowPulse>
  );
}

// Live equalizer bars under the mic: idle flat when silent, dancing while a
// listening session is active. Native-driver loops with cleanup; static under
// reduced motion.
function Waveform({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const bars = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0.25))).current;

  useEffect(() => {
    if (reduced || !active) {
      bars.forEach((bar) => bar.setValue(0.25));
      return;
    }
    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration: 320 + index * 60, delay: index * 55, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.3, duration: 320 + index * 60, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, bars, reduced]);

  return (
    <View style={styles.waveform} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((bar, index) => (
        <Animated.View key={index} style={[styles.waveBar, { transform: [{ scaleY: bar }] }]}>
          <Gradient colors={gradients.primary} direction="vertical" radius={3} />
        </Animated.View>
      ))}
    </View>
  );
}

function ExampleChip({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.exampleChip} onPress={onPress}>
      <Text style={styles.example}>“{text}”</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.xs },
  headerActionCompact: { alignSelf: 'flex-start' },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  micColumn: { flex: 1.15, width: '100%', gap: spacing.lg },
  examplesColumn: { flex: 0.85, width: '100%' },
  micWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  micGlow: { borderRadius: 56 },
  mic: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : null),
  },
  micOn: { backgroundColor: colors.peach },
  micHint: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  waveform: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  waveBar: { width: 4, height: 28, borderRadius: 3, overflow: 'hidden' },
  buttonWrap: { position: 'relative' },
  understoodCard: { backgroundColor: colors.successDim, borderColor: `${colors.success}44` },
  tryHint: { color: colors.textMuted, fontSize: font.tiny, marginBottom: spacing.xs },
  exampleChip: { minHeight: 44, justifyContent: 'center', paddingVertical: spacing.xs, borderRadius: radius.sm },
  example: { color: colors.textDim, fontSize: font.small, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 34, paddingVertical: 4 },
  rowDivided: { borderTopWidth: 1, borderTopColor: `${colors.success}33` },
  rowLabel: { color: colors.textDim, fontSize: font.small, fontWeight: '700', width: 84 },
  rowValue: { color: colors.text, fontSize: font.small, fontWeight: '700', flex: 1 },
});
