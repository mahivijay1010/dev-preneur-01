import { useRouter } from 'expo-router';
import { CalendarCheck, CalendarClock, Flame, Lightbulb } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { EnergyLoader } from '@/components/motion';
import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { goalLabel } from '@/engine/nutrition';
import type { PickedImage } from '@/services/imagePicker';
import { todayKey } from '@/services/storage';
import { analyzeProgressPhotos, isVisionEnabled } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { Goal, ProgressPhoto, ProgressPhotoAnalysis } from '@/types';

const POSES: ProgressPhoto['pose'][] = ['front', 'side', 'back'];

// Progress photos — a daily ritual. Capture the same poses over time, see a
// before/after comparison, and get goal-aware recommendations on how to use
// them. Qualitative only — no body-fat percentages or medical-grade claims.
export default function ProgressPhotoScreen() {
  const router = useRouter();
  const { progressPhotos, addProgressPhoto, removeProgressPhoto, profile } = useAppStore();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [pose, setPose] = useState<ProgressPhoto['pose']>('front');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<ProgressPhotoAnalysis | null>(null);

  const today = todayKey();
  const sorted = useMemo(() => [...progressPhotos].sort((a, b) => b.date.localeCompare(a.date)), [progressPhotos]);
  const stats = useMemo(() => photoStats(progressPhotos, today), [progressPhotos, today]);
  const compare = useMemo(() => comparePair(progressPhotos, pose), [progressPhotos, pose]);
  const tips = useMemo(() => photoTips(profile?.goal, stats, compare), [profile?.goal, stats, compare]);

  const save = () => {
    if (!image) return;
    addProgressPhoto({ date: today, uri: image.uri, pose });
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

      {/* Daily ritual status */}
      <View style={styles.ritualRow}>
        <View style={[styles.ritualCard, stats.todayDone ? styles.ritualDone : styles.ritualPending]}>
          {stats.todayDone ? <CalendarCheck size={20} color={colors.success} /> : <CalendarClock size={20} color={colors.warning} />}
          <Text style={styles.ritualValue}>{stats.todayDone ? 'Done' : 'Not yet'}</Text>
          <Text style={styles.ritualLabel}>today’s photo</Text>
        </View>
        <View style={styles.ritualCard}>
          <Flame size={20} color={colors.peach} />
          <Text style={styles.ritualValue}>{stats.dayCount}</Text>
          <Text style={styles.ritualLabel}>days captured</Text>
        </View>
        <View style={styles.ritualCard}>
          <CalendarClock size={20} color={colors.accent} />
          <Text style={styles.ritualValue}>{stats.daysSinceLast === null ? '—' : stats.daysSinceLast}</Text>
          <Text style={styles.ritualLabel}>days since last</Text>
        </View>
      </View>

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
          <EnergyLoader />
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

      {/* Before / after comparison */}
      {compare && (
        <>
          <SectionHeader>Before → after · {pose}</SectionHeader>
          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <Image source={{ uri: compare.before.uri }} style={styles.compareImg} resizeMode="cover" />
              <Text style={styles.compareTag}>START</Text>
              <Text style={styles.compareDate}>{compare.before.date}</Text>
            </View>
            <View style={styles.compareCol}>
              <Image source={{ uri: compare.after.uri }} style={styles.compareImg} resizeMode="cover" />
              <Text style={[styles.compareTag, { color: colors.success }]}>LATEST</Text>
              <Text style={styles.compareDate}>{compare.after.date}</Text>
            </View>
          </View>
          <Text style={styles.compareSpan}>{compare.gapDays} days apart</Text>
        </>
      )}

      {/* Goal-aware recommendations (works offline) */}
      <Card>
        <View style={styles.tipHeader}>
          <Lightbulb size={18} color={colors.primary} />
          <Text style={styles.tipHeaderText}>
            Recommendations{profile ? ` · ${goalLabel(profile.goal)}` : ''}
          </Text>
        </View>
        {tips.map((t, i) => (
          <Text key={i} style={styles.tip}>• {t}</Text>
        ))}
      </Card>

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

// --- Derived data -----------------------------------------------------------

interface PhotoStats {
  todayDone: boolean;
  dayCount: number; // distinct days with at least one photo
  daysSinceLast: number | null;
}

function photoStats(photos: ProgressPhoto[], today: string): PhotoStats {
  const days = new Set(photos.map((p) => p.date));
  const latest = photos.reduce<string | null>((max, p) => (max && max >= p.date ? max : p.date), null);
  return {
    todayDone: days.has(today),
    dayCount: days.size,
    daysSinceLast: latest ? daysBetween(latest, today) : null,
  };
}

function comparePair(photos: ProgressPhoto[], pose: ProgressPhoto['pose']) {
  const ofPose = photos.filter((p) => p.pose === pose).sort((a, b) => a.date.localeCompare(b.date));
  if (ofPose.length < 2) return null;
  const before = ofPose[0];
  const after = ofPose[ofPose.length - 1];
  return { before, after, gapDays: daysBetween(before.date, after.date) };
}

function photoTips(
  goal: Goal | undefined,
  stats: PhotoStats,
  compare: ReturnType<typeof comparePair>,
): string[] {
  const tips: string[] = [];
  if (!stats.todayDone) tips.push('Add today’s photo to keep the habit going — same time of day works best.');
  if (stats.daysSinceLast !== null && stats.daysSinceLast >= 7) {
    tips.push(`It’s been ${stats.daysSinceLast} days since your last photo — consistency makes change obvious.`);
  }
  tips.push('Shoot all three poses (front, side, back) in the same spot, lighting, and clothing each time.');

  if (goal === 'weight_loss') {
    tips.push('Your face and waistline usually change first — compare every 1–2 weeks, not daily.');
  } else if (goal === 'muscle_gain') {
    tips.push('Shoulders and arms show first — compare every 2–3 weeks, relaxed rather than flexed.');
  } else if (goal === 'body_recomposition') {
    tips.push('On recomposition the scale barely moves — photos are your best proof. Compare every 2 weeks.');
  }

  if (compare && compare.gapDays >= 10) {
    tips.push(`You’ve got a ${compare.gapDays}-day comparison ready below — look for posture, definition, and how clothes fit.`);
  }
  return tips;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: font.small },
  ritualRow: { flexDirection: 'row', gap: spacing.sm },
  ritualCard: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ritualDone: { borderColor: colors.success },
  ritualPending: { borderColor: colors.warning },
  ritualValue: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  ritualLabel: { color: colors.textDim, fontSize: font.tiny, textAlign: 'center' },
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
  compareRow: { flexDirection: 'row', gap: spacing.sm },
  compareCol: { flex: 1, alignItems: 'center', gap: 4 },
  compareImg: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  compareTag: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  compareDate: { color: colors.textDim, fontSize: font.tiny },
  compareSpan: { color: colors.textDim, fontSize: font.small, textAlign: 'center', fontWeight: '700' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  tipHeaderText: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  tip: { color: colors.textDim, fontSize: font.small, lineHeight: 21 },
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
