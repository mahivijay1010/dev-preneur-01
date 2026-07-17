import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Check,
  Dumbbell,
  Fish,
  Footprints,
  Gauge,
  Heart,
  Home,
  Leaf,
  Microscope,
  Minus,
  Ruler,
  Salad,
  Scale,
  Sprout,
  Target,
  Timer,
  Trees,
  Trophy,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  UserRound,
  WalletCards,
  Zap,
  Sparkles,
  Flame,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react-native';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, ChipGroup, Field, InlineNotice, ProgressRing, SectionHeader, StatusPill } from '@/components/ui';
import { AnimatedNumber, DirectionalReveal, usePressMotion, useReducedMotion } from '@/components/motion';
import { computeMacros } from '@/engine/nutrition';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type {
  ActivityLevel,
  CoachTone,
  DietType,
  Equipment,
  Experience,
  Goal,
  OnboardingProfile,
  Sex,
  Weekday,
  WorkoutLocation,
} from '@/types';

const DEFAULTS: OnboardingProfile = {
  goal: 'weight_loss',
  sex: 'male',
  age: 30,
  heightCm: 175,
  currentWeightKg: 80,
  targetWeightKg: 72,
  activityLevel: 'moderate',
  experience: 'beginner',
  location: 'home',
  equipment: ['none'],
  workoutDays: ['mon', 'wed', 'fri'],
  dietType: 'omnivore',
  allergies: [],
  cuisine: '',
  budget: 'medium',
  cookingTimeMin: 30,
  medicalNotes: '',
  coachTone: 'supportive',
};

const STEPS = [
  { label: 'Goal & coach', icon: Target },
  { label: 'About you', icon: UserRound },
  { label: 'Experience', icon: Activity },
  { label: 'Training', icon: Dumbbell },
  { label: 'Nutrition', icon: Salad },
  { label: 'Practical fit', icon: WalletCards },
];

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: 'Mon', value: 'mon' }, { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' }, { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' }, { label: 'Sat', value: 'sat' },
  { label: 'Sun', value: 'sun' },
];

