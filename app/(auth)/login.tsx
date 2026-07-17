import { useRouter } from 'expo-router';
import { CalendarDays, Eye, EyeOff, Flame, LockKeyhole, ShieldCheck, Sparkles, Target } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraBackdrop, Gradient, TiltCard } from '@/components/depth';
import { DirectionalReveal, FloatingLayer, Reveal, useReducedMotion } from '@/components/motion';
import { Button, Field, InlineNotice } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, glass, gradients, radius, shadow, spacing } from '@/theme';

type Mode = 'login' | 'register';

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { signIn, register, authLoading, authError, clearAuthError } = useAppStore();
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changeMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    clearAuthError();
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (mode === 'register' && name.trim().length < 2) nextErrors.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email.';
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const ok = mode === 'register'
      ? await register(name, email, password)
      : await signIn(email, password);
    if (ok) router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AuroraBackdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.layout, !desktop && styles.layoutMobile]}>
          <ImageBackground
            source={require('../../assets/images/auth-sled-v3.png')}
            resizeMode="cover"
            style={[styles.visual, !desktop && styles.visualMobile]}
            imageStyle={styles.visualImage}
          >
            {/* Cinematic scrim for legibility + depth */}
            <Gradient colors={gradients.heroScrim} direction="vertical" locations={[0, 0.5, 1]} />
            <View style={[styles.tintLime]} pointerEvents="none" />
            <View style={styles.visualOverlay}>
              <FloatingLayer distance={5} duration={5000} style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Gradient colors={gradients.primary} direction="diagonal" radius={radius.md} />
                  <View><Target size={19} color={colors.black} strokeWidth={2.6} /></View>
                </View>
                <Text style={styles.brand}>FITPLAN</Text>
              </FloatingLayer>
              {desktop ? <AuthSignals /> : null}
              <Reveal delay={120} distance={28} style={styles.visualCopy}>
                <Text style={[styles.visualTitle, !desktop && styles.visualTitleMobile]}>
                  Train for the life{desktop ? '\n' : ' '}you actually <Text style={styles.visualTitleAccent}>live.</Text>
                </Text>
                {desktop ? (
                  <>
                    <Text style={styles.visualSub}>A precise week of training and meals that recalibrates around your real schedule.</Text>
                    <View style={styles.visualStats}>
                      <HeroStat value="03" label="TRAINING DAYS" />
                      <View style={styles.visualStatDivider} />
                      <HeroStat value="07" label="ADAPTIVE DAYS" />
                      <View style={styles.visualStatDivider} />
                      <HeroStat value="01" label="PLAN THAT LEARNS" />
                    </View>
                  </>
                ) : null}
              </Reveal>
            </View>
          </ImageBackground>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={[styles.formScrollContent, !desktop && styles.formScrollContentMobile]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Reveal delay={90} distance={24} style={styles.formOuter}>
              <View style={styles.formCard}>
                <Gradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']} direction="vertical" locations={[0, 0.5]} radius={radius.lg} />
                <View style={styles.form}>
                  <View style={styles.formHeader}>
                    <Text style={styles.eyebrow}>{mode === 'register' ? 'START YOUR PLAN' : 'WELCOME BACK'}</Text>
                    <Text style={styles.title}>
                      {mode === 'register' ? 'A plan that ' : 'Pick up where '}
                      <Text style={styles.titleAccent}>{mode === 'register' ? 'adapts to you.' : 'you left off.'}</Text>
                    </Text>
                    <Text style={styles.subtitle}>
                      {mode === 'register'
                        ? 'Create your account, then tell us how you train and eat.'
                        : 'Sign in to see today’s plan and recent progress.'}
                    </Text>
                    <View style={styles.setupRoute}>
                      <SetupStep label="ACCOUNT" active />
                      <SetupStep label="PROFILE" />
                      <SetupStep label="LIVE PLAN" />
                    </View>
                  </View>

                  <SegmentedToggle mode={mode} onChange={changeMode} />

                  <DirectionalReveal key={mode} direction={mode === 'register' ? -1 : 1} distance={22} style={styles.fields}>
                    {mode === 'register' ? (
                      <Field
                        label="Full name"
                        value={name}
                        onChangeText={(value) => { setName(value); clearAuthError(); }}
                        placeholder="Alex Morgan"
                        autoComplete="name"
                        error={errors.name}
                      />
                    ) : null}
                    <Field
                      label="Email"
                      value={email}
                      onChangeText={(value) => { setEmail(value); clearAuthError(); }}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      error={errors.email}
                    />
                    <Field
                      label="Password"
                      hint={mode === 'register' ? '8+ characters' : undefined}
                      value={password}
                      onChangeText={(value) => { setPassword(value); clearAuthError(); }}
                      placeholder="Enter your password"
                      autoCapitalize="none"
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      secureTextEntry={!showPassword}
                      error={errors.password}
                      onSubmitEditing={submit}
                      right={
                        <Pressable
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                          onPress={() => setShowPassword((value) => !value)}
                          hitSlop={10}
                        >
                          {showPassword ? <EyeOff size={19} color={colors.textDim} /> : <Eye size={19} color={colors.textDim} />}
                        </Pressable>
                      }
                    />
                    {mode === 'register' ? <PasswordStrength value={password} /> : null}
                  </DirectionalReveal>

                  {authError ? <InlineNotice tone="danger">{authError}</InlineNotice> : null}

                  <Button
                    label={mode === 'register' ? 'Create my account' : 'Sign in'}
                    onPress={submit}
                    loading={authLoading}
                    icon={<LockKeyhole size={18} color={colors.black} />}
                  />

                  <View style={styles.securityRow}>
                    <ShieldCheck size={16} color={colors.success} />
                    <Text style={styles.securityText}>Your password is encrypted and your fitness data stays private.</Text>
                  </View>

                  <View style={styles.entrySignals}>
                    <EntrySignal color={colors.primary} label="5-minute setup" />
                    <EntrySignal color={colors.accent} label="Live targets" />
                    <EntrySignal color={colors.success} label="Cloud synced" />
                  </View>
                </View>
              </View>
            </Reveal>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.visualStat}>
      <Text style={styles.visualStatValue}>{value}</Text>
      <Text style={styles.visualStatLabel}>{label}</Text>
    </View>
  );
}

