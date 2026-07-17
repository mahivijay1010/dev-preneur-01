// Shared protein-target control: a slider from 1.0–3.0 g/kg with the goal's
// recommended rate marked, a live grams/day readout, and a status message that
// warns when the intake is too low or higher than useful. Used in onboarding
// and in profile settings.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineNotice, Slider } from './ui';
import {
  PROTEIN_MAX,
  PROTEIN_MIN,
  proteinStatus,
  recommendedProteinPerKg,
} from '../engine/nutrition';
import { colors, font, radius, spacing } from '../theme';
import type { Goal } from '../types';

export function ProteinPicker({
  goal,
  weightKg,
  value,
  overridden,
  accent = colors.peach,
  onChange,
  onReset,
}: {
  goal: Goal;
  weightKg: number;
  value: number;
  overridden: boolean;
  accent?: string;
  onChange: (value: number) => void;
  onReset: () => void;
}) {
  const rec = recommendedProteinPerKg(goal);
  const status = proteinStatus(value, goal);
  const totalG = Math.round(weightKg * value);
  const recTotal = Math.round(weightKg * rec);
  const tone = status.tone === 'danger' ? 'danger' : status.tone === 'success' ? 'success' : 'info';
  return (
    <View style={[styles.card, { borderColor: `${accent}55` }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.value}>{value.toFixed(1)} <Text style={styles.unit}>g/kg</Text></Text>
          <Text style={styles.total}>≈ {totalG} g protein per day</Text>
        </View>
        <View style={styles.recBadge}>
          <Text style={styles.recLabel}>RECOMMENDED</Text>
          <Text style={[styles.recValue, { color: accent }]}>{rec.toFixed(1)} g/kg · {recTotal} g</Text>
        </View>
      </View>
      <Slider
        value={value}
        onChange={onChange}
        min={PROTEIN_MIN}
        max={PROTEIN_MAX}
        step={0.1}
        accent={accent}
        markers={[{ value: rec, color: accent }]}
      />
      <View style={styles.scaleRow}>
        <Text style={styles.scaleText}>{PROTEIN_MIN.toFixed(1)} g/kg</Text>
        <Text style={styles.scaleText}>{PROTEIN_MAX.toFixed(1)} g/kg</Text>
      </View>
      <InlineNotice tone={tone}>{status.message}</InlineNotice>
      {overridden ? (
        <Pressable onPress={onReset} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.reset, { color: accent }]}>Reset to recommended</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, padding: spacing.md, gap: spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  value: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  unit: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
  total: { color: colors.textDim, fontSize: font.small, marginTop: 2 },
  recBadge: { alignItems: 'flex-end', gap: 2 },
  recLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  recValue: { fontSize: font.small, fontWeight: '800' },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  scaleText: { color: colors.textMuted, fontSize: font.tiny },
  reset: { fontSize: font.small, fontWeight: '700', marginTop: spacing.xs },
});