const EQUIPMENT: { label: string; value: Equipment }[] = [
  { label: 'None', value: 'none' }, { label: 'Dumbbells', value: 'dumbbells' },
  { label: 'Bands', value: 'resistance_bands' }, { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Barbell', value: 'barbell' }, { label: 'Pull-up bar', value: 'pullup_bar' },
  { label: 'Bench', value: 'bench' }, { label: 'Full gym', value: 'full_gym' },
];

const STEP_ACCENTS = [
  { main: colors.primary, dim: colors.primaryDim },
  { main: colors.accent, dim: colors.accentDim },
  { main: colors.peach, dim: colors.peachDim },
  { main: colors.success, dim: colors.successDim },
  { main: colors.accent, dim: colors.accentDim },
  { main: colors.warning, dim: colors.warningDim },
];

const STEP_BADGES = ['DIRECTION SET', 'BODY SIGNAL', 'LOAD CALIBRATED', 'WEEK BUILDER', 'MEAL ENGINE', 'READY TO BUILD'];

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const existingProfile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const generatePlan = useAppStore((state) => state.generatePlan);
  const syncNow = useAppStore((state) => state.syncNow);
  const initial = existingProfile ?? DEFAULTS;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<OnboardingProfile>(initial);
  const [allergyText, setAllergyText] = useState(initial.allergies.join(', '));
  const scrollRef = useRef<ScrollView>(null);
  const [numbers, setNumbers] = useState({
    age: String(initial.age),
    heightCm: String(initial.heightCm),
    currentWeightKg: String(initial.currentWeightKg),
    targetWeightKg: String(initial.targetWeightKg),
  });
  const previewProfile = useMemo<OnboardingProfile>(() => ({
    ...form,
    age: validNumber(numbers.age, form.age),
    heightCm: validNumber(numbers.heightCm, form.heightCm),
    currentWeightKg: validNumber(numbers.currentWeightKg, form.currentWeightKg),
    targetWeightKg: validNumber(numbers.targetWeightKg, form.targetWeightKg),
  }), [form, numbers]);
  const previewMacros = useMemo(() => computeMacros(previewProfile), [previewProfile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  const set = <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) => {
    setError('');
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const toggle = <T,>(values: T[], value: T) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  const toggleEquipment = (value: Equipment) => {
    if (value === 'none') return set('equipment', ['none']);
    const current = form.equipment.filter((item) => item !== 'none');
    const next = toggle(current, value);
    set('equipment', next.length ? next : ['none']);
  };

  const parseNumbers = () => ({
    age: Number(numbers.age),
    heightCm: Number(numbers.heightCm),
    currentWeightKg: Number(numbers.currentWeightKg),
    targetWeightKg: Number(numbers.targetWeightKg),
  });

  const validate = () => {
    if (step === 1) {
      const values = parseNumbers();
      if (!Number.isFinite(values.age) || values.age < 16 || values.age > 85) return 'Age must be between 16 and 85.';
      if (!Number.isFinite(values.heightCm) || values.heightCm < 120 || values.heightCm > 230) return 'Height must be between 120 and 230 cm.';
      if (!Number.isFinite(values.currentWeightKg) || values.currentWeightKg < 35 || values.currentWeightKg > 300) return 'Enter a realistic current weight.';
      if (!Number.isFinite(values.targetWeightKg) || values.targetWeightKg < 35 || values.targetWeightKg > 300) return 'Enter a realistic target weight.';
      if (form.goal === 'weight_loss' && values.targetWeightKg >= values.currentWeightKg) return 'For weight loss, target weight should be below current weight.';
      if (form.goal === 'muscle_gain' && values.targetWeightKg <= values.currentWeightKg) return 'For muscle gain, target weight should be above current weight.';
      setForm((previous) => ({ ...previous, ...values }));
    }
    if (step === 3 && form.workoutDays.length < 2) return 'Choose at least two realistic workout days.';
    return '';
  };

  const finish = async () => {
    setBusy(true);
    const values = parseNumbers();
    setProfile({
      ...form,
      ...values,
      allergies: allergyText.split(',').map((item) => item.trim()).filter(Boolean),
    });
    try {
      await generatePlan();
      await syncNow();
      router.replace('/(tabs)/today');
    } finally {
      setBusy(false);
    }
  };

  const moveToStep = (nextStep: number) => {
    setError('');
    setDirection(nextStep < step ? -1 : 1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, nextStep)));
  };

  const next = () => {
    const message = validate();
    if (message) return setError(message);
    setError('');
    if (step === STEPS.length - 1) return void finish();
    moveToStep(step + 1);
  };

  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <View style={styles.brandMark}><Target size={17} color={colors.black} strokeWidth={2.6} /></View>
          <Text style={styles.brand}>FITPLAN</Text>
          <View style={styles.stepMeta}>
            <Text style={styles.stepCount}>Step {step + 1} of {STEPS.length}</Text>
            <View style={styles.topProgressTrack}>
              <View style={[styles.topProgressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroller}
        contentContainerStyle={[styles.shell, !wide && styles.shellNarrow]}
        keyboardShouldPersistTaps="handled"
      >
        {wide ? (
          <View style={styles.sidebar}>
            <Text style={styles.sidebarLabel}>YOUR PLAN SETUP</Text>
            <View style={styles.stepList}>
              {STEPS.map(({ label, icon: Icon }, index) => {
                const active = index === step;
                const complete = index < step;
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: index > step }}
                    disabled={index > step}
                    onPress={() => moveToStep(index)}
                    style={({ pressed }) => [styles.stepRow, pressed && styles.stepRowPressed]}
                  >
                    <View style={[styles.stepIcon, active && styles.stepIconActive, complete && styles.stepIconComplete]}>
                      {complete ? <Check size={16} color={colors.black} strokeWidth={3} /> : <Icon size={16} color={active ? colors.black : colors.textDim} />}
                    </View>
                    <View style={styles.stepCopy}>
                      <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                      {complete ? <Text style={styles.stepDone}>CALIBRATED</Text> : null}
                    </View>
                    {active ? <View style={[styles.stepRail, { backgroundColor: STEP_ACCENTS[step].main }]} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.mobileProgress}>
            {STEPS.map((item, index) => (
              <View key={item.label} style={[styles.progressSegment, index <= step && styles.progressSegmentOn]} />
            ))}
          </View>
        )}

        <View style={styles.formPanel}>
          <DirectionalReveal key={`header-${step}`} direction={direction} style={styles.formHeader}>
            <View style={styles.eyebrowRow}>
              <View style={[styles.eyebrowPulse, { backgroundColor: STEP_ACCENTS[step].main }]} />
              <Text style={[styles.eyebrow, { color: STEP_ACCENTS[step].main }]}>{STEPS[step].label.toUpperCase()}</Text>
              <Text style={styles.planState}>{STEP_BADGES[step]}</Text>
            </View>
            <Text style={styles.title}>{stepTitle(step)}</Text>
            <Text style={styles.subtitle}>{stepSubtitle(step)}</Text>
          </DirectionalReveal>

          <PlanPreview
            key={`preview-${step}`}
            step={step}
            profile={previewProfile}
            calories={previewMacros.calories}
            protein={previewMacros.proteinG}
            compact={!wide}
            direction={direction}
          />

          <DirectionalReveal key={`body-${step}`} direction={direction} delay={70} style={[styles.formBody, { borderTopColor: STEP_ACCENTS[step].main }]}>
            {step === 0 && (
              <>
                <View style={[styles.choiceGrid, !wide && styles.choiceGridNarrow]}>
                  <ChoiceCard
                    active={form.goal === 'weight_loss'}
                    icon={<TrendingDown size={22} color={form.goal === 'weight_loss' ? colors.black : colors.primary} />}
                    title="Lose weight"
                    body="A steady calorie deficit with strength work."
                    onPress={() => set('goal', 'weight_loss')}
                  />
                  <ChoiceCard
                    active={form.goal === 'muscle_gain'}
                    icon={<TrendingUp size={22} color={form.goal === 'muscle_gain' ? colors.black : colors.peach} />}
                    title="Build muscle"
                    body="A controlled surplus with progressive training."
                    onPress={() => set('goal', 'muscle_gain')}
                  />
                </View>
                <SectionHeader>How should your coach communicate?</SectionHeader>
                <VisualOptionGrid<CoachTone>
                  wide={wide}
                  columns={3}
                  compact
                  accent={STEP_ACCENTS[step].main}
                  value={form.coachTone}
                  onChange={(value) => set('coachTone', value)}
                  options={[
                    { label: 'Supportive', value: 'supportive', icon: Heart },
                    { label: 'Direct', value: 'direct', icon: Zap },
                    { label: 'Scientific', value: 'scientific', icon: Microscope },
                    { label: 'Minimal', value: 'minimal', icon: Minus },
                    { label: 'Competitive', value: 'competitive', icon: Trophy },
                  ]}
                />
              </>
            )}

            {step === 1 && (
              <>
                <SectionHeader>Biological sex</SectionHeader>
                <ChipGroup<Sex>
                  value={form.sex}
                  onChange={(value) => set('sex', value)}
                  options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }]}
                />
                <FieldGrid wide={wide}>
                  <Field containerStyle={wide ? styles.fieldHalf : undefined} label="Age" hint="years" value={numbers.age} onChangeText={(value) => setNumbers((previous) => ({ ...previous, age: value }))} keyboardType="numeric" />
                  <Field containerStyle={wide ? styles.fieldHalf : undefined} label="Height" hint="cm" value={numbers.heightCm} onChangeText={(value) => setNumbers((previous) => ({ ...previous, heightCm: value }))} keyboardType="numeric" />
                  <Field containerStyle={wide ? styles.fieldHalf : undefined} label="Current weight" hint="kg" value={numbers.currentWeightKg} onChangeText={(value) => setNumbers((previous) => ({ ...previous, currentWeightKg: value }))} keyboardType="numeric" />
                  <Field containerStyle={wide ? styles.fieldHalf : undefined} label="Target weight" hint="kg" value={numbers.targetWeightKg} onChangeText={(value) => setNumbers((previous) => ({ ...previous, targetWeightKg: value }))} keyboardType="numeric" />
                </FieldGrid>
                <BiometricRoute profile={previewProfile} accent={STEP_ACCENTS[step].main} />
              </>
            )}

            {step === 2 && (
              <>
                <SectionHeader>Daily activity outside training</SectionHeader>
                <ActivitySelector
                  value={form.activityLevel}
                  onChange={(value) => set('activityLevel', value)}
                  accent={STEP_ACCENTS[step].main}
                  wide={wide}
                />
                <SectionHeader>Exercise experience</SectionHeader>
                <VisualOptionGrid<Experience>
                  wide={wide}
                  columns={3}
                  accent={STEP_ACCENTS[step].main}
                  value={form.experience}
                  onChange={(value) => set('experience', value)}
                  options={[
                    { label: 'Beginner', value: 'beginner', description: 'Learning movement patterns', icon: Footprints },
                    { label: 'Intermediate', value: 'intermediate', description: 'Training consistently', icon: Gauge },
                    { label: 'Advanced', value: 'advanced', description: 'Managing higher volume', icon: Trophy },
                  ]}
                />
              </>
            )}

            {step === 3 && (
              <>
                <SectionHeader>Where do you usually train?</SectionHeader>
                <VisualOptionGrid<WorkoutLocation>
                  wide={wide}
                  columns={3}
                  accent={STEP_ACCENTS[step].main}
                  value={form.location}
                  onChange={(value) => set('location', value)}
                  options={[
                    { label: 'Home', value: 'home', description: 'Flexible and private', icon: Home },
                    { label: 'Gym', value: 'gym', description: 'Full equipment access', icon: Building2 },
                    { label: 'Outdoor', value: 'outdoor', description: 'Open-air movement', icon: Trees },
                  ]}
                />
                <SectionHeader>Equipment available</SectionHeader>
                <ChipGroup<Equipment> multi value={form.equipment} onChange={toggleEquipment} options={EQUIPMENT} />
                <SectionHeader>Preferred workout days</SectionHeader>
                <WeekRhythm
                  value={form.workoutDays}
                  onChange={(value) => set('workoutDays', toggle(form.workoutDays, value))}
                  accent={STEP_ACCENTS[step].main}
                />
              </>
            )}

            {step === 4 && (
              <>
                <SectionHeader>Diet type</SectionHeader>
                <VisualOptionGrid<DietType>
                  wide={wide}
                  columns={5}
                  compact
                  accent={STEP_ACCENTS[step].main}
                  value={form.dietType}
                  onChange={(value) => set('dietType', value)}
                  options={[
                    { label: 'Omnivore', value: 'omnivore', icon: UtensilsCrossed },
                    { label: 'Vegetarian', value: 'vegetarian', icon: Sprout },
                    { label: 'Vegan', value: 'vegan', icon: Leaf },
                    { label: 'Pescatarian', value: 'pescatarian', icon: Fish },
                    { label: 'Keto', value: 'keto', icon: Flame },
                  ]}
                />
                <Field label="Allergies" hint="comma separated" value={allergyText} onChangeText={setAllergyText} placeholder="Peanut, dairy" />
                <Field label="Preferred cuisine" value={form.cuisine} onChangeText={(value) => set('cuisine', value)} placeholder="Indian, Mediterranean" />
              </>
            )}

            {step === 5 && (
              <>
                <SectionHeader>Weekly food budget</SectionHeader>
                <VisualOptionGrid<OnboardingProfile['budget']>
                  wide={wide}
                  columns={3}
                  accent={STEP_ACCENTS[step].main}
                  value={form.budget}
                  onChange={(value) => set('budget', value)}
                  options={[
                    { label: 'Low', value: 'low', description: 'Staples first', icon: CircleDollarSign },
                    { label: 'Medium', value: 'medium', description: 'Flexible variety', icon: WalletCards },
                    { label: 'High', value: 'high', description: 'Premium options', icon: Sparkles },
                  ]}
                />
                <SectionHeader>Cooking time per meal</SectionHeader>
                <VisualOptionGrid<number>
                  wide={wide}
                  columns={3}
                  accent={STEP_ACCENTS[step].main}
                  value={form.cookingTimeMin}
                  onChange={(value) => set('cookingTimeMin', value)}
                  options={[
                    { label: '15 min', value: 15, description: 'Fast assembly', icon: Timer },
                    { label: '30 min', value: 30, description: 'Balanced prep', icon: Timer },
                    { label: '45+ min', value: 45, description: 'Cook from scratch', icon: Timer },
                  ]}
                />
                <Field
                  label="Medical conditions or injuries"
                  hint="optional"
                  value={form.medicalNotes}
                  onChangeText={(value) => set('medicalNotes', value)}
                  placeholder="Anything the plan should be careful with?"
                  multiline
                />
                <ReadinessStrip profile={previewProfile} accent={STEP_ACCENTS[step].main} />
              </>
            )}
          </DirectionalReveal>

          {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

          <View style={styles.nav}>
            {step > 0 ? (
              <Button label="Back" variant="ghost" icon={<ArrowLeft size={18} color={colors.text} />} onPress={() => moveToStep(step - 1)} />
            ) : <View />}
            <Button
              label={step === STEPS.length - 1 ? 'Build my plan' : 'Continue'}
              icon={<ArrowRight size={18} color={colors.black} />}
              onPress={next}
              loading={busy}
              style={styles.continueButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PlanPreview({
  step,
  profile,
  calories,
  protein,
  compact,
  direction,
}: {
  step: number;
  profile: OnboardingProfile;
  calories: number;
  protein: number;
  compact: boolean;
  direction: -1 | 1;
}) {
  const completion = Math.round(((step + 1) / STEPS.length) * 100);
  const accent = STEP_ACCENTS[step].main;
  return (
    <DirectionalReveal direction={direction} distance={18} style={[styles.preview, compact && styles.previewCompact, { borderColor: `${accent}66` }]}>
      <View style={[styles.previewVisual, compact && styles.previewVisualCompact]}>
        <PerformanceSignal step={step} completion={completion} accent={accent} />
        <View style={[styles.previewBadge, { backgroundColor: accent }]}>
          <Sparkles size={13} color={colors.black} />
          <Text style={styles.previewBadgeText}>{STEP_BADGES[step]}</Text>
        </View>
      </View>
      <View style={styles.previewContent}>
        <View style={styles.previewTopline}>
          <View>
            <Text style={styles.previewEyebrow}>YOUR PLAN SIGNAL</Text>
            <Text style={styles.previewTitle}>{previewHeadline(step, profile)}</Text>
          </View>
          <ProgressRing progress={completion} value={`${completion}%`} size={72} accent={accent} />
        </View>
        <View style={styles.previewMetrics}>
          <PreviewMetric icon={<Flame size={15} color={colors.peach} />} value={`${calories}`} label="daily kcal" />
          <PreviewMetric icon={<Target size={15} color={colors.accent} />} value={`${protein}g`} label="protein" />
          <PreviewMetric icon={<CalendarDays size={15} color={colors.success} />} value={`${profile.workoutDays.length}x`} label="per week" />
        </View>
        <View style={styles.previewInsight}>
          <StatusPill label={profile.goal === 'weight_loss' ? 'Fat-loss track' : 'Strength track'} color={accent} />
          <Text style={styles.previewInsightText}>{stepInsight(step, profile)}</Text>
        </View>
      </View>
    </DirectionalReveal>
  );
}

function PreviewMetric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  const parsed = value.match(/^([\d.]+)(.*)$/);
  return (
    <View style={styles.previewMetric}>
      {icon}
      <View>
        {parsed ? (
          <AnimatedNumber value={Number(parsed[1])} suffix={parsed[2]} style={styles.previewMetricValue} />
        ) : <Text style={styles.previewMetricValue}>{value}</Text>}
        <Text style={styles.previewMetricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function PerformanceSignal({ step, completion, accent }: { step: number; completion: number; accent: string }) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const Icon = STEPS[step].icon;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.55);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduced]);

  return (
    <View pointerEvents="none" style={styles.signalCanvas}>
      <View style={styles.signalTrack}>
        {STEPS.map((item, index) => (
          <View key={item.label} style={styles.signalNodeWrap}>
            <View style={[styles.signalNode, index <= step && { backgroundColor: accent, borderColor: accent }]} />
            {index < STEPS.length - 1 ? <View style={[styles.signalConnector, index < step && { backgroundColor: accent }]} /> : null}
          </View>
        ))}
      </View>
      <View style={styles.targetStage}>
        <Animated.View
          style={[
            styles.targetPulse,
            { borderColor: accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.24] }) }] },
          ]}
        />
        <View style={[styles.targetOuter, { borderColor: `${accent}66` }]}>
          <View style={[styles.targetMiddle, { borderColor: `${accent}99` }]}>
            <View style={[styles.targetCore, { backgroundColor: accent }]}><Icon size={24} color={colors.black} strokeWidth={2.4} /></View>
          </View>
        </View>
        <View style={[styles.targetTick, styles.targetTickTop, { backgroundColor: accent }]} />
        <View style={[styles.targetTick, styles.targetTickRight, { backgroundColor: accent }]} />
        <View style={[styles.targetTick, styles.targetTickBottom, { backgroundColor: accent }]} />
        <View style={[styles.targetTick, styles.targetTickLeft, { backgroundColor: accent }]} />
      </View>
      <View style={styles.signalFooter}>
        <Text style={[styles.signalPercent, { color: accent }]}>{completion}%</Text>
        <View style={styles.signalFooterCopy}>
          <Text style={styles.signalFooterLabel}>{STEPS[step].label.toUpperCase()}</Text>
          <Text style={styles.signalFooterState}>CALIBRATING LIVE</Text>
        </View>
      </View>
    </View>
  );
}

