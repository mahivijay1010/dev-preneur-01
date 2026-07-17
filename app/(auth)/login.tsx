import { useRouter } from 'expo-router';
import { CalendarDays, Eye, EyeOff, Flame, LockKeyhole, ShieldCheck, Sparkles, Target } from 'lucide-react-native';
import { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DirectionalReveal, FloatingLayer, Reveal } from '@/components/motion';
import { Button, Field, InlineNotice } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.layout, !desktop && styles.layoutMobile]}>
          <ImageBackground
            source={require('../../assets/images/auth-sled-v3.png')}
            resizeMode="cover"
            style={[styles.visual, !desktop && styles.visualMobile]}
            imageStyle={styles.visualImage}
          >
            <View style={styles.visualOverlay}>
              <FloatingLayer distance={5} duration={5000} style={styles.brandRow}>
                <View style={styles.brandMark}><Target size={18} color={colors.black} strokeWidth={2.5} /></View>
                <Text style={styles.brand}>FITPLAN</Text>
              </FloatingLayer>
              {desktop ? <AuthSignals /> : null}
              <Reveal delay={120} distance={28} style={styles.visualCopy}>
                <Text style={[styles.visualTitle, !desktop && styles.visualTitleMobile]}>Train for the life{desktop ? '\n' : ' '}you actually live.</Text>
                {desktop ? (
                  <>
                    <Text style={styles.visualSub}>A precise week of training and meals that recalibrates around your real schedule.</Text>
                    <View style={styles.visualStats}>
                      <View style={styles.visualStat}><Text style={styles.visualStatValue}>03</Text><Text style={styles.visualStatLabel}>TRAINING DAYS</Text></View>
                      <View style={styles.visualStat}><Text style={styles.visualStatValue}>07</Text><Text style={styles.visualStatLabel}>ADAPTIVE DAYS</Text></View>
                      <View style={styles.visualStat}><Text style={styles.visualStatValue}>01</Text><Text style={styles.visualStatLabel}>PLAN THAT LEARNS</Text></View>
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
          >
            <Reveal delay={90} distance={24} style={styles.form}>
              <View style={styles.formHeader}>
                <Text style={styles.eyebrow}>{mode === 'register' ? 'START YOUR PLAN' : 'WELCOME BACK'}</Text>
                <Text style={styles.title}>{mode === 'register' ? 'A plan that adapts to you.' : 'Pick up where you left off.'}</Text>
                <Text style={styles.subtitle}>
                  {mode === 'register'
                    ? 'Create your account, then tell us how you train and eat.'
                    : 'Sign in to see today’s plan and recent progress.'}
                </Text>
                <View style={styles.setupRoute}>
                  <View style={styles.setupRouteItem}><View style={[styles.setupRouteLine, styles.setupRouteLineOn]} /><Text style={styles.setupRouteText}>ACCOUNT</Text></View>
                  <View style={styles.setupRouteItem}><View style={styles.setupRouteLine} /><Text style={styles.setupRouteText}>PROFILE</Text></View>
                  <View style={styles.setupRouteItem}><View style={styles.setupRouteLine} /><Text style={styles.setupRouteText}>LIVE PLAN</Text></View>
                </View>
              </View>

              <View style={styles.segmented}>
                <Pressable onPress={() => changeMode('register')} style={[styles.segment, mode === 'register' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Create account</Text>
                </Pressable>
                <Pressable onPress={() => changeMode('login')} style={[styles.segment, mode === 'login' && styles.segmentActive]}>
                  <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Sign in</Text>
                </Pressable>
              </View>

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
                <View style={styles.entrySignal}><View style={[styles.entryDot, { backgroundColor: colors.primary }]} /><Text style={styles.entrySignalText}>5-minute setup</Text></View>
                <View style={styles.entrySignal}><View style={[styles.entryDot, { backgroundColor: colors.accent }]} /><Text style={styles.entrySignalText}>Live targets</Text></View>
                <View style={styles.entrySignal}><View style={[styles.entryDot, { backgroundColor: colors.success }]} /><Text style={styles.entrySignalText}>Cloud synced</Text></View>
              </View>
            </Reveal>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AuthSignals() {
  const signals = [
    { label: '3 workouts', detail: 'built around your week', icon: CalendarDays, color: colors.primary, delay: 180, duration: 4600 },
    { label: 'Adaptive fuel', detail: 'targets recalculate live', icon: Flame, color: colors.peach, delay: 320, duration: 5200 },
    { label: 'Plan-aware', detail: 'coaching keeps context', icon: Sparkles, color: colors.accent, delay: 460, duration: 4900 },
  ];
  return (
    <View pointerEvents="none" style={styles.authSignals}>
      {signals.map(({ label, detail, icon: Icon, color, delay, duration }) => (
        <Reveal key={label} delay={delay} distance={20}>
          <FloatingLayer distance={6} duration={duration} style={styles.authSignal}>
            <View style={[styles.authSignalIcon, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
              <Icon size={17} color={color} />
            </View>
            <View>
              <Text style={styles.authSignalLabel}>{label}</Text>
              <Text style={styles.authSignalDetail}>{detail}</Text>
            </View>
          </FloatingLayer>
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
  visualMobile: { flex: 0, flexBasis: 280, width: '100%', minWidth: 0, height: 280 },
  visualImage: { width: '100%', height: '100%', borderBottomRightRadius: radius.md },
  visualOverlay: { flex: 1, justifyContent: 'space-between', padding: spacing.xl, backgroundColor: 'rgba(8,10,8,0.24)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  brand: { color: colors.white, fontWeight: '900', fontSize: font.small, letterSpacing: 1.8 },
  visualCopy: { maxWidth: 620, gap: spacing.md },
  authSignals: { position: 'absolute', right: 24, top: 92, gap: 9, alignItems: 'flex-end' },
  authSignal: { minWidth: 198, minHeight: 54, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(9,10,9,0.78)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  authSignalIcon: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  authSignalLabel: { color: colors.white, fontSize: font.small, fontWeight: '900' },
  authSignalDetail: { color: '#BFC6BD', fontSize: 10, marginTop: 2 },
  visualTitle: { color: colors.white, fontWeight: '900', fontSize: 48, lineHeight: 53 },
  visualTitleMobile: { fontSize: 27, lineHeight: 33 },
  visualSub: { color: '#E7EAE4', fontSize: 16, lineHeight: 24, maxWidth: 480 },
  visualStats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)' },
  visualStat: { gap: 3 },
  visualStatValue: { color: colors.primary, fontSize: font.h2, fontWeight: '900' },
  visualStatLabel: { color: '#D5DAD2', fontSize: 9, fontWeight: '800' },
  formScroll: { flex: 0.92, flexBasis: 0, minWidth: 0, backgroundColor: colors.bgElevated, borderLeftWidth: 1, borderLeftColor: colors.border },
  formScrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl },
  formScrollContentMobile: { padding: spacing.lg, justifyContent: 'flex-start' },
  form: { width: '100%', maxWidth: 500, alignSelf: 'center', gap: spacing.lg },
  formHeader: { gap: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 36, lineHeight: 42, fontWeight: '900' },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22 },
  setupRoute: { flexDirection: 'row', gap: 7, marginTop: spacing.sm },
  setupRouteItem: { flex: 1, gap: 6 },
  setupRouteLine: { height: 2, borderRadius: 1, backgroundColor: colors.borderStrong },
  setupRouteLineOn: { backgroundColor: colors.primary },
  setupRouteText: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  segmented: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surfaceMuted },
  segmentText: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  segmentTextActive: { color: colors.text },
  fields: { gap: spacing.md },
  passwordStrength: { marginTop: -8, gap: 7 },
  strengthBars: { flexDirection: 'row', gap: 5 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  strengthLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, textAlign: 'right' },
  securityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, justifyContent: 'center' },
  securityText: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 16, flexShrink: 1 },
  entrySignals: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingTop: 2 },
  entrySignal: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entryDot: { width: 5, height: 5, borderRadius: 3 },
  entrySignalText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
});
