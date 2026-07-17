import { useRouter } from 'expo-router';
import { Check, Mic, Square } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, InlineNotice, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { todayKey } from '@/services/storage';
import { isVoiceEnabled, parseLog, startListening, type VoiceSession } from '@/services/voice';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

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
  const updateTodayLog = useAppStore((s) => s.updateTodayLog);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
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
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Talk to log</Title>
      <Subtitle>
        {voiceOn
          ? 'Tap the mic and say what you did today — we’ll fill in the form for you.'
          : 'Type what you did today in one sentence and we’ll fill in the form for you.'}
      </Subtitle>

      {voiceOn && (
        <View style={styles.micWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop listening' : 'Start voice logging'}
            onPress={toggleMic}
            style={[styles.mic, listening && styles.micOn]}
          >
            {listening ? <Square size={30} color={colors.black} fill={colors.black} /> : <Mic size={34} color={colors.black} />}
          </Pressable>
          <Text style={styles.micHint}>{listening ? 'Listening… tap to stop' : 'Tap to speak'}</Text>
        </View>
      )}

      <Field
        label="What you did"
        value={transcript}
        onChangeText={(t) => { setTranscript(t); setSaved(false); }}
        placeholder={EXAMPLES[0]}
        multiline
      />

      {!transcript ? (
        <Card>
          <SectionHeader>Try saying</SectionHeader>
          {EXAMPLES.map((e) => (
            <Text key={e} style={styles.example}>“{e}”</Text>
          ))}
        </Card>
      ) : null}

      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

      {transcript ? (
        parsed.detected.length > 0 ? (
          <Card>
            <SectionHeader>We understood</SectionHeader>
            {parsed.detected.map((d) => (
              <View key={d.label} style={styles.row}>
                <Check size={16} color={colors.success} strokeWidth={3} />
                <Text style={styles.rowLabel}>{d.label}</Text>
                <Text style={styles.rowValue}>{d.value}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <InlineNotice tone="info">
            Couldn’t pick out any values yet. Try mentioning things like weight, water, steps, sleep, energy, hunger, or your workout.
          </InlineNotice>
        )
      ) : null}

      {saved ? (
        <InlineNotice tone="success">Saved to today’s log.</InlineNotice>
      ) : null}

      <Button
        label={saved ? 'Logged — done' : `Log ${parsed.detected.length || ''} ${parsed.detected.length === 1 ? 'entry' : 'entries'}`.trim()}
        onPress={saved ? () => router.back() : save}
        disabled={!saved && parsed.detected.length === 0}
        icon={<Check size={18} color={colors.black} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  micWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
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
  example: { color: colors.textDim, fontSize: font.small, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 34, borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { color: colors.textDim, fontSize: font.small, fontWeight: '700', width: 84 },
  rowValue: { color: colors.text, fontSize: font.small, fontWeight: '700', flex: 1 },
});
