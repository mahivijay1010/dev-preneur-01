import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { Gradient, GlowPulse, ShineSweep } from '@/components/depth';
import { AnimatedNumber, DirectionalReveal, EnergyLoader, Reveal, StaggerText, useReducedMotion } from '@/components/motion';
import { Card, Eyebrow, InlineNotice, Screen, SectionHeader, StatusPill, Subtitle } from '@/components/ui';
import type { PickedImage } from '@/services/imagePicker';
import { isVisionEnabled, scanMenu } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { MenuScanResult } from '@/types';

const CONFIDENCE_COLOR: Record<MenuScanResult['confidence'], string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.textDim,
};

const HOW_IT_WORKS = [
  { step: '01', copy: 'Photograph the menu — restaurant, canteen, buffet, or grocery shelf.' },
  { step: '02', copy: 'Every dish is ranked against your calorie and protein targets.' },
  { step: '03', copy: 'Order the top pick with a calorie estimate and a reason you can trust.' },
];

// Menu scanner — photograph a restaurant/canteen/buffet/grocery menu and get the
// best options for the user's current target.
export default function MenuScanner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { profile, plan } = useAppStore();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MenuScanResult | null>(null);
  const [error, setError] = useState('');

  const scan = async (img: PickedImage) => {
    setImage(img);
    setResult(null);
    setError('');
    if (!img.base64 || !isVisionEnabled() || !profile || !plan) {
      setResult({ recommendations: [], avoid: [], confidence: 'low', source: 'manual' });
      return;
    }
    setBusy(true);
    try {
      setResult(await scanMenu(img.base64, img.mimeType, profile, plan));
    } catch {
      setError('Something went wrong while reading the menu. Try another photo, or evaluate a dish by name in Restaurant mode.');
    } finally {
      setBusy(false);
    }
  };

  // The manual fallback has three distinct causes — name the real one instead
  // of blaming menu readability for a missing key or unfinished onboarding.
  const fallbackMessage = !isVisionEnabled()
    ? 'Menu scanning needs an AI vision key. Add one to enable scanning, or evaluate a dish by name in the Restaurant tool.'
    : !profile || !plan
      ? 'Finish onboarding first so menu picks can be matched to your plan and targets.'
      : 'That photo had no readable menu text. Retake it flat and well lit, or evaluate a dish by name in the Restaurant tool.';

  const outcome = (
    <View style={styles.outcome}>
      {busy ? (
        <Card tone="glass" style={styles.loading}>
          <ScanBeam />
          <GlowPulse color={colors.primary} radius={radius.md} intensity={0.3} style={styles.loaderGlow}>
            <EnergyLoader />
          </GlowPulse>
          <View style={styles.loadingCopy}>
            <Text style={styles.loadingTitle}>Reading the menu</Text>
            <Text style={styles.dim}>Ranking dishes against your plan…</Text>
          </View>
        </Card>
      ) : null}

      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

      {result && result.source === 'manual' ? (
        <InlineNotice tone="info">{fallbackMessage}</InlineNotice>
      ) : null}

      {result && result.recommendations.length > 0 ? (
        <>
          <Reveal style={styles.confRow}>
            <SectionHeader>Best picks for you</SectionHeader>
            <StatusPill label={`${result.confidence} confidence`} color={CONFIDENCE_COLOR[result.confidence]} />
          </Reveal>
          {result.recommendations.map((r, index) => {
            const card = (
              <Card tone="glass" style={styles.pickCard}>
                {index === 0 ? <ShineSweep interval={30000} delay={500} /> : null}
                <View style={styles.rankRow}>
                  <View style={styles.rankMedal}>
                    <Gradient colors={gradients.primary} direction="diagonal" radius={radius.pill} />
                    <Text style={styles.rankText}>#{r.rank}</Text>
                  </View>
                  <Text style={styles.dish}>{r.dish}</Text>
                </View>
                <Text style={styles.reason}>{r.reason}</Text>
                {r.estCalories[1] > 0 ? (
                  <View style={styles.calRow}>
                    <AnimatedNumber value={r.estCalories[0]} prefix="~" style={styles.cal} />
                    <Text style={styles.cal}>–</Text>
                    <AnimatedNumber value={r.estCalories[1]} suffix=" kcal" style={styles.cal} />
                  </View>
                ) : null}
              </Card>
            );
            return (
              <DirectionalReveal key={r.rank} direction={-1} delay={index * 80} distance={26}>
                {index === 0 ? (
                  <GlowPulse color={colors.primary} radius={radius.md} intensity={0.14}>{card}</GlowPulse>
                ) : card}
              </DirectionalReveal>
            );
          })}

          {result.avoid.length > 0 ? (
            <DirectionalReveal direction={-1} delay={result.recommendations.length * 80} distance={26}>
              <Card tone="tinted" style={styles.avoidCard}>
                <Text style={styles.avoidEyebrow}>MAYBE SKIP TODAY</Text>
                {result.avoid.map((a, i) => (
                  <View key={i} style={styles.avoidRow}>
                    <View style={styles.avoidRule} />
                    <Text style={styles.avoid}>{a}</Text>
                  </View>
                ))}
              </Card>
            </DirectionalReveal>
          ) : null}
          <Text style={styles.disclaimer}>Estimates vary by kitchen — treat them as a guide.</Text>
        </>
      ) : null}

      {!result && !busy && !error ? (
        <Reveal delay={140}>
          <Card tone="glass">
            <Text style={styles.howTitle}>How menu scan works</Text>
            {HOW_IT_WORKS.map((item) => (
              <View key={item.step} style={styles.howRow}>
                <View style={styles.howStep}><Text style={styles.howStepText}>{item.step}</Text></View>
                <Text style={styles.howCopy}>{item.copy}</Text>
              </View>
            ))}
          </Card>
        </Reveal>
      ) : null}
    </View>
  );

  return (
    <Screen maxWidth={1080}>
      <Reveal style={[styles.header, width < 700 && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Eyebrow>SMART DINING</Eyebrow>
          <StaggerText
            text="Order the smartest thing on the menu."
            accentWords={['smartest']}
            style={styles.titleText}
          />
          <Subtitle>
            {isVisionEnabled()
              ? 'Photograph a menu — restaurant, canteen, buffet, or grocery shelf — and I’ll pick the best options for your goal.'
              : 'Add an API key to enable menu scanning.'}
          </Subtitle>
        </View>
        <View style={width < 700 ? styles.headerActionCompact : null}>
          <CloseButton onPress={() => router.back()} />
        </View>
      </Reveal>

      <View style={[styles.layout, !wide && styles.layoutCompact]}>
        <View style={styles.captureColumn}>
          <Reveal delay={80}>
            <CaptureButtons
              image={image}
              onPicked={scan}
              busy={busy}
              title="Get the whole menu in frame"
              description="Flat, well-lit pages read best."
              accent={colors.accent}
            />
          </Reveal>
        </View>
        <View style={styles.resultsColumn}>{outcome}</View>
      </View>
    </Screen>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Close menu scanner" style={styles.closeButton} onPress={onPress}>
      <X size={21} color={colors.text} />
    </Pressable>
  );
}

// A lime read-out beam that sweeps across the busy card while the menu is
// being analyzed. Native-driver loop, settles/skips under reduced motion.
function ScanBeam() {
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  const [box, setBox] = useState(0);

  useEffect(() => {
    if (reduced || box === 0) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [box, reduced, sweep]);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(event) => setBox(event.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          styles.scanBeam,
          { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, box - 46)] }) }] },
        ]}
      >
        <Gradient
          colors={['rgba(216,255,114,0)', 'rgba(216,255,114,0.45)', 'rgba(216,255,114,0)']}
          direction="horizontal"
        />
      </Animated.View>
    </View>
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
  layoutCompact: { flexDirection: 'column', alignItems: 'stretch' },
  captureColumn: { flex: 1.1, width: '100%' },
  resultsColumn: { flex: 0.9, width: '100%' },
  outcome: { gap: spacing.md },
  dim: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  loading: { minHeight: 92, flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center' },
  loaderGlow: { padding: spacing.sm, borderRadius: radius.md },
  loadingCopy: { gap: 2 },
  loadingTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pickCard: { gap: spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankMedal: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rankText: { color: colors.black, fontWeight: '900', fontSize: font.tiny },
  dish: { color: colors.text, fontWeight: '700', fontSize: font.body, flex: 1 },
  reason: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  calRow: { flexDirection: 'row', alignItems: 'center' },
  cal: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  avoidCard: { backgroundColor: colors.warningDim, borderColor: `${colors.warning}44` },
  avoidEyebrow: { color: colors.warning, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.4 },
  avoidRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avoidRule: { width: 3, alignSelf: 'stretch', minHeight: 18, borderRadius: 2, backgroundColor: colors.warning, marginTop: 2 },
  avoid: { flex: 1, color: colors.warning, fontSize: font.small, lineHeight: 20 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center' },
  howTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginBottom: spacing.xs },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  howStep: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryDim },
  howStepText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  howCopy: { flex: 1, color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  scanBeam: { position: 'absolute', top: 0, bottom: 0, width: 46 },
});
