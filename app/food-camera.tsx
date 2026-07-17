import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { EnergyLoader } from '@/components/motion';
import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import type { PickedImage } from '@/services/imagePicker';
import { analyzeFoodPhoto, isVisionEnabled } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { DetectedFood, FoodPhotoAnalysis } from '@/types';

// Food camera — photograph a meal, edit the AI estimate, then log it.
export default function FoodCamera() {
  const router = useRouter();
  const { logPhotoMeal } = useAppStore();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FoodPhotoAnalysis | null>(null);

  const analyze = async (img: PickedImage) => {
    setImage(img);
    setResult(null);
    if (!img.base64 || !isVisionEnabled()) {
      // Manual path: seed one editable row.
      setResult({
        foods: [{ name: '', portion: '', calories: 0, proteinG: 0 }],
        calorieRange: [0, 0],
        proteinG: 0,
        confidence: 'low',
        source: 'manual',
      });
      return;
    }
    setBusy(true);
    try {
      setResult(await analyzeFoodPhoto(img.base64, img.mimeType));
    } finally {
      setBusy(false);
    }
  };

  const editFood = (idx: number, patch: Partial<DetectedFood>) => {
    if (!result) return;
    const foods = result.foods.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    setResult({ ...result, foods, ...recompute(foods, result.confidence) });
  };

  const addRow = () => {
    if (!result) return;
    setResult({ ...result, foods: [...result.foods, { name: '', portion: '', calories: 0, proteinG: 0 }] });
  };

  const totalProtein = result?.foods.reduce((a, f) => a + f.proteinG, 0) ?? 0;

  const log = () => {
    logPhotoMeal(totalProtein);
    router.back();
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Log meal with camera</Title>
      <Subtitle>
        {isVisionEnabled()
          ? 'Snap your plate — the AI estimates foods and macros. Edit anything before logging.'
          : 'Add an API key to auto-detect foods. For now, snap a photo and enter the details.'}
      </Subtitle>

      <CaptureButtons image={image} onPicked={analyze} busy={busy} />

      {busy && (
        <View style={styles.loading}>
          <EnergyLoader />
          <Text style={styles.dim}>Analysing your meal…</Text>
        </View>
      )}

      {result && (
        <>
          <Card>
            <View style={styles.totalRow}>
              <SectionHeader>Estimate</SectionHeader>
              {result.source === 'ai' && (
                <Text style={styles.confidence}>{result.confidence} confidence</Text>
              )}
            </View>
            <Text style={styles.total}>
              {result.source === 'ai'
                ? `~${result.calorieRange[0]}–${result.calorieRange[1]} kcal`
                : `${result.foods.reduce((a, f) => a + f.calories, 0)} kcal`}{' '}
              · {totalProtein}g protein
            </Text>
          </Card>

          {result.foods.map((f, i) => (
            <Card key={i}>
              <TextInput
                value={f.name}
                onChangeText={(v) => editFood(i, { name: v })}
                placeholder="Food name"
                placeholderTextColor={colors.textDim}
                style={styles.nameInput}
              />
              <TextInput
                value={f.portion}
                onChangeText={(v) => editFood(i, { portion: v })}
                placeholder="Portion (e.g. 1 cup)"
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />
              <View style={styles.macroRow}>
                <NumField label="kcal" value={f.calories} onChange={(v) => editFood(i, { calories: v })} />
                <NumField label="protein (g)" value={f.proteinG} onChange={(v) => editFood(i, { proteinG: v })} />
              </View>
            </Card>
          ))}

          <Button label="+ Add another item" variant="ghost" onPress={addRow} />
          <Button label={`Log meal (${totalProtein}g protein)`} onPress={log} />
          <Text style={styles.disclaimer}>
            Camera estimates are approximate — always adjust to match what you actually ate.
          </Text>
        </>
      )}
    </Screen>
  );
}

function recompute(foods: DetectedFood[], confidence: FoodPhotoAnalysis['confidence']) {
  const cal = foods.reduce((a, f) => a + f.calories, 0);
  const margin = confidence === 'high' ? 0.1 : confidence === 'medium' ? 0.2 : 0.35;
  return {
    calorieRange: [Math.round(cal * (1 - margin)), Math.round(cal * (1 + margin))] as [number, number],
    proteinG: foods.reduce((a, f) => a + f.proteinG, 0),
  };
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.dim}>{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(t) => onChange(parseInt(t, 10) || 0)}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: font.small },
  loading: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { color: colors.primary, fontSize: font.h3, fontWeight: '800' },
  confidence: { color: colors.textDim, fontSize: font.tiny, textTransform: 'capitalize' },
  nameInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: font.small,
  },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center' },
});
