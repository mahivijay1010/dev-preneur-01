import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, ChipGroup, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { OnboardingProfile, Region, Religion } from '@/types';

// Local & lifestyle preferences — drives region-aware meal planning. Saving
// regenerates the plan from the regional food database.
export default function LocalPreferences() {
  const router = useRouter();
  const { profile, updateLocalPreferences, generating } = useAppStore();

  const [region, setRegion] = useState<Region>(profile?.region ?? 'generic');
  const [city, setCity] = useState(profile?.city ?? '');
  const [religion, setReligion] = useState<Religion>(profile?.religion ?? 'none');
  const [skill, setSkill] = useState<NonNullable<OnboardingProfile['cookingSkill']>>(
    profile?.cookingSkill ?? 'basic',
  );

  const save = async () => {
    await updateLocalPreferences({ region, city, religion, cookingSkill: skill });
    router.back();
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Local preferences</Title>
      <Subtitle>
        Set your region to get meals from your local cuisine, matched to your budget
        and cooking time. Saving regenerates your plan.
      </Subtitle>

      <SectionHeader>Region</SectionHeader>
      <ChipGroup<Region>
        value={region}
        onChange={setRegion}
        options={[
          { label: 'General', value: 'generic' },
          { label: 'North India', value: 'north_india' },
          { label: 'South India', value: 'south_india' },
        ]}
      />

      <SectionHeader>City (optional)</SectionHeader>
      <TextInput
        value={city}
        onChangeText={setCity}
        placeholder="e.g. Bengaluru"
        placeholderTextColor={colors.textDim}
        style={styles.input}
      />

      <SectionHeader>Religion / dietary custom</SectionHeader>
      <ChipGroup<Religion>
        value={religion}
        onChange={setReligion}
        options={[
          { label: 'None', value: 'none' },
          { label: 'Hindu', value: 'hindu' },
          { label: 'Muslim', value: 'muslim' },
          { label: 'Jain', value: 'jain' },
          { label: 'Christian', value: 'christian' },
          { label: 'Other', value: 'other' },
        ]}
      />

      <SectionHeader>Cooking skill</SectionHeader>
      <ChipGroup<NonNullable<OnboardingProfile['cookingSkill']>>
        value={skill}
        onChange={setSkill}
        options={[
          { label: 'Basic', value: 'basic' },
          { label: 'Intermediate', value: 'intermediate' },
          { label: 'Advanced', value: 'advanced' },
        ]}
      />

      <View style={{ height: spacing.md }} />
      <Button label="Save & regenerate plan" onPress={save} loading={generating} />
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
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
});
