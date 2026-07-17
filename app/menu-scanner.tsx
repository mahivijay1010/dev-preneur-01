import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { EnergyLoader } from '@/components/motion';
import { Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import type { PickedImage } from '@/services/imagePicker';
import { isVisionEnabled, scanMenu } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { MenuScanResult } from '@/types';

// Menu scanner — photograph a restaurant/canteen/buffet/grocery menu and get the
// best options for the user's current target.
export default function MenuScanner() {
  const router = useRouter();
  const { profile, plan } = useAppStore();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MenuScanResult | null>(null);

  const scan = async (img: PickedImage) => {
    setImage(img);
    setResult(null);
    if (!img.base64 || !isVisionEnabled() || !profile || !plan) {
      setResult({ recommendations: [], avoid: [], confidence: 'low', source: 'manual' });
      return;
    }
    setBusy(true);
    try {
      setResult(await scanMenu(img.base64, img.mimeType, profile, plan));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Menu scanner</Title>
      <Subtitle>
        {isVisionEnabled()
          ? 'Photograph a menu — restaurant, canteen, buffet, or grocery shelf — and I’ll pick the best options for your goal.'
          : 'Add an API key to enable menu scanning.'}
      </Subtitle>

      <CaptureButtons image={image} onPicked={scan} busy={busy} />

      {busy && (
        <View style={styles.loading}>
          <EnergyLoader />
          <Text style={styles.dim}>Reading the menu…</Text>
        </View>
      )}

      {result && result.source === 'manual' && (
        <Card>
          <Text style={styles.dim}>
            Couldn’t read the menu automatically. Try the Restaurant tool to evaluate a
            specific dish by name instead.
          </Text>
        </Card>
      )}

      {result && result.recommendations.length > 0 && (
        <>
          <View style={styles.confRow}>
            <SectionHeader>Best picks for you</SectionHeader>
            <Text style={styles.dim}>{result.confidence} confidence</Text>
          </View>
          {result.recommendations.map((r) => (
            <Card key={r.rank}>
              <View style={styles.rankRow}>
                <Text style={styles.rank}>#{r.rank}</Text>
                <Text style={styles.dish}>{r.dish}</Text>
              </View>
              <Text style={styles.reason}>{r.reason}</Text>
              {r.estCalories[1] > 0 && (
                <Text style={styles.cal}>~{r.estCalories[0]}–{r.estCalories[1]} kcal</Text>
              )}
            </Card>
          ))}

          {result.avoid.length > 0 && (
            <Card>
              <SectionHeader>Maybe skip today</SectionHeader>
              {result.avoid.map((a, i) => (
                <Text key={i} style={styles.avoid}>• {a}</Text>
              ))}
            </Card>
          )}
          <Text style={styles.disclaimer}>Estimates vary by kitchen — treat them as a guide.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: font.small },
  loading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  confRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rank: {
    color: colors.bg,
    backgroundColor: colors.primary,
    fontWeight: '800',
    fontSize: font.tiny,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  dish: { color: colors.text, fontWeight: '700', fontSize: font.body, flex: 1 },
  reason: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  cal: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  avoid: { color: colors.warning, fontSize: font.small, lineHeight: 20 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center' },
});
