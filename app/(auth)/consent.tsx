import { useRouter } from 'expo-router';
import { Check, Database, HeartPulse, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Gradient, GlowPulse, ShineSweep } from '@/components/depth';
import { AchievementBurst, FloatingLayer, Reveal, StaggerText, usePressMotion, useReducedMotion } from '@/components/motion';
import { Button, Card, InlineNotice, Screen, StatusPill } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';

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
  const [celebrating, setCelebrating] = useState(false);
  const { animatedStyle, pressHandlers } = usePressMotion();

  const accept = async () => {
    if (await acceptConsent()) setCelebrating(true);
  };

  return (
    <>
      <Screen maxWidth={900} contentStyle={styles.content}>
        <Reveal style={[styles.hero, !wide && styles.heroNarrow]}>
          <View style={styles.heroCopy}>
            <FloatingLayer distance={4} duration={4800} style={styles.iconBadgeWrap}>
              <GlowPulse color={colors.primary} radius={radius.md} intensity={0.4} style={styles.iconBadge}>
                <View><ShieldCheck size={24} color={colors.black} /></View>
              </GlowPulse>
            </FloatingLayer>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>YOUR DATA & SAFETY</Text>
              <StaggerText text="A clear agreement before we begin." accentWords={['agreement']} style={styles.title} />
              <Text style={styles.subtitle}>
                FitPlan provides general fitness and nutrition guidance. It does not replace advice from a doctor, dietitian, or physiotherapist.
              </Text>
            </View>
          </View>
          {wide ? <SafetySignal sealed={checked} /> : null}
        </Reveal>

        <View style={[styles.agreementRow, !wide && styles.agreementColumn]}>
          <Card style={styles.list}>
            {ITEMS.map(({ icon: Icon, title, body }, index) => (
              <Reveal key={title} delay={120 + index * 90} distance={12} style={[styles.item, index > 0 && styles.itemBorder]}>
                {wide ? <View style={styles.itemIndex}><Text style={styles.itemIndexText}>0{index + 1}</Text></View> : null}
                <View style={styles.itemIcon}>
                  <Gradient colors={gradients.primary} opacity={0.15} radius={radius.md} />
                  <View><Icon size={19} color={colors.primary} /></View>
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{title}</Text>
                  <Text style={styles.itemBody}>{body}</Text>
                </View>
                {wide ? <View style={styles.itemState}><StatusPill label="ACTIVE" color={colors.success} /></View> : null}
              </Reveal>
            ))}
          </Card>

          <View style={[styles.agreementCol, wide && styles.agreementColWide]}>
            <Animated.View style={animatedStyle}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                style={[styles.checkRow, checked && styles.checkRowOn]}
                onPress={() => setChecked((value) => !value)}
                {...pressHandlers}
              >
                {checked ? <ShineSweep interval={5200} delay={0} /> : null}
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
          </View>
        </View>
      </Screen>

      <AchievementBurst
        visible={celebrating}
        title="Agreement sealed"
        detail="PROTECTION ON"
        onFinished={() => router.replace('/')}
      />
    </>
  );
}

function SafetySignal({ sealed }: { sealed: boolean }) {
  return (
    <FloatingLayer distance={5} duration={5400} style={styles.safetySignalWrap}>
      <Card tone="glass" style={styles.safetySignal}>
        <ShineSweep interval={4000} delay={800} />
        <View style={styles.signalTop}>
          <View style={styles.signalShield}><ShieldCheck size={27} color={colors.primary} /></View>
          <View>
            <Text style={styles.signalEyebrow}>FITPLAN VAULT</Text>
            <Text style={styles.signalTitle}>Protection online</Text>
          </View>
        </View>
        <View style={styles.signalTrack}><VaultTrackFill sealed={sealed} /></View>
        <View style={styles.signalStates}>
          <StatusPill label="ENCRYPTED" color={colors.primary} />
          <StatusPill label="SYNCED" color={colors.accent} />
          <StatusPill label="PRIVATE" color={colors.success} />
        </View>
      </Card>
    </FloatingLayer>
  );
}

// The protection bar rests partially filled and completes to 100% the moment
// the user agrees — the vault visibly locking in.
function VaultTrackFill({ sealed }: { sealed: boolean }) {
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(sealed ? 100 : 55)).current;

  useEffect(() => {
    const target = sealed ? 100 : 55;
    if (reduced) {
      fill.setValue(target);
      return;
    }
    const anim = Animated.timing(fill, { toValue: target, duration: 700, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [fill, reduced, sealed]);

  return (
    <Animated.View
      style={[
        styles.signalTrackFill,
        { width: fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, gap: spacing.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  heroNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  heroCopy: { flex: 1, gap: spacing.md },
  iconBadgeWrap: { alignSelf: 'flex-start' },
  iconBadge: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  header: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: font.h1, lineHeight: 37, fontWeight: '800', maxWidth: 600 },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 23, maxWidth: 680 },
  safetySignalWrap: { alignSelf: 'flex-start' },
  safetySignal: { width: 280, minHeight: 156, justifyContent: 'space-between', gap: spacing.md },
  signalTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalShield: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  signalEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  signalTitle: { color: colors.text, fontSize: font.body, fontWeight: '900', marginTop: 3 },
  signalTrack: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.border },
  signalTrackFill: { height: '100%', backgroundColor: colors.primary },
  signalStates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  list: { flex: 1, paddingVertical: spacing.sm },
  agreementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  agreementColumn: { flexDirection: 'column' },
  agreementCol: { gap: spacing.md },
  agreementColWide: { width: 300, flexShrink: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  itemIndex: { width: 24 },
  itemIndexText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  itemIcon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primaryDim, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemCopy: { flex: 1, gap: 3 },
  itemTitle: { color: colors.text, fontWeight: '700', fontSize: font.body },
  itemBody: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  itemState: { flexDirection: 'row', alignItems: 'center' },
  checkRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  checkRowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  box: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkCopy: { flex: 1, gap: 4 },
  checkText: { color: colors.text, flex: 1, fontSize: font.small, lineHeight: 20 },
  checkState: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  checkStateOn: { color: colors.primary },
});