function ChoiceCard({ active, icon, title, body, onPress }: { active: boolean; icon: ReactNode; title: string; body: string; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={[styles.choiceMotion, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        {...pressHandlers}
        style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.choicePressed]}
      >
        <View style={[styles.choiceIcon, active && styles.choiceIconActive]}>{icon}</View>
        <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>{title}</Text>
        <Text style={[styles.choiceBody, active && styles.choiceBodyActive]}>{body}</Text>
        <View style={[styles.choiceCheck, active && styles.choiceCheckActive]}>
          {active ? <Check size={13} color={colors.black} strokeWidth={3} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

type OptionIcon = LucideIcon;
type VisualOption<T> = { label: string; value: T; description?: string; icon?: OptionIcon };

function VisualOptionGrid<T extends string | number>({
  options,
  value,
  onChange,
  accent,
  wide,
  columns,
  compact = false,
}: {
  options: VisualOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accent: string;
  wide: boolean;
  columns: number;
  compact?: boolean;
}) {
  const basis = wide ? `${Math.max(16, (100 / columns) - 2)}%` : compact ? '46%' : '100%';
  return (
    <View style={styles.visualOptions}>
      {options.map((option) => (
        <MotionVisualOption
          key={String(option.value)}
          option={option}
          active={value === option.value}
          accent={accent}
          compact={compact}
          basis={basis}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

function MotionVisualOption<T>({
  option,
  active,
  accent,
  compact,
  basis,
  onPress,
}: {
  option: VisualOption<T>;
  active: boolean;
  accent: string;
  compact: boolean;
  basis: string;
  onPress: () => void;
}) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  const Icon = option.icon;
  return (
    <Animated.View style={[styles.visualOptionMotion, { flexBasis: basis as any }, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        {...pressHandlers}
        style={({ pressed }) => [
          styles.visualOption,
          compact && styles.visualOptionCompact,
          active && { borderColor: accent, backgroundColor: accent },
          pressed && styles.visualOptionPressed,
        ]}
      >
        {Icon ? (
          <View style={[styles.visualOptionIcon, active && styles.visualOptionIconActive]}>
            <Icon size={compact ? 17 : 19} color={active ? colors.black : accent} strokeWidth={2.2} />
          </View>
        ) : null}
        <View style={styles.visualOptionCopy}>
          <Text
            numberOfLines={1}
            style={[styles.visualOptionLabel, compact && styles.visualOptionLabelCompact, active && styles.visualOptionLabelActive]}
          >
            {option.label}
          </Text>
          {option.description ? (
            <Text style={[styles.visualOptionDescription, active && styles.visualOptionDescriptionActive]}>{option.description}</Text>
          ) : null}
        </View>
        <View style={[styles.visualOptionIndicator, active && { backgroundColor: colors.black, borderColor: colors.black }]}>
          {active ? <Check size={10} color={accent} strokeWidth={3} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel; detail: string }[] = [
  { label: 'Sedentary', value: 'sedentary', detail: 'Mostly seated' },
  { label: 'Light', value: 'light', detail: 'Some walking' },
  { label: 'Moderate', value: 'moderate', detail: 'Regular movement' },
  { label: 'Active', value: 'active', detail: 'On your feet' },
  { label: 'Very active', value: 'very_active', detail: 'Physical days' },
];

function ActivitySelector({ value, onChange, accent, wide }: { value: ActivityLevel; onChange: (value: ActivityLevel) => void; accent: string; wide: boolean }) {
  return (
    <View style={styles.activityGrid}>
      {ACTIVITY_OPTIONS.map((option, index) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.activityOption,
              { flexBasis: wide ? '18%' : '46%' },
              active && { borderColor: accent, backgroundColor: `${accent}16` },
              pressed && styles.visualOptionPressed,
            ]}
          >
            <View style={styles.activityBars}>
              {[0, 1, 2, 3, 4].map((bar) => (
                <View
                  key={bar}
                  style={[
                    styles.activityBar,
                    { height: 6 + (bar * 3) },
                    bar <= index && { backgroundColor: active ? accent : colors.textMuted },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.activityLabel, active && { color: accent }]}>{option.label}</Text>
            <Text style={styles.activityDetail}>{option.detail}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WeekRhythm({ value, onChange, accent }: { value: Weekday[]; onChange: (value: Weekday) => void; accent: string }) {
  return (
    <View style={styles.weekRhythm}>
      {WEEKDAYS.map((day) => {
        const active = value.includes(day.value);
        return (
          <Pressable
            key={day.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(day.value)}
            style={({ pressed }) => [styles.daySignal, active && { backgroundColor: accent, borderColor: accent }, pressed && styles.visualOptionPressed]}
          >
            <Text style={[styles.dayLabel, active && styles.dayLabelActive]}>{day.label.slice(0, 1)}</Text>
            <View style={[styles.dayDot, active && { backgroundColor: colors.black }]} />
            <Text style={[styles.dayState, active && styles.dayStateActive]}>{active ? 'TRAIN' : 'REST'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function BiometricRoute({ profile, accent }: { profile: OnboardingProfile; accent: string }) {
  const delta = Math.abs(profile.currentWeightKg - profile.targetWeightKg);
  return (
    <View style={[styles.liveRoute, { borderColor: `${accent}66`, backgroundColor: `${accent}0D` }]}>
      <View style={[styles.liveRouteIcon, { backgroundColor: `${accent}22` }]}><Scale size={19} color={accent} /></View>
      <View style={styles.liveRouteCopy}>
        <Text style={styles.liveRouteEyebrow}>LIVE WEIGHT ROUTE</Text>
        <Text style={styles.liveRouteTitle}>{profile.currentWeightKg} kg <Text style={{ color: accent }}>→</Text> {profile.targetWeightKg} kg</Text>
      </View>
      <View style={styles.liveRouteMetric}>
        <AnimatedNumber value={delta} decimals={1} suffix=" kg" style={[styles.liveRouteValue, { color: accent }]} />
        <Text style={styles.liveRouteLabel}>TO TARGET</Text>
      </View>
      <View style={styles.liveRouteStats}>
        <Ruler size={14} color={colors.textMuted} />
        <Text style={styles.liveRouteStatsText}>{profile.heightCm} cm · age {profile.age}</Text>
      </View>
    </View>
  );
}

function ReadinessStrip({ profile, accent }: { profile: OnboardingProfile; accent: string }) {
  return (
    <View style={[styles.readinessStrip, { borderColor: `${accent}66`, backgroundColor: `${accent}0D` }]}>
      <View style={[styles.readinessIcon, { backgroundColor: accent }]}><Sparkles size={18} color={colors.black} /></View>
      <View style={styles.readinessCopy}>
        <Text style={styles.readinessEyebrow}>PLAN READINESS</Text>
        <Text style={styles.readinessTitle}>{profile.cookingTimeMin}-minute meals · {profile.workoutDays.length} training days · {profile.dietType}</Text>
      </View>
      <View style={styles.readinessStatus}>
        <Check size={14} color={accent} strokeWidth={3} />
        <Text style={[styles.readinessStatusText, { color: accent }]}>READY</Text>
      </View>
    </View>
  );
}

function FieldGrid({ children, wide }: { children: ReactNode; wide: boolean }) {
  return <View style={[styles.fieldGrid, !wide && styles.fieldGridNarrow]}>{children}</View>;
}

function stepTitle(step: number) {
  return [
    'What are you working toward?',
    'Let’s get the basics right.',
    'What does your day look like?',
    'Build a schedule you can keep.',
    'Make the food plan feel familiar.',
    'Keep the plan practical.',
  ][step];
}

function stepSubtitle(step: number) {
  return [
    'Your goal sets the direction. Your coaching style changes how guidance is delivered.',
    'These numbers determine your starting calorie and protein targets.',
    'Activity and experience help us choose a realistic training load.',
    'Choose what you genuinely have access to and days you can protect.',
    'Meals are filtered around your diet, allergies, and normal cuisine.',
    'A sustainable plan has to fit your time, budget, and health constraints.',
  ][step];
}

function previewHeadline(step: number, profile: OnboardingProfile) {
  return [
    profile.goal === 'weight_loss' ? 'A leaner, stronger route' : 'A progressive strength route',
    `${profile.currentWeightKg} kg to ${profile.targetWeightKg} kg`,
    `${profile.activityLevel.replace('_', ' ')} days, ${profile.experience} training`,
    `${profile.location} plan across ${profile.workoutDays.length} days`,
    `${profile.dietType} meals that fit real life`,
    `${profile.cookingTimeMin}-minute meals, ${profile.budget} budget`,
  ][step];
}

function stepInsight(step: number, profile: OnboardingProfile) {
  return [
    `Your ${profile.coachTone} coach will shape every check-in.`,
    'Targets recalculate as these numbers change.',
    'Training volume will match your current capacity.',
    `${profile.equipment.length} equipment option${profile.equipment.length === 1 ? '' : 's'} selected.`,
    profile.allergies.length ? `${profile.allergies.length} allergy filter${profile.allergies.length === 1 ? '' : 's'} active.` : 'You can add allergy filters before continuing.',
    'Your plan is ready to generate and sync to your account.',
  ][step];
}

function validNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  topBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgElevated },
  topBarInner: { width: '100%', maxWidth: 1100, minHeight: 64, alignSelf: 'center', paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.text, fontSize: font.small, fontWeight: '900', letterSpacing: 1.5 },
  stepMeta: { marginLeft: 'auto', width: 150, gap: 6, alignItems: 'flex-end' },
  stepCount: { color: colors.textDim, fontSize: font.small, fontWeight: '700' },
  topProgressTrack: { width: 150, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: colors.border },
  topProgressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  scroller: { flex: 1, backgroundColor: colors.bg },
  shell: { width: '100%', maxWidth: 1100, flexGrow: 1, alignSelf: 'center', flexDirection: 'row', padding: spacing.lg, gap: spacing.xxl },
  shellNarrow: { flexDirection: 'column', gap: spacing.lg },
  sidebar: { width: 210, paddingTop: spacing.lg },
  sidebarLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.2, marginBottom: spacing.lg },
  stepList: { gap: 6 },
  stepRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, borderRadius: radius.md, position: 'relative' },
  stepRowPressed: { backgroundColor: colors.surface },
  stepIcon: { width: 30, height: 30, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepIconActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepIconComplete: { backgroundColor: colors.success, borderColor: colors.success },
  stepCopy: { flex: 1, gap: 2 },
  stepLabel: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  stepLabelActive: { color: colors.text, fontWeight: '700' },
  stepDone: { color: colors.success, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  stepRail: { position: 'absolute', right: -1, width: 3, height: 26, borderRadius: 2 },
  mobileProgress: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentOn: { backgroundColor: colors.primary },
  formPanel: { flex: 1, maxWidth: 820, gap: spacing.lg, paddingBottom: spacing.xxl },
  formHeader: { gap: spacing.sm },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  eyebrowPulse: { width: 7, height: 7, borderRadius: 4 },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1.2 },
  planState: { marginLeft: 'auto', color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: colors.text, fontSize: font.h1, lineHeight: 37, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 650 },
  preview: { minHeight: 190, flexDirection: 'row', overflow: 'hidden', backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md },
  previewCompact: { flexDirection: 'column' },
  previewVisual: { width: 238, minHeight: 190, position: 'relative', overflow: 'hidden', backgroundColor: colors.black, borderRightWidth: 1, borderRightColor: colors.border },
  previewVisualCompact: { width: '100%', height: 174, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  signalCanvas: { flex: 1, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 14, justifyContent: 'space-between' },
  signalTrack: { height: 12, flexDirection: 'row', alignItems: 'center' },
  signalNodeWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  signalNode: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt },
  signalConnector: { flex: 1, height: 1, backgroundColor: colors.border },
  targetStage: { width: 88, height: 88, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  targetPulse: { position: 'absolute', width: 84, height: 84, borderWidth: 1, borderRadius: 42 },
  targetOuter: { width: 70, height: 70, borderWidth: 1, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  targetMiddle: { width: 50, height: 50, borderWidth: 1, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  targetCore: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  targetTick: { position: 'absolute', width: 10, height: 2 },
  targetTickTop: { top: 2 },
  targetTickRight: { right: -2, transform: [{ rotate: '90deg' }] },
  targetTickBottom: { bottom: 2 },
  targetTickLeft: { left: -2, transform: [{ rotate: '90deg' }] },
  signalFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  signalPercent: { fontSize: font.h3, fontWeight: '900' },
  signalFooterCopy: { gap: 2 },
  signalFooterLabel: { color: colors.text, fontSize: 9, fontWeight: '900' },
  signalFooterState: { color: colors.textMuted, fontSize: 7, fontWeight: '800' },
  previewBadge: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  previewBadgeText: { color: colors.black, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  previewContent: { flex: 1, padding: spacing.md, gap: spacing.md, justifyContent: 'space-between' },
  previewTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  previewEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  previewTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: 3, maxWidth: 360 },
  previewMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  previewMetric: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 86 },
  previewMetricValue: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  previewMetricLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase' },
  previewInsight: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  previewInsightText: { flex: 1, minWidth: 160, color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  formBody: { backgroundColor: colors.surface, borderWidth: 1, borderTopWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.lg },
  choiceGrid: { flexDirection: 'row', gap: spacing.md },
  choiceGridNarrow: { flexDirection: 'column' },
  choiceMotion: { flex: 1 },
  choice: { flex: 1, minHeight: 150, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, padding: spacing.md, gap: spacing.sm, position: 'relative', overflow: 'hidden' },
  choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choicePressed: { opacity: 0.86 },
  choiceIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  choiceIconActive: { backgroundColor: 'rgba(9,10,9,0.12)' },
  choiceTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  choiceTitleActive: { color: colors.black },
  choiceBody: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  choiceBodyActive: { color: '#30382A' },
  choiceCheck: { position: 'absolute', right: 14, top: 14, width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  choiceCheckActive: { backgroundColor: 'rgba(9,10,9,0.13)', borderColor: 'rgba(9,10,9,0.24)' },
  visualOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  visualOptionMotion: { flexGrow: 1, minWidth: 112 },
  visualOption: { minHeight: 86, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative' },
  visualOptionCompact: { minHeight: 62, padding: 10 },
  visualOptionPressed: { opacity: 0.78 },
  visualOptionIcon: { width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  visualOptionIconActive: { backgroundColor: 'rgba(9,10,9,0.12)' },
  visualOptionCopy: { flex: 1, minWidth: 0, gap: 3 },
  visualOptionLabel: { color: colors.textDim, fontSize: font.small, fontWeight: '800' },
  visualOptionLabelCompact: { fontSize: 12 },
  visualOptionLabelActive: { color: colors.black },
  visualOptionDescription: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  visualOptionDescriptionActive: { color: '#30382A' },
  visualOptionIndicator: { position: 'absolute', right: 8, top: 8, width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  activityOption: { flexGrow: 1, minWidth: 105, minHeight: 104, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, padding: 12, justifyContent: 'flex-end', gap: 5 },
  activityBars: { height: 20, flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 4 },
  activityBar: { width: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  activityLabel: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  activityDetail: { color: colors.textMuted, fontSize: 10 },
  weekRhythm: { flexDirection: 'row', gap: 5 },
  daySignal: { flex: 1, minWidth: 34, height: 72, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 5 },
  dayLabel: { color: colors.text, fontSize: font.small, fontWeight: '900' },
  dayLabelActive: { color: colors.black },
  dayDot: { width: 14, height: 3, borderRadius: 2, backgroundColor: colors.borderStrong },
  dayState: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  dayStateActive: { color: '#30382A' },
  liveRoute: { borderWidth: 1, borderRadius: radius.md, minHeight: 76, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  liveRouteIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  liveRouteCopy: { flex: 1, minWidth: 150, gap: 2 },
  liveRouteEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  liveRouteTitle: { color: colors.text, fontSize: font.body, fontWeight: '900' },
  liveRouteMetric: { alignItems: 'flex-end' },
  liveRouteValue: { fontSize: font.body, fontWeight: '900' },
  liveRouteLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800' },
  liveRouteStats: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveRouteStatsText: { color: colors.textMuted, fontSize: 10 },
  readinessStrip: { borderWidth: 1, borderRadius: radius.md, minHeight: 74, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  readinessIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  readinessCopy: { flex: 1, minWidth: 200, gap: 3 },
  readinessEyebrow: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  readinessTitle: { color: colors.text, fontSize: font.small, fontWeight: '800', textTransform: 'capitalize' },
  readinessStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readinessStatusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fieldGridNarrow: { flexDirection: 'column' },
  fieldHalf: { flexBasis: '47%', flexGrow: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  continueButton: { minWidth: 180 },
});
