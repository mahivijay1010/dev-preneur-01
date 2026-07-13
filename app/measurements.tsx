import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, ChipGroup, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { todayKey } from '@/services/storage';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { ClothingFit, Measurement } from '@/types';

// Non-scale progress — the numbers that keep users motivated when the scale
// stalls. Progress photos arrive with the Phase 5 camera; for now a note field
// stands in for a caption.
export default function Measurements() {
  const router = useRouter();
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

  const save = () => {
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
    router.back();
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Non-scale progress</Title>
      <Subtitle>Measurements often move even when the scale doesn't. Log what you can.</Subtitle>

      <Card>
        <SectionHeader>Body measurements (cm)</SectionHeader>
        <Row>
          <Field label="Waist" value={waist} onChange={setWaist} />
          <Field label="Chest" value={chest} onChange={setChest} />
        </Row>
        <Row>
          <Field label="Arms" value={arms} onChange={setArms} />
          <Field label="Hips" value={hips} onChange={setHips} />
        </Row>
      </Card>

      <Card>
        <SectionHeader>Recovery & capacity</SectionHeader>
        <Field label="Resting heart rate (bpm)" value={rhr} onChange={setRhr} />
        <Text style={styles.label}>Workout capacity (how much could you do?)</Text>
        <ChipGroup<NonNullable<Measurement['workoutCapacity']>>
          value={capacity ?? null}
          onChange={(v) => setCapacity(v)}
          options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n as 1 | 2 | 3 | 4 | 5 }))}
        />
      </Card>

      <Card>
        <SectionHeader>Clothing fit</SectionHeader>
        <ChipGroup<ClothingFit>
          value={fit ?? null}
          onChange={(v) => setFit(v)}
          options={[
            { label: 'Tighter', value: 'tighter' },
            { label: 'Same', value: 'same' },
            { label: 'Looser', value: 'looser' },
          ]}
        />
        <SectionHeader>Note</SectionHeader>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="How you look/feel (photo capture comes in Phase 5)"
          placeholderTextColor={colors.textDim}
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          multiline
        />
      </Card>

      <Button label="Save measurements" onPress={save} />
    </Screen>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: spacing.md }}>{children}</View>;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor={colors.textDim}
        style={styles.input}
      />
    </View>
  );
}

function str(n: number | undefined): string {
  return typeof n === 'number' ? String(n) : '';
}
function numOrUndef(s: string): number | undefined {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  label: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
});
