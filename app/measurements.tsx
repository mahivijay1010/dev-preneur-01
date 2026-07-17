import { useRouter } from 'expo-router';
import { Check, HeartPulse, Ruler, Save, Shirt, Sparkles, X } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Reveal } from '@/components/motion';
import { Button, ChipGroup, Field, PageHeader, ProgressRing, Screen } from '@/components/ui';
import { todayKey } from '@/services/storage';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { ClothingFit, Measurement } from '@/types';

const CAPACITY_OPTIONS = [
  { label: '1 · Drained', value: 1 as const },
  { label: '2 · Low', value: 2 as const },
  { label: '3 · Steady', value: 3 as const },
  { label: '4 · Strong', value: 4 as const },
  { label: '5 · Peak', value: 5 as const },
];

export default function Measurements() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const { measurements, saveMeasurement } = useAppStore();
  const today = todayKey();
  const existing = measurements[today] ?? { date: today };

  const [waist, setWaist] = useState(str(existing.waistCm));
  const [chest, setChest] = useState(str(existing.chestCm));
  const [arms, setArms] = useState(str(existing.armsCm));
  const [hips, setHips] = useState(str(existing.hipsCm));
  const [rhr, setRhr] = useState(str(existing.restingHr));
  const [capacity, setCapacity] = useState<Measurement['workoutCapacity']>(existing.workoutCapacity);
  const [fit, setFit] = useState<ClothingFit | undefined>(existing.clothingFit);
  const [note, setNote] = useState(existing.note ?? '');
  const [saved, setSaved] = useState(false);

  const values = [waist, chest, arms, hips, rhr, capacity, fit, note.trim()];
  const completed = values.filter(Boolean).length;
  const completion = Math.round((completed / values.length) * 100);
  const invalid = useMemo(
    () => [waist, chest, arms, hips, rhr].some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0)),
    [arms, chest, hips, rhr, waist],
  );

  const save = () => {
    if (invalid) return;
    saveMeasurement({
      date: today,
      waistCm: numOrUndef(waist),
      chestCm: numOrUndef(chest),
      armsCm: numOrUndef(arms),
      hipsCm: numOrUndef(hips),
      restingHr: numOrUndef(rhr),
      workoutCapacity: capacity,
      clothingFit: fit,
      note: note.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => router.back(), 420);
  };

  return (
    <Screen maxWidth={1080}>
      <PageHeader
        eyebrow="PROGRESS BEYOND THE SCALE"
        title="See the change weight cannot show."
        subtitle="Log a few useful signals. Partial check-ins still help your progress model learn."
        action={<CloseButton onPress={() => router.back()} />}
      />

      <Reveal delay={40} style={[styles.bodySignal, compact && styles.bodySignalCompact]}>
        <View style={styles.bodyMap}>
          <View style={styles.bodyHead} />
          <View style={styles.bodyTorso} />
          <View style={[styles.bodyLine, styles.chestLine]} />
          <View style={[styles.bodyLine, styles.waistLine]} />
          <View style={[styles.bodyLine, styles.hipLine]} />
          <View style={styles.pulse}><HeartPulse size={22} color={colors.peach} /></View>
        </View>
        <View style={styles.signalCopy}>
          <View style={styles.signalLabel}><Sparkles size={15} color={colors.primary} /><Text style={styles.signalLabelText}>TODAY'S BODY SIGNAL</Text></View>
          <Text style={styles.signalTitle}>{completed ? `${completed} signals ready to save` : 'Start with one signal'}</Text>
          <Text style={styles.signalBody}>Measurements, recovery, capacity, and clothing fit create a fuller view of progress.</Text>
          <View style={styles.signalLegend}>
            <Legend color={colors.primary} label="Body" />
            <Legend color={colors.peach} label="Recovery" />
            <Legend color={colors.accent} label="Capacity" />
          </View>
        </View>
        <ProgressRing progress={completion} value={`${completion}%`} label="complete" size={compact ? 90 : 112} />
      </Reveal>

      <Reveal delay={80} style={styles.measurementSection}>
        <SectionIntro icon={<Ruler size={22} color={colors.black} />} accent={colors.primary} eyebrow="BODY MAP" title="Tape measurements" description="Use the same position and time of day when possible." />
        <View style={styles.fieldGrid}>
          <MetricField label="Waist" value={waist} onChange={setWaist} compact={compact} />
          <MetricField label="Chest" value={chest} onChange={setChest} compact={compact} />
          <MetricField label="Arms" value={arms} onChange={setArms} compact={compact} />
          <MetricField label="Hips" value={hips} onChange={setHips} compact={compact} />
        </View>
      </Reveal>

      <View style={[styles.split, compact && styles.splitCompact]}>
        <Reveal delay={120} style={styles.splitPanel}>
          <SectionIntro icon={<HeartPulse size={22} color={colors.white} />} accent={colors.peach} eyebrow="READINESS" title="Recovery and capacity" description="How your body feels today matters as much as what it did." />
          <Field
            label="Resting heart rate"
            hint="bpm"
            value={rhr}
            onChangeText={sanitizeNumeric(setRhr)}
            keyboardType="decimal-pad"
            placeholder="e.g. 62"
            error={rhr && Number(rhr) <= 0 ? 'Enter a value above zero.' : undefined}
          />
          <Text style={styles.question}>How much could you comfortably do today?</Text>
          <ChipGroup value={capacity ?? null} onChange={setCapacity} options={CAPACITY_OPTIONS} />
        </Reveal>

        <Reveal delay={150} style={styles.splitPanel}>
          <SectionIntro icon={<Shirt size={22} color={colors.black} />} accent={colors.accent} eyebrow="REAL-LIFE CHANGE" title="Fit and feel" description="Small changes in comfort can appear before the scale moves." />
          <Text style={styles.question}>How do your usual clothes fit?</Text>
          <ChipGroup<ClothingFit>
            value={fit ?? null}
            onChange={setFit}
            options={[
              { label: 'Tighter', value: 'tighter' },
              { label: 'About the same', value: 'same' },
              { label: 'Looser', value: 'looser' },
            ]}
          />
          <Field
            label="What did you notice?"
            hint="optional"
            value={note}
            onChangeText={setNote}
            placeholder="Energy, mobility, confidence, or how clothes feel..."
            multiline
          />
        </Reveal>
      </View>

      {invalid ? <Text accessibilityRole="alert" style={styles.error}>Measurements must be numbers above zero.</Text> : null}
      <Button
        label={saved ? 'Progress saved' : 'Save progress check-in'}
        onPress={save}
        disabled={invalid || saved}
        icon={saved ? <Check size={19} color={colors.black} /> : <Save size={19} color={colors.black} />}
      />
      <Text style={styles.footer}>You can leave any field blank. Saved check-ins sync with your private FitPlan account.</Text>
    </Screen>
  );
}

