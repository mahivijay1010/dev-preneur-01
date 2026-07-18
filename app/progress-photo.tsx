import { useRouter } from 'expo-router';
import { CalendarCheck, CalendarClock, Flame, Lightbulb, X } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { Gradient, GlowPulse } from '@/components/depth';
import { AchievementBurst, AnimatedNumber, EnergyLoader, Reveal, usePressMotion } from '@/components/motion';
import { Button, Card, ChipGroup, PageHeader, SectionHeader, Screen, StatusPill } from '@/components/ui';
import { goalLabel } from '@/engine/nutrition';
import type { PickedImage } from '@/services/imagePicker';
import { todayKey } from '@/services/storage';
import { analyzeProgressPhotos, isVisionEnabled } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, shadow, spacing } from '@/theme';
import type { Goal, ProgressPhoto, ProgressPhotoAnalysis } from '@/types';

const POSES: ProgressPhoto['pose'][] = ['front', 'side', 'back'];

// Progress photos — a daily ritual. Capture the same poses over time, see a
// before/after comparison, and get goal-aware recommendations on how to use
// them. Qualitative only — no body-fat percentages or medical-grade claims.
export default function ProgressPhotoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const { progressPhotos, addProgressPhoto, removeProgressPhoto, profile } = useAppStore();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [pose, setPose] = useState<ProgressPhoto['pose']>('front');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<ProgressPhotoAnalysis | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const today = todayKey();
  const sorted = useMemo(() => [...progressPhotos].sort((a, b) => b.date.localeCompare(a.date)), [progressPhotos]);
  const stats = useMemo(() => photoStats(progressPhotos, today), [progressPhotos, today]);
  const compare = useMemo(() => comparePair(progressPhotos, pose), [progressPhotos, pose]);
  const tips = useMemo(() => photoTips(profile?.goal, stats, compare), [profile?.goal, stats, compare]);

  const save = () => {
    if (!image) return;
    const wasNotDone = !stats.todayDone;
    addProgressPhoto({ date: today, uri: image.uri, pose });
    setImage(null);
    if (wasNotDone) setCelebrating(true);
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

  const poseSelector = (
    <ChipGroup
      options={POSES.map((p) => ({ label: p.charAt(0).toUpperCase() + p.slice(1), value: p }))}
      value={pose}
      onChange={setPose}
    />
  );

  const captureGroup = (
    <View style={styles.captureGroup}>
      <Text style={styles.blockEyebrow}>SELECT POSE</Text>
      {poseSelector}
      <CaptureButtons
        image={image}
        onPicked={(img) => { setImage(img); setAnalysis(null); }}
        busy={busy}
        emptyImage={require('../assets/images/onboarding-body-v2.png')}
        title="Frame your full body"
        description="Same spot, same lighting, same clothing each time so change is easy to see."
      />
      {image ? (
        <View style={styles.captureActions}>
          <Button label="Save photo" onPress={save} />
          {isVisionEnabled() ? (
            <Button label="Get gentle feedback (AI)" variant="ghost" onPress={analyze} loading={busy} />
          ) : null}
        </View>
      ) : null}
      {busy ? (
        <View style={styles.loading}>
          <EnergyLoader />
          <Text style={styles.dim}>Looking at your photo…</Text>
        </View>
      ) : null}
      {analysis ? (
        <Card tone="glass">
          <SectionHeader>Observations</SectionHeader>
          {analysis.observations.map((o, i) => <Text key={i} style={styles.obs}>• {o}</Text>)}
          {analysis.encouragement ? <Text style={styles.encourage}>{analysis.encouragement}</Text> : null}
          <Text style={styles.disclaimer}>Qualitative only — this is not a body-fat or medical measurement.</Text>
        </Card>
      ) : null}
    </View>
  );

  const ritualStats = (
    <Reveal delay={40} style={styles.ritualRow}>
      <GlowPulse color={colors.success} radius={radius.md} intensity={stats.todayDone ? 0.32 : 0} style={styles.ritualTile}>
        <View style={[styles.ritualInner, stats.todayDone ? styles.ritualDone : styles.ritualPending]}>
          {stats.todayDone ? <CalendarCheck size={20} color={colors.success} /> : <CalendarClock size={20} color={colors.warning} />}
          <StatusPill label={stats.todayDone ? 'Done' : 'Not yet'} color={stats.todayDone ? colors.success : colors.warning} />
          <Text style={styles.ritualLabel}>today’s photo</Text>
        </View>
      </GlowPulse>
      <View style={[styles.ritualTile, styles.ritualInner]}>
        <Flame size={20} color={colors.peach} />
        <AnimatedNumber value={stats.dayCount} style={styles.ritualValue} />
        <Text style={styles.ritualLabel}>days captured</Text>
      </View>
      <View style={[styles.ritualTile, styles.ritualInner]}>
        <CalendarClock size={20} color={colors.accent} />
        {stats.daysSinceLast === null
          ? <Text style={styles.ritualValue}>—</Text>
          : <AnimatedNumber value={stats.daysSinceLast} style={styles.ritualValue} />}
        <Text style={styles.ritualLabel}>days since last</Text>
      </View>
    </Reveal>
  );

  const recommendations = (
    <Card tone="glass">
      <View style={styles.tipHeader}>
        <View><Lightbulb size={18} color={colors.primary} /></View>
        <Text style={styles.tipHeaderText}>Recommendations{profile ? ` · ${goalLabel(profile.goal)}` : ''}</Text>
      </View>
      {tips.map((t, i) => <Text key={i} style={styles.tip}>• {t}</Text>)}
    </Card>
  );

  return (
    <Screen maxWidth={1080}>
      <PageHeader
        eyebrow="DAILY RITUAL"
        title="Proof you can see."
        subtitle="Take the same poses in similar lighting each time — visual change is powerful motivation."
        action={<CloseButton onPress={() => router.back()} />}
      />

      {wide ? (
        <View style={styles.columns}>
          <View style={styles.mainCol}>{captureGroup}</View>
          <View style={styles.sideCol}>{ritualStats}{recommendations}</View>
        </View>
      ) : (
        <>
          {ritualStats}
          {captureGroup}
          {recommendations}
        </>
      )}

      {/* Before / after comparison */}
      {compare ? (
        <Reveal delay={60}>
          <SectionHeader>Before → after · {pose}</SectionHeader>
          <Card tone="glass" style={styles.compareCard}>
            <View style={styles.compareRow}>
              <CompareFrame uri={compare.before.uri} tag="START" tagColor={colors.textMuted} date={compare.before.date} />
              <CompareFrame uri={compare.after.uri} tag="LATEST" tagColor={colors.success} date={compare.after.date} />
            </View>
            <View style={styles.compareSpan}>
              <AnimatedNumber value={compare.gapDays} style={styles.compareSpanValue} />
              <Text style={styles.compareSpanLabel}>days apart</Text>
            </View>
          </Card>
        </Reveal>
      ) : null}

      {sorted.length > 0 ? (
        <>
          <SectionHeader>Your timeline</SectionHeader>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
            {sorted.map((p) => (
              <View key={p.id} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
                <Text style={styles.thumbLabel}>{p.date}</Text>
                <Text style={styles.thumbPose}>{p.pose}</Text>
                <Pressable accessibilityLabel="Remove photo" style={styles.remove} onPress={() => removeProgressPhoto(p.id)} hitSlop={10}>
                  <X size={13} color={colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      <AchievementBurst
        visible={celebrating}
        title="Ritual kept"
        detail="PROGRESS CAPTURED"
        onFinished={() => setCelebrating(false)}
      />
    </Screen>
  );
}

function CompareFrame({ uri, tag, tagColor, date }: { uri: string; tag: string; tagColor: string; date: string }) {
  return (
    <View style={styles.compareCol}>
      <View style={styles.compareImgWrap}>
        <Image source={{ uri }} style={styles.compareImg} resizeMode="cover" />
        <Gradient colors={gradients.heroScrim} direction="vertical" locations={[0, 0.55, 1]} />
        <View style={styles.compareCaption}>
          <StatusPill label={tag} color={tagColor} />
          <Text style={styles.compareDate}>{date}</Text>
        </View>
      </View>
    </View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Pressable accessibilityLabel="Close progress photos" onPress={onPress} {...pressHandlers}>
      <View style={styles.closeButton}><X size={21} color={colors.text} /></View>
    </Pressable>
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
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  mainCol: { flex: 1.35, gap: spacing.md },
  sideCol: { flex: 1, gap: spacing.md },
  captureGroup: { gap: spacing.md },
  blockEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  captureActions: { gap: spacing.sm },
  dim: { color: colors.textDim, fontSize: font.small },
  ritualRow: { flexDirection: 'row', gap: spacing.sm },
  ritualTile: { flex: 1, borderRadius: radius.md },
  ritualInner: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ritualDone: { borderColor: colors.success },
  ritualPending: { borderColor: colors.warning },
  ritualValue: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  ritualLabel: { color: colors.textDim, fontSize: font.tiny, textAlign: 'center' },
  loading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  obs: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  encourage: { color: colors.success, fontSize: font.small, fontWeight: '600', marginTop: spacing.xs },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', marginTop: spacing.xs },
  compareCard: { gap: spacing.md, marginTop: spacing.sm },
  compareRow: { flexDirection: 'row', gap: spacing.sm },
  compareCol: { flex: 1 },
  compareImgWrap: { width: '100%', height: 240, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  compareImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  compareCaption: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm, gap: 4, alignItems: 'flex-start' },
  compareDate: { color: colors.textDim, fontSize: font.tiny, fontWeight: '700' },
  compareSpan: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  compareSpanValue: { color: colors.primary, fontSize: font.h1, fontWeight: '900' },
  compareSpanLabel: { color: colors.textDim, fontSize: font.small, fontWeight: '700' },
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
    ...shadow.low,
  },
});
