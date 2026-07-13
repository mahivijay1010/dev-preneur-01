import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { askCoach, isCoachAIEnabled } from '@/services/coach';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

const SUGGESTIONS = [
  'What should I eat now?',
  'Can I train while sore?',
  'Why has my weight increased?',
  'I missed two workouts. What should I do?',
  'What should I order at a restaurant?',
];

export default function Coach() {
  const { chat, addChatMessage, profile, plan } = useAppStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy || !profile || !plan) return;
    setText('');
    addChatMessage({ role: 'user', text: question });
    setBusy(true);
    try {
      const answer = await askCoach(question, useAppStore.getState().chat, profile, plan);
      addChatMessage({ role: 'coach', text: answer });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.sub}>
            {isCoachAIEnabled() ? 'Grounded in your plan & approved data' : 'Offline mode — rule-based answers'}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
        >
          {chat.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Ask me anything about your plan. For pain or medical concerns,
                please see a professional — I don’t diagnose.
              </Text>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {chat.map((m) => (
            <View
              key={m.id}
              style={[styles.bubble, m.role === 'user' ? styles.user : styles.coach]}
            >
              <Text style={[styles.bubbleText, m.role === 'user' && { color: colors.bg }]}>
                {m.text}
              </Text>
            </View>
          ))}

          {busy && (
            <View style={[styles.bubble, styles.coach]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask your coach…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
          />
          <Pressable style={styles.sendBtn} onPress={() => send(text)} disabled={busy}>
            <Text style={styles.sendText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: font.small },
  messages: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.lg },
  empty: { gap: spacing.sm },
  emptyText: { color: colors.textDim, fontSize: font.small, lineHeight: 21, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  chipText: { color: colors.primary, fontSize: font.small, fontWeight: '600' },
  bubble: {
    maxWidth: '85%',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  coach: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  inputBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.bg, fontSize: 18, fontWeight: '700' },
});
