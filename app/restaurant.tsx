import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { evaluateDish } from '@/engine/restaurant';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { RestaurantEvaluation } from '@/types';

const EXAMPLES = ['Butter chicken with naan', 'Paneer tikka', 'Veg biryani', 'Masala dosa', 'Grilled fish'];

const VERDICT_META: Record<RestaurantEvaluation['verdict'], { label: string; color: string }> = {
  great: { label: 'Great choice', color: colors.success },
  ok: { label: 'Reasonable', color: colors.warning },
  occasional: { label: 'Occasional treat', color: colors.danger },
};

const CONFIDENCE_META: Record<RestaurantEvaluation['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence — rough estimate',
};

// Restaurant mode — enter/search a dish and get a health-aware read on it.
export default function Restaurant() {
  const router = useRouter();
  const { profile } = useAppStore();
  const [dish, setDish] = useState('');
  const [result, setResult] = useState<RestaurantEvaluation | null>(null);

  const run = (d: string) => {
    if (!d.trim() || !profile) return;
    setDish(d);
    setResult(evaluateDish(d, profile));
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Restaurant mode</Title>
      <Subtitle>Type a dish and get the best way to order it for your goal.</Subtitle>

      <TextInput
        value={dish}
        onChangeText={setDish}
        placeholder="e.g. butter chicken with naan"
        placeholderTextColor={colors.textDim}
        style={styles.input}
        onSubmitEditing={() => run(dish)}
        returnKeyType="search"
      />
      <Button label="Evaluate dish" onPress={() => run(dish)} />

      {!result && (
        <View style={styles.examples}>
          {EXAMPLES.map((e) => (
            <Pressable key={e} style={styles.chip} onPress={() => run(e)}>
              <Text style={styles.chipText}>{e}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {result && (
        <>
          <Card>
            <View style={styles.row}>
              <Text style={styles.dish}>{result.dish}</Text>
              <View style={[styles.badge, { backgroundColor: VERDICT_META[result.verdict].color }]}>
                <Text style={styles.badgeText}>{VERDICT_META[result.verdict].label}</Text>
              </View>
            </View>
            <Text style={styles.est}>
              ~{result.estCalories[0]}–{result.estCalories[1]} kcal · ~{result.estProteinG}g protein
            </Text>
            <Text style={styles.confidence}>{CONFIDENCE_META[result.confidence]}</Text>
          </Card>

          <Card>
            <SectionHeader>Better choices</SectionHeader>
            {result.betterChoices.map((c, i) => (
              <Text key={i} style={styles.line}>• {c}</Text>
            ))}
          </Card>

          <Card>
            <SectionHeader>Portion guidance</SectionHeader>
            <Text style={styles.line}>{result.portionGuidance}</Text>
          </Card>

          <Card>
            <SectionHeader>Suggested modifications</SectionHeader>
            {result.modifications.map((m, i) => (
              <Text key={i} style={styles.line}>• {m}</Text>
            ))}
          </Card>

          <Text style={styles.disclaimer}>
            Estimates are approximate and vary by kitchen — use them as a guide, not a precise count.
          </Text>
          <Button label="Check another dish" variant="ghost" onPress={() => { setResult(null); setDish(''); }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.body,
  },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { color: colors.primary, fontSize: font.small, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  dish: { color: colors.text, fontWeight: '800', fontSize: font.h3, flex: 1, textTransform: 'capitalize' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: colors.bg, fontWeight: '700', fontSize: font.tiny },
  est: { color: colors.primary, fontSize: font.body, fontWeight: '700' },
  confidence: { color: colors.textDim, fontSize: font.tiny },
  line: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', lineHeight: 16 },
});
