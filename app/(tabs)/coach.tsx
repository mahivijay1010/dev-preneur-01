import { useRouter } from 'expo-router';
import {
  Bot,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  Send,
  Sparkles,
  Stethoscope,
  Utensils,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusPill } from '@/components/ui';
import { EnergyLoader, FloatingLayer, Reveal, SpatialBackdrop } from '@/components/motion';
import { currentWeekday, WEEKDAY_LABEL } from '@/engine/week';
import { askCoach, isCoachAIEnabled } from '@/services/coach';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, shadow, spacing } from '@/theme';

const webInputReset = Platform.OS === 'web'
  ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as any)
  : null;

export default function Coach() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { chat, addChatMessage, profile, plan, logs } = useAppStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const today = currentWeekday();
  const workout = plan?.workouts.find((item) => item.day === today);
  const suggestions = useMemo(() => [
    workout?.isRest ? 'What should I do on this recovery day?' : `How should I approach today’s ${workout?.focus ?? 'workout'}?`,
    `Build a meal around my ${plan?.macros.proteinG ?? 0}g protein target.`,
    profile?.goal === 'weight_loss' ? 'My weight went up today. Should I change the plan?' : 'How can I progress without gaining too quickly?',
    'I missed part of my plan. Help me recover the week.',
  ], [plan?.macros.proteinG, profile?.goal, workout?.focus, workout?.isRest]);
  const loggedDays = Object.keys(logs).length;

  const send = async (input: string) => {
    const question = input.trim();
    if (!question || busy || !profile || !plan) return;
    setText('');
    addChatMessage({ role: 'user', text: question });
    setBusy(true);
    try {
      const reply = await askCoach(question, useAppStore.getState().chat, profile, plan);
      addChatMessage({ role: 'coach', text: reply.text, actions: reply.actions });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SpatialBackdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Reveal style={[styles.topBarInner, !wide && styles.topBarInnerNarrow]}>
            <View>
              <View style={styles.titleRow}><View style={styles.botMark}><Bot size={20} color={colors.black} /></View><Text style={styles.title}>FitPlan Coach</Text></View>
              <Text style={styles.sub}>Answers grounded in your plan, preferences, and approved logs.</Text>
            </View>
            <StatusPill label={isCoachAIEnabled() ? 'Plan-aware AI' : 'Offline coaching'} color={isCoachAIEnabled() ? colors.success : colors.warning} icon={<Sparkles size={13} color={isCoachAIEnabled() ? colors.success : colors.warning} />} />
          </Reveal>
        </View>

        <View style={[styles.workspace, !wide && styles.workspaceNarrow]}>
          {wide ? (
            <View style={styles.contextRail}>
              <Text style={styles.railEyebrow}>TODAY’S CONTEXT</Text>
              <Text style={styles.railTitle}>{WEEKDAY_LABEL[today]}</Text>
              <ContextCard icon={<Dumbbell size={18} color={colors.peach} />} label="Movement" value={workout?.focus ?? 'Plan not ready'} />
              <ContextCard icon={<Utensils size={18} color={colors.success} />} label="Nutrition" value={plan ? `${plan.macros.proteinG}g protein · ${plan.macros.calories} kcal` : 'Plan not ready'} />
              <ContextCard icon={<HeartPulse size={18} color={colors.accent} />} label="Known context" value={`${loggedDays} logged day${loggedDays === 1 ? '' : 's'}`} />
              <Pressable style={styles.expertCard} onPress={() => router.push('/experts')}>
                <View style={styles.expertIcon}><Stethoscope size={19} color={colors.primary} /></View>
                <View style={styles.expertCopy}><Text style={styles.expertTitle}>Need human support?</Text><Text style={styles.expertSub}>Connect with a trainer, dietitian, or physio.</Text></View>
                <ChevronRight size={17} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.chatPanel}>
            <ScrollView style={styles.flex} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
              {chat.length === 0 ? (
                <Reveal style={styles.empty}>
                  <FloatingLayer distance={8} style={styles.emptyIcon}><Sparkles size={28} color={colors.primary} /></FloatingLayer>
                  <Text style={styles.emptyTitle}>What can I help you solve today?</Text>
                  <Text style={styles.emptyText}>Ask for a decision, a meal adjustment, or a recovery plan. Medical concerns should still go to a qualified professional.</Text>
                  <View style={styles.suggestionGrid}>
                    {suggestions.map((suggestion, index) => (
                      <Reveal key={suggestion} delay={100 + index * 70} style={styles.suggestionMotion}>
                        <Pressable style={styles.suggestion} onPress={() => void send(suggestion)}>
                          <View style={[styles.suggestionNumber, { backgroundColor: SUGGESTION_COLORS[index] }]}><Text style={styles.suggestionNumberText}>{index + 1}</Text></View>
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                          <ChevronRight size={16} color={colors.textMuted} />
                        </Pressable>
                      </Reveal>
                    ))}
                  </View>
                </Reveal>
              ) : null}

              {chat.map((message) => (
                <Reveal key={message.id} distance={10} style={[styles.messageRow, message.role === 'user' && styles.messageRowUser]}>
                  {message.role === 'coach' ? <View style={styles.avatar}><Bot size={16} color={colors.black} /></View> : null}
                  <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.coachBubble]}>
                    <Text style={[styles.bubbleText, message.role === 'user' && styles.userBubbleText]}>{message.text}</Text>
                    {message.role === 'coach' && message.actions?.length ? (
                      <View style={styles.actionRow}>
                        {message.actions.map((action) => (
                          <Pressable
                            key={action.route}
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
                            onPress={() => router.push(action.route as any)}
                          >
                            <Text style={styles.actionChipText}>{action.label}</Text>
                            <ChevronRight size={13} color={colors.primary} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    <Text style={[styles.messageMeta, message.role === 'user' && styles.userMessageMeta]}>{message.role === 'user' ? 'You' : 'FitPlan coach'}</Text>
                  </View>
                </Reveal>
              ))}

              {busy ? (
                <View style={styles.messageRow}><View style={styles.avatar}><Bot size={16} color={colors.black} /></View><View style={[styles.bubble, styles.coachBubble, styles.typing]}><EnergyLoader /><Text style={styles.typingText}>Reading your plan…</Text></View></View>
              ) : null}
            </ScrollView>

            <View style={styles.composerShell}>
              <View style={styles.composer}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Ask about today’s plan…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, webInputReset]}
                  onSubmitEditing={() => void send(text)}
                  returnKeyType="send"
                  multiline
                />
                <Pressable accessibilityLabel="Send message" style={[styles.sendButton, (!text.trim() || busy) && styles.sendButtonDisabled]} onPress={() => void send(text)} disabled={!text.trim() || busy}>
                  <Send size={18} color={colors.black} />
                </Pressable>
              </View>
              <Text style={styles.disclaimer}>Coaching guidance only. FitPlan does not diagnose pain, injury, or medical conditions.</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SUGGESTION_COLORS = [colors.primaryDim, colors.peachDim, colors.accentDim, colors.successDim];

function ContextCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View style={styles.contextCard}><View style={styles.contextIcon}>{icon}</View><View style={styles.contextCopy}><Text style={styles.contextLabel}>{label}</Text><Text style={styles.contextValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgElevated },
  topBarInner: { width: '100%', maxWidth: 1240, minHeight: 86, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  topBarInnerNarrow: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  botMark: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  sub: { color: colors.textDim, fontSize: font.tiny, marginTop: 5 },
  workspace: { flex: 1, width: '100%', maxWidth: 1240, alignSelf: 'center', flexDirection: 'row' },
  workspaceNarrow: { flexDirection: 'column' },
  contextRail: { width: 300, padding: spacing.lg, gap: spacing.sm, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.surfaceSunken },
  railEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.1 },
  railTitle: { color: colors.text, fontSize: font.h1, fontWeight: '900', marginBottom: spacing.sm },
  contextCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  contextIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  contextCopy: { flex: 1, gap: 3 },
  contextLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  contextValue: { color: colors.text, fontSize: font.tiny, fontWeight: '700', lineHeight: 16 },
  expertCard: { marginTop: 'auto', minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryDim },
  expertIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDim },
  expertCopy: { flex: 1, gap: 3 },
  expertTitle: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  expertSub: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  chatPanel: { flex: 1, backgroundColor: colors.bg },
  messages: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryDim, ...shadow.glow },
  emptyTitle: { color: colors.text, fontSize: font.h1, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm },
  emptyText: { color: colors.textDim, fontSize: font.small, lineHeight: 21, maxWidth: 610, textAlign: 'center' },
  suggestionGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  suggestionMotion: { flexGrow: 1, flexBasis: 330 },
  suggestion: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  suggestionNumber: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  suggestionNumberText: { color: colors.text, fontSize: font.tiny, fontWeight: '900' },
  suggestionText: { flex: 1, color: colors.text, fontSize: font.small, fontWeight: '700', lineHeight: 19 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, maxWidth: '86%', alignSelf: 'flex-start' },
  messageRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, flexShrink: 0 },
  bubble: { flexShrink: 1, minWidth: 0, paddingHorizontal: spacing.md, paddingVertical: 11, borderRadius: radius.md, gap: 6 },
  coachBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 2 },
  userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 2 },
  bubbleText: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  userBubbleText: { color: colors.black },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 4 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryDim },
  actionChipPressed: { opacity: 0.7 },
  actionChipText: { color: colors.primary, fontSize: font.tiny, fontWeight: '800' },
  messageMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  userMessageMeta: { color: '#4A5B25' },
  typing: { flexDirection: 'row', alignItems: 'center' },
  typingText: { color: colors.textDim, fontSize: font.tiny },
  composerShell: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated, padding: spacing.md },
  composer: { width: '100%', maxWidth: 860, minHeight: 58, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: 6, paddingLeft: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong },
  input: { flex: 1, minHeight: 44, maxHeight: 110, color: colors.text, fontSize: font.body, paddingVertical: 10, textAlignVertical: 'center' },
  sendButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendButtonDisabled: { opacity: 0.35 },
  disclaimer: { width: '100%', maxWidth: 860, alignSelf: 'center', color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: spacing.sm },
});
