import { useRouter } from 'expo-router';
import { Flame, Plus, Sparkles, Target, Trash2, Utensils, X } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { EnergyLoader, Reveal } from '@/components/motion';
import { Button, ChipGroup, Field, PageHeader, Screen } from '@/components/ui';
import type { PickedImage } from '@/services/imagePicker';
import { analyzeFoodPhoto, isVisionEnabled } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { DetectedFood, FoodPhotoAnalysis, MealItem } from '@/types';

const SLOT_OPTIONS: { label: string; value: MealItem['slot'] }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

const EMPTY_FOOD: DetectedFood = { name: '', portion: '', calories: 0, proteinG: 0 };

export default function FoodCamera() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const logPhotoMeal = useAppStore((state) => state.logPhotoMeal);
  const [slot, setSlot] = useState<MealItem['slot']>(defaultMealSlot());
  const [image, setImage] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FoodPhotoAnalysis | null>(null);
  const [error, setError] = useState('');

  const totals = useMemo(() => {
    const foods = result?.foods ?? [];
    return {
      calories: foods.reduce((sum, food) => sum + food.calories, 0),
      protein: foods.reduce((sum, food) => sum + food.proteinG, 0),
    };
  }, [result]);

  const analyze = async (selected: PickedImage) => {
    setImage(selected);
    setResult(null);
    setError('');
    if (!selected.base64 || !isVisionEnabled()) {
      setResult(manualResult());
      return;
    }
    setBusy(true);
    try {
      setResult(await analyzeFoodPhoto(selected.base64, selected.mimeType));
    } catch {
      setResult(manualResult());
      setError('Automatic analysis was unavailable. Enter the meal details below.');
    } finally {
      setBusy(false);
    }
  };

  const startManual = () => {
    setImage(null);
    setResult(manualResult());
    setError('');
  };

  const editFood = (index: number, patch: Partial<DetectedFood>) => {
    if (!result) return;
    const foods = result.foods.map((food, itemIndex) => itemIndex === index ? { ...food, ...patch } : food);
    setResult({ ...result, foods, ...recompute(foods, result.confidence) });
    setError('');
  };

  const addRow = () => {
    if (!result) return;
    setResult({ ...result, foods: [...result.foods, { ...EMPTY_FOOD }] });
  };

  const removeRow = (index: number) => {
    if (!result || result.foods.length === 1) return;
    const foods = result.foods.filter((_, itemIndex) => itemIndex !== index);
    setResult({ ...result, foods, ...recompute(foods, result.confidence) });
  };

  const log = () => {
    if (!result) return;
    const foods = result.foods
      .map((food) => ({ ...food, name: food.name.trim(), portion: food.portion.trim() }))
      .filter((food) => food.name.length > 0);
    if (!foods.length || totals.calories <= 0) {
      setError('Add at least one food name and its calories before logging.');
      return;
    }
    logPhotoMeal({
      slot,
      name: mealName(foods, slot),
      foods,
      calories: totals.calories,
      proteinG: totals.protein,
      source: image ? 'camera' : 'manual',
      confidence: result.confidence,
    });
    router.replace('/(tabs)/today');
  };

  return (
    <Screen maxWidth={1080}>
      <PageHeader
        eyebrow="SMART NUTRITION"
        title="Capture what you actually ate."
        subtitle="Photograph a plate or log it manually. You stay in control of every estimate."
        action={<CloseButton onPress={() => router.back()} />}
      />

      <Reveal delay={50} style={styles.slotBand}>
        <View style={styles.slotCopy}>
          <Utensils size={19} color={colors.primary} />
          <View>
            <Text style={styles.slotTitle}>Which meal is this?</Text>
            <Text style={styles.slotSub}>Logging this slot updates today’s nutrition record.</Text>
          </View>
        </View>
        <ChipGroup options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
      </Reveal>

      <Reveal delay={90}>
        <CaptureButtons
          image={image}
          onPicked={(picked) => void analyze(picked)}
          busy={busy}
          title="Put the whole plate in frame"
          description="A top-down or 45-degree angle gives the clearest food estimate."
        />
      </Reveal>

      {!result && !busy ? (
        <Pressable accessibilityRole="button" style={styles.manualLink} onPress={startManual}>
          <Plus size={17} color={colors.accent} />
          <Text style={styles.manualText}>Log without a photo</Text>
        </Pressable>
      ) : null}

      {busy ? (
        <View style={styles.loading}>
          <EnergyLoader />
          <View>
            <Text style={styles.loadingTitle}>Reading your plate</Text>
            <Text style={styles.dim}>Finding foods and estimating portions…</Text>
          </View>
        </View>
      ) : null}

      {result ? (
        <Reveal delay={40} style={styles.resultPanel}>
          <View style={[styles.resultHeader, compact && styles.resultHeaderCompact]}>
            <View>
              <Text style={styles.eyebrow}>{result.source === 'ai' ? 'AI ESTIMATE' : 'MANUAL LOG'}</Text>
              <Text style={styles.resultTitle}>Review your meal</Text>
              <Text style={styles.dim}>Edit anything that does not match your plate.</Text>
            </View>
            <View style={styles.macroSummary}>
              <Macro icon={<Flame size={18} color={colors.peach} />} value={String(totals.calories)} label="kcal" />
              <View style={styles.macroDivider} />
              <Macro icon={<Target size={18} color={colors.accent} />} value={`${totals.protein}g`} label="protein" />
            </View>
          </View>

          <View style={styles.foodList}>
            {result.foods.map((food, index) => (
              <View key={index} style={styles.foodRow}>
                <View style={styles.foodIndex}><Text style={styles.foodIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <View style={styles.foodFields}>
                  <Field
                    label="Food"
                    value={food.name}
                    onChangeText={(value) => editFood(index, { name: value })}
                    placeholder="e.g. grilled chicken"
                    containerStyle={styles.foodNameField}
                  />
                  <Field
                    label="Portion"
                    value={food.portion}
                    onChangeText={(value) => editFood(index, { portion: value })}
                    placeholder="e.g. 150 g"
                    containerStyle={styles.portionField}
                  />
                  <NumberField label="Calories" value={food.calories} onChange={(value) => editFood(index, { calories: value })} />
                  <NumberField label="Protein (g)" value={food.proteinG} onChange={(value) => editFood(index, { proteinG: value })} />
                </View>
                {result.foods.length > 1 ? (
                  <Pressable accessibilityLabel={`Remove food ${index + 1}`} style={styles.removeButton} onPress={() => removeRow(index)}>
                    <Trash2 size={17} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>

          <Pressable accessibilityRole="button" style={styles.addButton} onPress={addRow}>
            <Plus size={18} color={colors.primary} />
            <Text style={styles.addText}>Add another food</Text>
          </Pressable>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={[styles.saveRow, compact && styles.saveRowCompact]}>
            <View style={styles.reviewNote}>
              <Sparkles size={16} color={colors.warning} />
              <Text style={styles.reviewNoteText}>Estimates improve when portions are specific.</Text>
            </View>
            <Button
              label={`Log ${SLOT_OPTIONS.find((option) => option.value === slot)?.label.toLowerCase()}`}
              onPress={log}
              disabled={!result.foods.length}
              style={styles.saveButton}
            />
          </View>
        </Reveal>
      ) : null}
    </Screen>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Close meal logger" style={styles.closeButton} onPress={onPress}>
      <X size={21} color={colors.text} />
    </Pressable>
  );
}

function Macro({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.macro}>
      {icon}
      <View>
        <Text style={styles.macroValue}>{value}</Text>
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
    </View>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field
      label={label}
      value={value ? String(value) : ''}
      onChangeText={(text) => onChange(Math.max(0, Number.parseInt(text, 10) || 0))}
      keyboardType="numeric"
      placeholder="0"
      containerStyle={styles.numberField}
    />
  );
}

function manualResult(): FoodPhotoAnalysis {
  return { foods: [{ ...EMPTY_FOOD }], calorieRange: [0, 0], proteinG: 0, confidence: 'low', source: 'manual' };
}

function recompute(foods: DetectedFood[], confidence: FoodPhotoAnalysis['confidence']) {
  const calories = foods.reduce((sum, food) => sum + food.calories, 0);
  const margin = confidence === 'high' ? 0.1 : confidence === 'medium' ? 0.2 : 0.35;
  return {
    calorieRange: [Math.round(calories * (1 - margin)), Math.round(calories * (1 + margin))] as [number, number],
    proteinG: foods.reduce((sum, food) => sum + food.proteinG, 0),
  };
}

function defaultMealSlot(): MealItem['slot'] {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

function mealName(foods: DetectedFood[], slot: MealItem['slot']): string {
  const names = foods.map((food) => food.name).filter(Boolean);
  if (!names.length) return `${slot[0].toUpperCase()}${slot.slice(1)} meal`;
  return names.slice(0, 2).join(' + ') + (names.length > 2 ? ` + ${names.length - 2} more` : '');
}

const styles = StyleSheet.create({
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  slotBand: { paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, gap: spacing.md },
  slotCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  slotSub: { color: colors.textDim, fontSize: font.small, marginTop: 2 },
  manualLink: { minHeight: 48, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  manualText: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  loading: { minHeight: 92, flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primaryDim },
  loadingTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  dim: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  resultPanel: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden', ...shadow.card },
  resultHeader: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surfaceAlt },
  resultHeaderCompact: { flexDirection: 'column', alignItems: 'stretch' },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  resultTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginVertical: 3 },
  macroSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  macro: { minWidth: 96, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  macroValue: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  macroLabel: { color: colors.textMuted, fontSize: font.tiny, textTransform: 'uppercase' },
  macroDivider: { width: 1, height: 36, backgroundColor: colors.border },
  foodList: { paddingHorizontal: spacing.lg },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  foodIndex: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  foodIndexText: { color: colors.primary, fontWeight: '900', fontSize: font.small },
  foodFields: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foodNameField: { flexGrow: 2, flexBasis: 220 },
  portionField: { flexGrow: 1, flexBasis: 150 },
  numberField: { flexGrow: 1, flexBasis: 110 },
  removeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#2E1917' },
  addButton: { margin: spacing.lg, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryDim, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  addText: { color: colors.primary, fontSize: font.small, fontWeight: '800' },
  error: { color: colors.danger, fontSize: font.small, fontWeight: '700', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  saveRow: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  saveRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  reviewNote: { flex: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  reviewNoteText: { color: colors.textDim, fontSize: font.small, flex: 1 },
  saveButton: { minWidth: 220 },
});
