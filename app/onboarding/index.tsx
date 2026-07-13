import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, ChipGroup, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
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

// Frictionless multi-step onboarding. All required-by-spec fields are captured
// with sensible defaults so the user can move fast.
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

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: 'Mon', value: 'mon' },
  { label: 'Tue', value: 'tue' },
  { label: 'Wed', value: 'wed' },
  { label: 'Thu', value: 'thu' },
  { label: 'Fri', value: 'fri' },
  { label: 'Sat', value: 'sat' },
  { label: 'Sun', value: 'sun' },
];

const EQUIPMENT: { label: string; value: Equipment }[] = [
  { label: 'None', value: 'none' },
  { label: 'Dumbbells', value: 'dumbbells' },
  { label: 'Bands', value: 'resistance_bands' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Pull-up bar', value: 'pullup_bar' },
  { label: 'Bench', value: 'bench' },
  { label: 'Full gym', value: 'full_gym' },
];

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const generatePlan = useAppStore((s) => s.generatePlan);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<OnboardingProfile>(DEFAULTS);
  const [allergyText, setAllergyText] = useState('');

  const set = <K extends keyof OnboardingProfile>(k: K, v: OnboardingProfile[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const num = (v: string, fallback: number) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const finish = async () => {
    setBusy(true);
    const parsed = {
      ...f,
      allergies: allergyText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setProfile(parsed);
    await generatePlan();
    router.replace('/(tabs)/today');
  };

  const next = () => (step < TOTAL_STEPS - 1 ? setStep(step + 1) : finish());
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <Screen>
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i <= step && { backgroundColor: colors.primary }]}
          />
        ))}
      </View>

      {step === 0 && (
        <View style={styles.group}>
          <Title>What's your goal?</Title>
          <Subtitle>We tune your calories and training around this.</Subtitle>
          <ChipGroup<Goal>
            value={f.goal}
            onChange={(v) => set('goal', v)}
            options={[
              { label: 'Lose weight', value: 'weight_loss' },
              { label: 'Build muscle', value: 'muscle_gain' },
            ]}
          />
          <SectionHeader>Coaching style</SectionHeader>
          <ChipGroup<CoachTone>
            value={f.coachTone}
            onChange={(v) => set('coachTone', v)}
            options={[
              { label: 'Supportive', value: 'supportive' },
              { label: 'Direct', value: 'direct' },
              { label: 'Scientific', value: 'scientific' },
              { label: 'Minimal', value: 'minimal' },
            ]}
          />
        </View>
      )}

      {step === 1 && (
        <View style={styles.group}>
          <Title>About you</Title>
          <SectionHeader>Sex</SectionHeader>
          <ChipGroup<Sex>
            value={f.sex}
            onChange={(v) => set('sex', v)}
            options={[
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
            ]}
          />
          <Row>
            <NumField label="Age" value={f.age} onChange={(v) => set('age', num(v, f.age))} />
            <NumField label="Height (cm)" value={f.heightCm} onChange={(v) => set('heightCm', num(v, f.heightCm))} />
          </Row>
          <Row>
            <NumField label="Current (kg)" value={f.currentWeightKg} onChange={(v) => set('currentWeightKg', num(v, f.currentWeightKg))} />
            <NumField label="Target (kg)" value={f.targetWeightKg} onChange={(v) => set('targetWeightKg', num(v, f.targetWeightKg))} />
          </Row>
        </View>
      )}

      {step === 2 && (
        <View style={styles.group}>
          <Title>Activity & experience</Title>
          <SectionHeader>Daily activity level</SectionHeader>
          <ChipGroup<ActivityLevel>
            value={f.activityLevel}
            onChange={(v) => set('activityLevel', v)}
            options={[
              { label: 'Sedentary', value: 'sedentary' },
              { label: 'Light', value: 'light' },
              { label: 'Moderate', value: 'moderate' },
              { label: 'Active', value: 'active' },
              { label: 'Very active', value: 'very_active' },
            ]}
          />
          <SectionHeader>Exercise experience</SectionHeader>
          <ChipGroup<Experience>
            value={f.experience}
            onChange={(v) => set('experience', v)}
            options={[
              { label: 'Beginner', value: 'beginner' },
              { label: 'Intermediate', value: 'intermediate' },
              { label: 'Advanced', value: 'advanced' },
            ]}
          />
        </View>
      )}

      {step === 3 && (
        <View style={styles.group}>
          <Title>Training setup</Title>
          <SectionHeader>Where do you train?</SectionHeader>
          <ChipGroup<WorkoutLocation>
            value={f.location}
            onChange={(v) => set('location', v)}
            options={[
              { label: 'Home', value: 'home' },
              { label: 'Gym', value: 'gym' },
              { label: 'Outdoor', value: 'outdoor' },
            ]}
          />
          <SectionHeader>Equipment</SectionHeader>
          <ChipGroup<Equipment>
            multi
            value={f.equipment}
            onChange={(v) => set('equipment', toggle(f.equipment, v))}
            options={EQUIPMENT}
          />
          <SectionHeader>Preferred workout days</SectionHeader>
          <ChipGroup<Weekday>
            multi
            value={f.workoutDays}
            onChange={(v) => set('workoutDays', toggle(f.workoutDays, v))}
            options={WEEKDAYS}
          />
        </View>
      )}

      {step === 4 && (
        <View style={styles.group}>
          <Title>Food preferences</Title>
          <SectionHeader>Diet type</SectionHeader>
          <ChipGroup<DietType>
            value={f.dietType}
            onChange={(v) => set('dietType', v)}
            options={[
              { label: 'Omnivore', value: 'omnivore' },
              { label: 'Vegetarian', value: 'vegetarian' },
              { label: 'Vegan', value: 'vegan' },
              { label: 'Pescatarian', value: 'pescatarian' },
              { label: 'Keto', value: 'keto' },
            ]}
          />
          <SectionHeader>Allergies (comma separated)</SectionHeader>
          <TextInput
            value={allergyText}
            onChangeText={setAllergyText}
            placeholder="e.g. peanut, dairy"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
          <SectionHeader>Preferred cuisine</SectionHeader>
          <TextInput
            value={f.cuisine}
            onChangeText={(v) => set('cuisine', v)}
            placeholder="e.g. Indian, Mediterranean"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
        </View>
      )}

      {step === 5 && (
        <View style={styles.group}>
          <Title>Practical bits</Title>
          <SectionHeader>Food budget</SectionHeader>
          <ChipGroup<OnboardingProfile['budget']>
            value={f.budget}
            onChange={(v) => set('budget', v)}
            options={[
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ]}
          />
          <SectionHeader>Cooking time per meal</SectionHeader>
          <ChipGroup<number>
            value={f.cookingTimeMin}
            onChange={(v) => set('cookingTimeMin', v)}
            options={[
              { label: '15 min', value: 15 },
              { label: '30 min', value: 30 },
              { label: '45+ min', value: 45 },
            ]}
          />
          <SectionHeader>Medical conditions / injuries</SectionHeader>
          <TextInput
            value={f.medicalNotes}
            onChangeText={(v) => set('medicalNotes', v)}
            placeholder="Anything we should be careful with?"
            placeholderTextColor={colors.textDim}
            multiline
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          />
        </View>
      )}

      <View style={styles.nav}>
        {step > 0 && <Button label="Back" variant="ghost" onPress={back} />}
        <View style={{ flex: 1 }}>
          <Button
            label={step === TOTAL_STEPS - 1 ? 'Generate my plan' : 'Continue'}
            onPress={next}
            loading={busy}
          />
        </View>
      </View>
    </Screen>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: spacing.md }}>{children}</View>;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text style={styles.numLabel}>{label}</Text>
      <TextInput
        defaultValue={String(value)}
        onChangeText={onChange}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  dot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  group: { gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
  numLabel: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  nav: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.lg },
});