function SetupStep({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={styles.setupRouteItem}>
      <View style={[styles.setupRouteLine, active && styles.setupRouteLineOn]}>
        {active ? <Gradient colors={gradients.lime} direction="horizontal" radius={2} /> : null}
      </View>
      <Text style={[styles.setupRouteText, active && styles.setupRouteTextOn]}>{label}</Text>
    </View>
  );
}

function EntrySignal({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.entrySignal}>
      <View style={[styles.entryDot, { backgroundColor: color }]} />
      <Text style={styles.entrySignalText}>{label}</Text>
    </View>
  );
}

function SegmentedToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const pad = 4;
  const segWidth = width > 0 ? (width - pad * 2) / 2 : 0;

  useEffect(() => {
    const to = mode === 'register' ? 0 : 1;
    if (reduced) x.setValue(to);
    else Animated.spring(x, { toValue: to, damping: 18, stiffness: 210, mass: 0.7, useNativeDriver: true }).start();
  }, [mode, reduced, x]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.segmented} onLayout={onLayout}>
      {segWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentIndicator,
            { width: segWidth, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, segWidth] }) }] },
          ]}
        >
          <Gradient colors={['#2C332B', '#1D211C']} direction="vertical" radius={radius.sm} />
        </Animated.View>
      ) : null}
      <Pressable style={styles.segment} onPress={() => onChange('register')}>
        <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Create account</Text>
      </Pressable>
      <Pressable style={styles.segment} onPress={() => onChange('login')}>
        <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Sign in</Text>
      </Pressable>
    </View>
  );
}

