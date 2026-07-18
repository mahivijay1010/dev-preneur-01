import { useRouter } from 'expo-router';
import { Plus, Sparkles, Trash2, Utensils, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CaptureButtons } from '@/components/CaptureButtons';
import { Gradient, GlowPulse, ParticleField, ShineSweep } from '@/components/depth';
import { EnergyLoader, Reveal, StaggerText, usePressMotion, useReducedMotion } from '@/components/motion';
import { Button, Card, ChipGroup, Eyebrow, Field, ProgressRing, Screen, StatusPill, Subtitle } from '@/components/ui';
import type { PickedImage } from '@/services/imagePicker';
import { analyzeFoodPhoto, isVisionEnabled } from '@/services/vision';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, shadow, spacing } from '@/theme';
import type { DetectedFood, FoodPhotoAnalysis, MealItem } from '@/types';

const SLOT_OPTIONS: { label: string; value: MealItem['slot'] }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

const EMPTY_FOOD: DetectedFood = { name: '', portion: '', calories: 0, proteinG: 0 };

const CONFIDENCE_COLOR: Record<FoodPhotoAnalysis['confidence'], string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.textDim,
};

const CAPTURE_TIPS = [
  'Shoot top-down or at a 45-degree angle.',
  'Natural light beats flash for portion reads.',
  'Include sides, sauces, and drinks in frame.',
];

