import { useRouter } from 'expo-router';
import { Check, Database, HeartPulse, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, InlineNotice, Screen } from '@/components/ui';
import { FloatingLayer, Reveal, usePressMotion } from '@/components/motion';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

const ITEMS = [
  {
    icon: LockKeyhole,
    title: 'Private by default',
    body: 'Your account and fitness records are stored securely and are never sold.',
  },
  {
    icon: Database,
    title: 'Synced to your account',
    body: 'Plan answers and daily logs are saved so you can continue across sessions.',
  },
  {
    icon: HeartPulse,
    title: 'Guidance, not diagnosis',
    body: 'Targets are estimates. Stop if you feel unwell and consult a qualified professional.',
  },
];

export default function Consent() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const { acceptConsent, authLoading, authError } = useAppStore();
  const [checked, setChecked] = useState(false);
  const { animatedStyle, pressHandlers } = usePressMotion();

  const accept = async () => {
    if (await acceptConsent()) router.replace('/');
  };

  return (
    <Screen maxWidth={900} contentStyle={styles.content}>
      <Reveal style={[styles.hero, !wide && styles.heroNarrow]}>
        <View style={styles.heroCopy}>
          <FloatingLayer distance={4} duration={4800} style={styles.iconBadge}><ShieldCheck size={24} color={colors.black} /></FloatingLayer>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>YOUR DATA & SAFETY</Text>
            <Text style={styles.title}>A clear agreement before we begin.</Text>
            <Text style={styles.subtitle}>
              FitPlan provides general fitness and nutrition guidance. It does not replace advice from a doctor, dietitian, or physiotherapist.
            </Text>
          </View>
        </View>
        {wide ? <SafetySignal /> : null}
      </Reveal>

      <Card style={styles.list}>
        {ITEMS.map(({ icon: Icon, title, body }, index) => (
          <Reveal key={title} delay={120 + index * 90} distance={12} style={[styles.item, index > 0 && styles.itemBorder]}>
            {wide ? <View style={styles.itemIndex}><Text style={styles.itemIndexText}>0{index + 1}</Text></View> : null}
            <View style={styles.itemIcon}><Icon size={19} color={colors.primary} /></View>
            <View style={styles.itemCopy}>
              <Text style={styles.itemTitle}>{title}</Text>
              <Text style={styles.itemBody}>{body}</Text>
            </View>
            {wide ? <View style={styles.itemState}><Check size={13} color={colors.success} strokeWidth={3} /><Text style={styles.itemStateText}>ACTIVE</Text></View> : null}
          </Reveal>
        ))}
      </Card>

      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          style={[styles.checkRow, checked && styles.checkRowOn]}
          onPress={() => setChecked((value) => !value)}
          {...pressHandlers}
        >
          <View style={[styles.box, checked && styles.boxOn]}>
            {checked ? <Check size={17} color={colors.black} strokeWidth={3} /> : null}
          </View>
          <View style={styles.checkCopy}>
            <Text style={styles.checkText}>I understand and accept the privacy notice and health disclaimer.</Text>
            <Text style={[styles.checkState, checked && styles.checkStateOn]}>{checked ? 'AGREEMENT READY' : 'REVIEWED BY YOU'}</Text>
          </View>
        </Pressable>
      </Animated.View>

      {authError ? <InlineNotice tone="danger">{authError}</InlineNotice> : null}
      <Button label="Accept and continue" icon={<ShieldCheck size={18} color={colors.black} />} onPress={accept} disabled={!checked} loading={authLoading} />
    </Screen>
  );
}

function SafetySignal() {
  return (
    <FloatingLayer distance={5} duration={5400} style={styles.safetySignal}>
      <View style={styles.signalTop}>
        <View style={styles.signalShield}><ShieldCheck size={27} color={colors.primary} /></View>
        <View>
          <Text style={styles.signalEyebrow}>FITPLAN VAULT</Text>
          <Text style={styles.signalTitle}>Protection online</Text>
        </View>
      </View>
      <View style={styles.signalTrack}><View style={styles.signalTrackFill} /></View>
      <View style={styles.signalStates}>
        {['ENCRYPTED', 'SYNCED', 'PRIVATE'].map((label, index) => (
          <View key={label} style={styles.signalState}>
            <View style={[styles.signalDot, { backgroundColor: [colors.primary, colors.accent, colors.success][index] }]} />
            <Text style={styles.signalStateText}>{label}</Text>
          </View>
        ))}
      </View>
    </FloatingLayer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, gap: spacing.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  heroNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  heroCopy: { flex: 1, gap: spacing.md },
  iconBadge: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: font.h1, lineHeight: 37, fontWeight: '800', maxWidth: 600 },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 23, maxWidth: 680 },
  safetySignal: { width: 260, minHeight: 148, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceSunken, padding: spacing.md, justifyContent: 'space-between', gap: spacing.md },
  signalTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalShield: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  signalEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.9 },
  signalTitle: { color: colors.text, fontSize: font.body, fontWeight: '900', marginTop: 3 },
  signalTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.border },
  signalTrackFill: { width: '100%', height: '100%', backgroundColor: colors.primary },
  signalStates: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  signalState: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  signalDot: { width: 5, height: 5, borderRadius: 3 },
  signalStateText: { color: colors.textMuted, fontSize: 7, fontWeight: '800' },
  list: { paddingVertical: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemIndex: { width: 24 },
  itemIndexText: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  itemIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { color: colors.text, fontWeight: '700', fontSize: font.body },
  itemBody: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  itemState: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemStateText: { color: colors.success, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  checkRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  checkRowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  box: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkCopy: { flex: 1, gap: 4 },
  checkText: { color: colors.text, flex: 1, fontSize: font.small, lineHeight: 20 },
  checkState: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  checkStateOn: { color: colors.primary },
});
