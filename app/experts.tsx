import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

import { Button, Card, SectionHeader } from '@/components/ui';
import { EXPERTS, expertById } from '@/data/experts';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

// Human expert support — choose a professional, request a plan review, and
// message them. Experts can review/monitor and receive safety alerts.
export default function Experts() {
  const router = useRouter();
  const {
    assignedExpertId,
    assignExpert,
    expertMessages,
    sendExpertMessage,
    requestPlanReview,
    planReviews,
  } = useAppStore();
  const [text, setText] = useState('');
  const expert = expertById(assignedExpertId ?? '');
  const latestReview = planReviews[planReviews.length - 1];

  // Directory view when no expert is assigned yet.
  if (!expert) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>Expert support</Text>
          <Text style={styles.sub}>
            Get optional guidance from a certified professional. They can review your plan,
            monitor progress, and message you.
          </Text>
          {EXPERTS.map((e) => (
            <Pressable key={e.id} onPress={() => assignExpert(e.id)}>
              <Card>
                <View style={styles.row}>
                  <Text style={styles.icon}>{e.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{e.name}</Text>
                    <Text style={styles.cred}>{e.credential}</Text>
                    <Text style={styles.specialty}>{e.specialty}</Text>
                  </View>
                  <Text style={styles.choose}>Choose ›</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    sendExpertMessage(text.trim());
    setText('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>‹ Back</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.chatName}>{expert.icon} {expert.name}</Text>
            <Text style={styles.chatCred}>{expert.credential}</Text>
          </View>
          <Pressable onPress={() => assignExpert('')} hitSlop={12}>
            <Text style={styles.switchText}>Switch</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          <Card>
            <SectionHeader>Plan review</SectionHeader>
            {latestReview ? (
              <>
                <Text style={styles.reviewSummary}>{latestReview.summary}</Text>
                {latestReview.suggestions.map((s, i) => (
                  <Text key={i} style={styles.suggestion}>• {s}</Text>
                ))}
              </>
            ) : (
              <Text style={styles.sub}>Ask {expert.name} to review your current plan.</Text>
            )}
            <Button label="Request plan review" variant="ghost" onPress={() => requestPlanReview()} />
          </Card>

          {expertMessages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubble, m.from === 'user' ? styles.user : styles.expert]}
            >
              <Text style={[styles.bubbleText, m.from === 'user' && { color: colors.bg }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${expert.name}…`}
            placeholderTextColor={colors.textDim}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable style={styles.sendBtn} onPress={send}>
            <Text style={styles.sendText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 18, fontWeight: '700' },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { fontSize: 30 },
  name: { color: colors.text, fontWeight: '700', fontSize: font.body },
  cred: { color: colors.primary, fontSize: font.tiny, fontWeight: '600' },
  specialty: { color: colors.textDim, fontSize: font.tiny },
  choose: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatName: { color: colors.text, fontWeight: '800', fontSize: font.body },
  chatCred: { color: colors.textDim, fontSize: font.tiny },
  switchText: { color: colors.primary, fontSize: font.small, fontWeight: '600' },
  messages: { padding: spacing.md, gap: spacing.sm },
  reviewSummary: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  suggestion: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: spacing.md },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  expert: {
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