export default function FoodCamera() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const wide = width >= 1024;
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

  const slotBand = (
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
  );

  const capture = (
    <Reveal delay={90}>
      <CaptureButtons
        image={image}
        onPicked={(picked) => void analyze(picked)}
        busy={busy}
        title="Put the whole plate in frame"
        description="A top-down or 45-degree angle gives the clearest food estimate."
      />
    </Reveal>
  );

  const manualLink = !result && !busy ? <ManualLink onPress={startManual} /> : null;

  return (
    <Screen maxWidth={1080}>
      <Reveal style={[styles.header, width < 700 && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Eyebrow>SMART NUTRITION</Eyebrow>
          <StaggerText
            text="Capture what you actually ate."
            accentWords={['actually']}
            style={styles.titleText}
          />
          <Subtitle>Photograph a plate or log it manually. You stay in control of every estimate.</Subtitle>
        </View>
        <View style={width < 700 ? styles.headerActionCompact : null}>
          <CloseButton onPress={() => router.back()} />
        </View>
      </Reveal>

      {wide ? (
        <View style={styles.layout}>
          <View style={styles.controlColumn}>
            {slotBand}
            <Reveal delay={80}>
              <Card tone="tinted" style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>Sharper estimates</Text>
                {CAPTURE_TIPS.map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </Card>
            </Reveal>
            {manualLink}
          </View>
          <View style={styles.captureColumn}>{capture}</View>
        </View>
      ) : (
        <>
          {slotBand}
          {capture}
          {manualLink}
        </>
      )}

      {busy ? (
        <Card tone="glass" style={styles.loading}>
          <ParticleField count={8} colors={[colors.primary]} />
          <ScanBeam />
          <GlowPulse color={colors.primary} radius={radius.md} intensity={0.3} style={styles.loaderGlow}>
            <EnergyLoader />
          </GlowPulse>
          <View>
            <Text style={styles.loadingTitle}>Reading your plate</Text>
            <Text style={styles.dim}>Finding foods and estimating portions…</Text>
          </View>
        </Card>
      ) : null}

      {result ? (
        <Reveal delay={40}>
          <Card tone="glass" style={styles.resultPanel}>
            <View style={[styles.resultHeader, compact && styles.resultHeaderCompact]}>
              <ShineSweep interval={30000} delay={300} />
              <View style={styles.resultHeaderCopy}>
                <View style={styles.eyebrowRow}>
                  <Text style={styles.eyebrow}>{result.source === 'ai' ? 'AI ESTIMATE' : 'MANUAL LOG'}</Text>
                  {result.source === 'ai' ? (
                    <StatusPill label={`${result.confidence} confidence`} color={CONFIDENCE_COLOR[result.confidence]} />
                  ) : null}
                </View>
                <Text style={styles.resultTitle}>Review your meal</Text>
                <Text style={styles.dim}>Edit anything that does not match your plate.</Text>
              </View>
              <View style={styles.macroBlock}>
                <View style={styles.macroSummary}>
                  <ProgressRing
                    progress={Math.min(100, (totals.calories / 900) * 100)}
                    value={String(totals.calories)}
                    label="kcal"
                    size={64}
                    accent={colors.peach}
                    gradient={gradients.peach}
                  />
                  <View style={styles.macroDivider} />
                  <ProgressRing
                    progress={Math.min(100, (totals.protein / 60) * 100)}
                    value={`${totals.protein}g`}
                    label="protein"
                    size={64}
                    accent={colors.accent}
                    gradient={gradients.accent}
                  />
                </View>
                {result.source === 'ai' && result.calorieRange[1] > 0 ? (
                  <Text style={styles.rangeText}>~{result.calorieRange[0]}–{result.calorieRange[1]} kcal estimated range</Text>
                ) : null}
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
          </Card>
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

function ManualLink({ onPress }: { onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={animatedStyle}>
      <Pressable accessibilityRole="button" style={styles.manualLink} onPress={onPress} {...pressHandlers}>
        <Plus size={17} color={colors.accent} />
        <Text style={styles.manualText}>Log without a photo</Text>
      </Pressable>
    </Animated.View>
  );
}

// A lime scan-line that sweeps the busy card while the photo is analyzed —
// native-driver loop with cleanup; hidden entirely under reduced motion.
function ScanBeam() {
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  const [box, setBox] = useState(0);

  useEffect(() => {
    if (reduced || box === 0) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [box, reduced, sweep]);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(event) => setBox(event.nativeEvent.layout.width)}>
      <Animated.View
        style={[
          styles.scanBeam,
          { transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, box - 46)] }) }] },
        ]}
      >
        <Gradient
          colors={['rgba(216,255,114,0)', 'rgba(216,255,114,0.45)', 'rgba(216,255,114,0)']}
          direction="horizontal"
        />
      </Animated.View>
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
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.xs },
  headerActionCompact: { alignSelf: 'flex-start' },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  controlColumn: { flex: 0.9, gap: spacing.md },
  captureColumn: { flex: 1.1 },
  slotBand: { paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, gap: spacing.md },
  slotCopy: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  slotSub: { color: colors.textDim, fontSize: font.small, marginTop: 2 },
  tipsCard: { gap: spacing.sm },
  tipsTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  tipText: { flex: 1, color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  manualLink: { minHeight: 48, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceSunken },
  manualText: { color: colors.accent, fontSize: font.small, fontWeight: '800' },
  loading: { minHeight: 92, flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center' },
  loaderGlow: { padding: spacing.sm, borderRadius: radius.md },
  loadingTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  dim: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  resultPanel: { padding: 0, gap: 0, ...shadow.card },
  resultHeader: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  resultHeaderCompact: { flexDirection: 'column', alignItems: 'stretch' },
  resultHeaderCopy: { flexShrink: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  resultTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', marginVertical: 3 },
  macroBlock: { gap: spacing.sm, alignItems: 'center' },
  macroSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  macroDivider: { width: 1, height: 36, backgroundColor: colors.border },
  rangeText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  foodList: { paddingHorizontal: spacing.lg },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  foodIndex: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  foodIndexText: { color: colors.primary, fontWeight: '900', fontSize: font.small },
  foodFields: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  foodNameField: { flexGrow: 2, flexBasis: 220 },
  portionField: { flexGrow: 1, flexBasis: 150 },
  numberField: { flexGrow: 1, flexBasis: 110 },
  removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: `${colors.danger}1A` },
  addButton: { margin: spacing.lg, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primaryDim, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  addText: { color: colors.primary, fontSize: font.small, fontWeight: '800' },
  error: { color: colors.danger, fontSize: font.small, fontWeight: '700', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  saveRow: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  saveRowCompact: { flexDirection: 'column', alignItems: 'stretch' },
  reviewNote: { flex: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  reviewNoteText: { color: colors.textDim, fontSize: font.small, flex: 1 },
  saveButton: { minWidth: 220 },
  scanBeam: { position: 'absolute', top: 0, bottom: 0, width: 46 },
});
