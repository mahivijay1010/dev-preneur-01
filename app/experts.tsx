import { useRouter } from 'expo-router';
import { ChevronLeft, Send, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

import { Gradient, GlowPulse, ShineSweep } from '@/components/depth';
import { DirectionalReveal, EnergyLoader, Reveal, StaggerText, usePressMotion } from '@/components/motion';
import { Button, Card, Screen, SectionHeader, StatusPill } from '@/components/ui';
import { EXPERTS, expertById } from '@/data/experts';
import { useAppStore } from '@/store/appStore';
import { colors, font, glass, gradients, radius, shadow, spacing } from '@/theme';
import type { Expert } from '@/types';

const PERKS = [
  { label: 'Plan reviews', detail: 'They audit your live plan', color: colors.primary },
  { label: 'Progress monitoring', detail: 'They see what you log', color: colors.accent },
  { label: 'Direct messages', detail: 'Ask anything, anytime', color: colors.peach },
];

// Human expert support — choose a professional, request a plan review, and
// message them. Experts can review/monitor and receive safety alerts.
export default function Experts() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const {
    assignedExpertId,
    assignExpert,
    expertMessages,
    sendExpertMessage,
    requestPlanReview,
    planReviews,
  } = useAppStore();
  const [text, setText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [avatarShine, setAvatarShine] = useState(false);
  const sendMotion = usePressMotion();
  const expert = expertById(assignedExpertId ?? '');
  const latestReview = planReviews[planReviews.length - 1];

  // "Live presence": a single shine crosses the expert avatar when a new
  // expert message arrives.
  const expertMessageCount = expertMessages.filter((m) => m.from === 'expert').length;
  const previousExpertCount = useRef(expertMessageCount);
  useEffect(() => {
    const previous = previousExpertCount.current;
    previousExpertCount.current = expertMessageCount;
    if (expertMessageCount <= previous) return;
    setAvatarShine(true);
    const timer = setTimeout(() => setAvatarShine(false), 1800);
    return () => clearTimeout(timer);
  }, [expertMessageCount]);

  // Brief acknowledgement beat after a plan review is requested.
  useEffect(() => {
    if (!reviewing) return;
    const timer = setTimeout(() => setReviewing(false), 900);
    return () => clearTimeout(timer);
  }, [reviewing]);

  // Directory view when no expert is assigned yet.
  if (!expert) {
    return (
      <Screen maxWidth={1080}>
        <Reveal style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>HUMAN GUIDANCE</Text>
            <StaggerText text="Expert support" accentWords={['Expert']} style={styles.title} />
            <Text style={styles.subtitle}>
              Get optional guidance from a certified professional. They can review your plan,
              monitor progress, and message you.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close expert support"
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={21} color={colors.text} />
          </Pressable>
        </Reveal>

        <View style={styles.grid}>
          {EXPERTS.map((e, index) => (
            <ExpertCard
              key={e.id}
              expert={e}
              index={index}
              wide={wide}
              onChoose={() => assignExpert(e.id)}
            />
          ))}
        </View>

        <Reveal delay={120 + EXPERTS.length * 90} style={styles.perksStrip}>
          {PERKS.map((perk) => (
            <View key={perk.label} style={styles.perk}>
              <View style={[styles.perkDot, { backgroundColor: perk.color }]} />
              <View style={styles.perkCopy}>
                <Text style={styles.perkLabel}>{perk.label}</Text>
                <Text style={styles.perkDetail}>{perk.detail}</Text>
              </View>
            </View>
          ))}
        </Reveal>
      </Screen>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    sendExpertMessage(text.trim());
    setText('');
  };

  const askReview = () => {
    requestPlanReview();
    setReviewing(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.chatHeaderButton}
          >
            <ChevronLeft size={18} color={colors.text} />
            <Text style={styles.chatHeaderButtonText}>Back</Text>
          </Pressable>
          <View style={styles.chatIdentity}>
            <GlowPulse color={colors.primary} radius={24} intensity={0.4}>
              <View style={styles.chatAvatar}>
                <Gradient colors={gradients.primary} direction="diagonal" radius={22} />
                <View><Text style={styles.chatAvatarEmoji}>{expert.icon}</Text></View>
                {avatarShine ? <ShineSweep interval={9000} delay={0} width={34} /> : null}
              </View>
            </GlowPulse>
            <View style={styles.chatIdentityCopy}>
              <Text style={styles.chatName} numberOfLines={1}>{expert.name}</Text>
              <Text style={styles.chatCred} numberOfLines={1}>{expert.credential}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch expert"
            onPress={() => assignExpert('')}
            hitSlop={8}
            style={styles.chatHeaderButton}
          >
            <Text style={styles.switchText}>Switch</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          <Card tone="tinted" style={[styles.reviewCard, reviewing && styles.reviewCardPending]}>
            <View style={styles.reviewHead}>
              <SectionHeader>Plan review</SectionHeader>
              {latestReview && !reviewing ? <StatusPill label="Reviewed" color={colors.success} /> : null}
            </View>
            {reviewing ? (
              <View style={styles.reviewingRow}>
                <EnergyLoader />
                <Text style={styles.reviewingText}>Reviewing your plan…</Text>
              </View>
            ) : latestReview ? (
              <Reveal key={latestReview.id} distance={10} style={styles.reviewBody}>
                <Text style={styles.reviewSummary}>{latestReview.summary}</Text>
                {latestReview.suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestionRow}>
                    <View style={styles.suggestionDot}>
                      <Gradient colors={gradients.primary} direction="diagonal" radius={3} />
                    </View>
                    <Text style={styles.suggestion}>{s}</Text>
                  </View>
                ))}
              </Reveal>
            ) : (
              <Text style={styles.reviewEmpty}>Ask {expert.name} to review your current plan.</Text>
            )}
            <Button label="Request plan review" variant="ghost" onPress={askReview} />
          </Card>

          {expertMessages.map((m) => (
            <DirectionalReveal
              key={m.id}
              direction={m.from === 'user' ? 1 : -1}
              distance={26}
              style={[styles.bubble, m.from === 'user' ? styles.user : styles.expert]}
            >
              <Text style={[styles.bubbleText, m.from === 'user' && { color: colors.bg }]}>{m.text}</Text>
            </DirectionalReveal>
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
          <Animated.View style={sendMotion.animatedStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={styles.sendBtn}
              onPress={send}
              {...sendMotion.pressHandlers}
            >
              <Gradient colors={gradients.primary} direction="diagonal" radius={23} />
              <View><Send size={19} color={colors.black} /></View>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ExpertCard({
  expert,
  index,
  wide,
  onChoose,
}: {
  expert: Expert;
  index: number;
  wide: boolean;
  onChoose: () => void;
}) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Reveal delay={120 + index * 90} style={[styles.gridItem, wide && styles.gridItemWide]}>
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${expert.name}`}
          onPress={onChoose}
          {...pressHandlers}
        >
          <Card tone="glass" style={styles.expertCard}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Gradient colors={gradients.primary} direction="diagonal" radius={24} />
                <View><Text style={styles.avatarEmoji}>{expert.icon}</Text></View>
              </View>
              <View style={styles.expertCopy}>
                <Text style={styles.name}>{expert.name}</Text>
                <View style={styles.credRow}>
                  <StatusPill label={expert.credential} color={colors.primary} />
                </View>
                <Text style={styles.specialty}>{expert.specialty}</Text>
              </View>
            </View>
            <Button label="Choose" variant="ghost" onPress={onChoose} />
          </Card>
        </Pressable>
      </Animated.View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 680 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '100%' },
  gridItemWide: { flexBasis: '48%', flexGrow: 1, width: 'auto' },
  expertCard: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.glow,
  },
  avatarEmoji: { fontSize: 24 },
  expertCopy: { flex: 1, gap: 5 },
  name: { color: colors.text, fontWeight: '700', fontSize: font.body },
  credRow: { flexDirection: 'row' },
  specialty: { color: colors.textDim, fontSize: font.tiny },
  perksStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    backgroundColor: glass.fill,
  },
  perk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 180, flexGrow: 1 },
  perkDot: { width: 6, height: 6, borderRadius: 3 },
  perkCopy: { gap: 1 },
  perkLabel: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  perkDetail: { color: colors.textMuted, fontSize: font.tiny },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: glass.border,
    backgroundColor: glass.fillStrong,
  },
  chatHeaderButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  chatHeaderButtonText: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  switchText: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  chatIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chatAvatarEmoji: { fontSize: 21 },
  chatIdentityCopy: { flexShrink: 1 },
  chatName: { color: colors.text, fontWeight: '800', fontSize: font.body },
  chatCred: { color: colors.textDim, fontSize: font.tiny },
  messages: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: spacing.md, gap: spacing.sm },
  reviewCard: { gap: spacing.sm },
  reviewCardPending: { borderColor: colors.primary },
  reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reviewBody: { gap: spacing.sm },
  reviewingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  reviewingText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  reviewSummary: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  suggestionDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, overflow: 'hidden' },
  suggestion: { flex: 1, color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  reviewEmpty: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
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
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadow.glow,
  },
});