function MetricField({ label, value, onChange, compact }: { label: string; value: string; onChange: (value: string) => void; compact: boolean }) {
  return (
    <Field
      label={label}
      hint="cm"
      value={value}
      onChangeText={sanitizeNumeric(onChange)}
      keyboardType="decimal-pad"
      placeholder="--"
      error={value && Number(value) <= 0 ? 'Enter a value above zero.' : undefined}
      containerStyle={[styles.metricField, compact && styles.metricFieldCompact]}
    />
  );
}

function SectionIntro({ icon, accent, eyebrow, title, description }: { icon: ReactNode; accent: string; eyebrow: string; title: string; description: string }) {
  return (
    <View style={styles.sectionIntro}>
      <View style={[styles.sectionIcon, { backgroundColor: accent }]}>{icon}</View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legend}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityLabel="Close measurements" style={styles.closeButton} onPress={onPress}><X size={21} color={colors.text} /></Pressable>;
}

function sanitizeNumeric(setter: (value: string) => void) {
  return (value: string) => setter(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'));
}

function str(value: number | undefined): string {
  return typeof value === 'number' ? String(value) : '';
}

function numOrUndef(value: string): number | undefined {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const styles = StyleSheet.create({
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  bodySignal: { minHeight: 270, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: '#4A5E29', backgroundColor: colors.surfaceSunken, overflow: 'hidden', ...shadow.card },
  bodySignalCompact: { minHeight: 0, flexDirection: 'column', alignItems: 'flex-start', padding: spacing.lg },
  bodyMap: { width: 180, height: 205, alignItems: 'center', position: 'relative' },
  bodyHead: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentDim },
  bodyTorso: { marginTop: 8, width: 122, height: 142, borderTopLeftRadius: 52, borderTopRightRadius: 52, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, borderWidth: 2, borderColor: '#496B86', backgroundColor: '#12202A' },
  bodyLine: { position: 'absolute', left: 17, right: 17, height: 2, borderRadius: 2 },
  chestLine: { top: 91, backgroundColor: colors.accent },
  waistLine: { top: 133, backgroundColor: colors.primary },
  hipLine: { top: 168, backgroundColor: colors.success },
  pulse: { position: 'absolute', top: 76, right: 7, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.peachDim, borderWidth: 1, borderColor: colors.peach, alignItems: 'center', justifyContent: 'center' },
  signalCopy: { flex: 1, minWidth: 0, gap: spacing.sm },
  signalLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  signalLabelText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  signalTitle: { color: colors.text, fontSize: font.h1, lineHeight: 36, fontWeight: '900' },
  signalBody: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 520 },
  signalLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: colors.textDim, fontSize: font.tiny, fontWeight: '700' },
  measurementSection: { gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderTopWidth: 3, borderColor: colors.border, borderTopColor: colors.primary, backgroundColor: colors.surface },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metricField: { flexGrow: 1, flexBasis: '46%', minWidth: 250 },
  metricFieldCompact: { flexBasis: '100%', minWidth: 0 },
  split: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  splitCompact: { flexDirection: 'column' },
  splitPanel: { flex: 1, gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sectionIntro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sectionCopy: { flex: 1, minWidth: 0, gap: 2 },
  sectionEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900' },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  sectionDescription: { color: colors.textDim, fontSize: font.small, lineHeight: 18 },
  question: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  error: { color: colors.danger, fontSize: font.small, fontWeight: '700' },
  footer: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, textAlign: 'center' },
});