function AuthSignals() {
  const signals = [
    { label: '3 workouts', detail: 'built around your week', icon: CalendarDays, color: colors.primary, delay: 180, duration: 4600 },
    { label: 'Adaptive fuel', detail: 'targets recalculate live', icon: Flame, color: colors.peach, delay: 320, duration: 5200 },
    { label: 'Plan-aware', detail: 'coaching keeps context', icon: Sparkles, color: colors.accent, delay: 460, duration: 4900 },
  ];
  return (
    <View style={styles.authSignals}>
      {signals.map(({ label, detail, icon: Icon, color, delay, duration }) => (
        <Reveal key={label} delay={delay} distance={20}>
          <TiltCard intensity={12} style={styles.authSignalTilt}>
            <FloatingLayer distance={6} duration={duration} style={styles.authSignal}>
              <Gradient colors={gradients.surfaceGlass} direction="diagonal" radius={radius.md} />
              <View style={[styles.authSignalIcon, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
                <Icon size={17} color={color} />
              </View>
              <View>
                <Text style={styles.authSignalLabel}>{label}</Text>
                <Text style={styles.authSignalDetail}>{detail}</Text>
              </View>
            </FloatingLayer>
          </TiltCard>
        </Reveal>
      ))}
    </View>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score = [value.length >= 8, /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length;
  const color = score >= 4 ? colors.success : score >= 3 ? colors.primary : score >= 2 ? colors.warning : colors.textMuted;
  const label = value.length === 0 ? 'Waiting for password' : score >= 4 ? 'Strong protection' : score >= 3 ? 'Good protection' : 'Building protection';
  return (
    <View style={styles.passwordStrength}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((bar) => <View key={bar} style={[styles.strengthBar, bar <= score && { backgroundColor: color }]} />)}
      </View>
      <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  layout: { flex: 1, width: '100%', flexDirection: 'row', minHeight: 700, overflow: 'hidden' },
  layoutMobile: { flexDirection: 'column', minHeight: 0 },
  visual: { flex: 1.08, flexBasis: 0, minWidth: 0, overflow: 'hidden' },
  visualMobile: { flex: 0, flexBasis: 300, width: '100%', minWidth: 0, height: 300 },
  visualImage: { width: '100%', height: '100%' },
  tintLime: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(216,255,114,0.05)' },
  visualOverlay: { flex: 1, justifyContent: 'space-between', padding: spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, overflow: 'hidden', ...shadow.glowStrong },
  brand: { color: colors.white, fontWeight: '900', fontSize: font.small, letterSpacing: 2 },
  visualCopy: { maxWidth: 640, gap: spacing.md },
  authSignals: { position: 'absolute', right: 24, top: 92, gap: 11, alignItems: 'flex-end' },
  authSignalTilt: { alignSelf: 'flex-end' },
  authSignal: { minWidth: 210, minHeight: 56, paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: glass.borderStrong, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 11 },
  authSignalIcon: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  authSignalLabel: { color: colors.white, fontSize: font.small, fontWeight: '900' },
  authSignalDetail: { color: '#C4CBC1', fontSize: 10, marginTop: 2 },
  visualTitle: { color: colors.white, fontWeight: '900', fontSize: 50, lineHeight: 55, letterSpacing: -0.5 },
  visualTitleAccent: { color: colors.primary },
  visualTitleMobile: { fontSize: 30, lineHeight: 36 },
  visualSub: { color: '#E7EAE4', fontSize: 16, lineHeight: 24, maxWidth: 480 },
  visualStats: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  visualStat: { gap: 3 },
  visualStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.16)' },
  visualStatValue: { color: colors.primary, fontSize: font.h2, fontWeight: '900' },
  visualStatLabel: { color: '#D5DAD2', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  formScroll: { flex: 0.92, flexBasis: 0, minWidth: 0 },
  formScrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  formScrollContentMobile: { padding: spacing.lg, justifyContent: 'flex-start', paddingTop: spacing.xl },
  formOuter: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  formCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    backgroundColor: glass.fillStrong,
    borderWidth: 1,
    borderColor: glass.borderStrong,
    overflow: 'hidden',
    gap: spacing.lg,
  },
  form: { gap: spacing.lg },
  formHeader: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: -0.5 },
  titleAccent: { color: colors.primary },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22 },
  setupRoute: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  setupRouteItem: { flex: 1, gap: 6 },
  setupRouteLine: { height: 3, borderRadius: 2, backgroundColor: colors.borderStrong, overflow: 'hidden' },
  setupRouteLineOn: { backgroundColor: 'transparent' },
  setupRouteText: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  setupRouteTextOn: { color: colors.primary },
  segmented: { flexDirection: 'row', backgroundColor: colors.surfaceSunken, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  segmentIndicator: { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden' },
  segment: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, zIndex: 1 },
  segmentText: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  segmentTextActive: { color: colors.text },
  fields: { gap: spacing.md },
  passwordStrength: { marginTop: -8, gap: 7 },
  strengthBars: { flexDirection: 'row', gap: 5 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  strengthLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, textAlign: 'right' },
  securityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, justifyContent: 'center' },
  securityText: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, flexShrink: 1 },
  entrySignals: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingTop: 2 },
  entrySignal: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entryDot: { width: 5, height: 5, borderRadius: 3 },
  entrySignalText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
});
