import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import type { PickedImage } from '@/services/imagePicker';
import { todayKey } from '@/services/storage';
import { analyzeProgressPhotos, isVisionEnabled } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { ProgressPhoto, ProgressPhotoAnalysis } from '@/types';

const POSES: ProgressPhoto['pose'][] = ['front', 'side', 'back'];

// Progress photos — capture over time and get gentle, qualitative observations.
// No body-fat percentages or medical-grade claims (per spec).
export default function ProgressPhotoScreen() {
  const router = useRouter();
  const { progressPhotos, addProgressPhoto, removeProgressPhoto } = useAppStore();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [pose, setPose] = useState<ProgressPhoto['pose']>('front');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<ProgressPhotoAnalysis | null>(null);

  const sorted = [...progressPhotos].sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!image) return;
    addProgressPhoto({ date: todayKey(), uri: image.uri, pose });
    setImage(null);
  };

  const analyze = async () => {
    if (!image?.base64 || !isVisionEnabled()) return;
    setBusy(true);
    try {
      setAnalysis(await analyzeProgressPhotos(image.base64, image.mimeType));
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
      <Title>Progress photos</Title>
      <Subtitle>Take the same poses in similar lighting each time — visual change is powerful motivation.</Subtitle>

      <CaptureButtons image={image} onPicked={(img) => { setImage(img); setAnalysis(null); }} busy={busy} />

      {image && (
        <>
          <View style={styles.poseRow}>
            {POSES.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPose(p)}
                style={[styles.pose, pose === p && styles.poseOn]}
              >
                <Text style={[styles.poseText, pose === p && { color: colors.bg }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Save photo" onPress={save} />
          {isVisionEnabled() && (
            <Button label="Get gentle feedback (AI)" variant="ghost" onPress={analyze} loading={busy} />
          )}
        </>
      )}

      {busy && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.dim}>Looking at your photo…</Text>
        </View>
      )}

      {analysis && (
        <Card>
          <SectionHeader>Observations</SectionHeader>
          {analysis.observations.map((o, i) => (
            <Text key={i} style={styles.obs}>• {o}</Text>
          ))}
          {analysis.encouragement ? <Text style={styles.encourage}>{analysis.encouragement}</Text> : null}
          <Text style={styles.disclaimer}>
            Qualitative only — this is not a body-fat or medical measurement.
          </Text>
        </Card>
      )}

      {sorted.length > 0 && (
        <>
          <SectionHeader>Your timeline</SectionHeader>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {sorted.map((p) => (
              <View key={p.id} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
                <Text style={styles.thumbLabel}>{p.date}</Text>
                <Text style={styles.thumbPose}>{p.pose}</Text>
                <Pressable style={styles.remove} onPress={() => removeProgressPhoto(p.id)} hitSlop={8}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: font.small },
  poseRow: { flexDirection: 'row', gap: spacing.sm },
  pose: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poseOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  poseText: { color: colors.textDim, fontWeight: '700', fontSize: font.small, textTransform: 'capitalize' },
  loading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  obs: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  encourage: { color: colors.success, fontSize: font.small, fontWeight: '600', marginTop: spacing.xs },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', marginTop: spacing.xs },
  gallery: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumbWrap: { width: 120 },
  thumb: { width: 120, height: 160, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbLabel: { color: colors.text, fontSize: font.tiny, marginTop: 4 },
  thumbPose: { color: colors.textDim, fontSize: font.tiny, textTransform: 'capitalize' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
