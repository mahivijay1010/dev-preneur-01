import { useRouter } from 'expo-router';
import {
  Check,
  ChefHat,
  Globe2,
  MapPin,
  RefreshCw,
  Sparkles,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, ChipGroup, Field, PageHeader, Screen, StatusPill } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { OnboardingProfile, Region, Religion } from '@/types';

const REGIONS: { value: Region; label: string; description: string; icon: typeof Globe2 }[] = [
  { value: 'generic', label: 'Flexible', description: 'A broad, globally familiar meal pool.', icon: Globe2 },
  { value: 'north_india', label: 'North India', description: 'Roti, dal, paneer, rice, and regional staples.', icon: MapPin },
  { value: 'south_india', label: 'South India', description: 'Dosa, idli, rice, sambar, and local staples.', icon: MapPin },
];

export default function LocalPreferences() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const { profile, updateLocalPreferences, generating } = useAppStore();
  const [region, setRegion] = useState<Region>(profile?.region ?? 'generic');
  const [city, setCity] = useState(profile?.city ?? '');
  const [religion, setReligion] = useState<Religion>(profile?.religion ?? 'none');
  const [skill, setSkill] = useState<NonNullable<OnboardingProfile['cookingSkill']>>(profile?.cookingSkill ?? 'basic');

  const save = async () => {
    await updateLocalPreferences({ region, city: city.trim(), religion, cookingSkill: skill });
    router.back();
  };

  const selectedRegion = REGIONS.find((item) => item.value === region)!;

  return (
    <Screen maxWidth={1040}>
      <View style={styles.closeRow}><Pressable accessibilityLabel="Close local preferences" style={styles.closeButton} onPress={() => router.back()}><X size={20} color={colors.textDim} /></Pressable></View>
      <PageHeader
        eyebrow="LOCAL FOOD INTELLIGENCE"
        title="Make the plan feel familiar."
        subtitle="Your location and cultural preferences change the meal pool, while your calorie and protein targets remain stable."
        action={<StatusPill label="Regenerates meals only" color={colors.accent} icon={<RefreshCw size={13} color={colors.accent} />} />}
      />

      <View style={[styles.layout, compact && styles.layoutCompact]}>
        <View style={styles.formColumn}>
          <Card tone="raised">
            <View style={styles.sectionHeading}><View style={styles.sectionIcon}><MapPin size={19} color={colors.primary} /></View><View><Text style={styles.sectionEyebrow}>REGION</Text><Text style={styles.sectionTitle}>Where should meals feel from?</Text></View></View>
            <View style={[styles.regionGrid, compact && styles.regionGridCompact]}>
              {REGIONS.map(({ value, label, description, icon: Icon }) => {
                const active = region === value;
                return (
                  <Pressable key={value} style={[styles.regionCard, active && styles.regionCardOn]} onPress={() => setRegion(value)}>
                    <View style={[styles.regionIcon, active && styles.regionIconOn]}>{active ? <Check size={18} color={colors.black} strokeWidth={3} /> : <Icon size={18} color={colors.textDim} />}</View>
                    <Text style={[styles.regionLabel, active && styles.regionLabelOn]}>{label}</Text>
                    <Text style={[styles.regionDescription, active && styles.regionDescriptionOn]}>{description}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Field label="City" hint="optional" value={city} onChangeText={setCity} placeholder="e.g. Bengaluru" right={<MapPin size={17} color={colors.textMuted} />} />
          </Card>

          <Card tone="raised">
            <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.peachDim }]}><UtensilsCrossed size={19} color={colors.peach} /></View><View><Text style={styles.sectionEyebrow}>CULTURAL FIT</Text><Text style={styles.sectionTitle}>Dietary custom</Text></View></View>
            <Text style={styles.helpText}>Used only to filter incompatible ingredients and meal suggestions.</Text>
            <ChipGroup<Religion>
              value={religion}
              onChange={setReligion}
              options={[
                { label: 'No custom', value: 'none' },
                { label: 'Hindu', value: 'hindu' },
                { label: 'Muslim', value: 'muslim' },
                { label: 'Jain', value: 'jain' },
                { label: 'Christian', value: 'christian' },
                { label: 'Other', value: 'other' },
              ]}
            />
          </Card>

          <Card tone="raised">
            <View style={styles.sectionHeading}><View style={[styles.sectionIcon, { backgroundColor: colors.accentDim }]}><ChefHat size={19} color={colors.accent} /></View><View><Text style={styles.sectionEyebrow}>KITCHEN CONFIDENCE</Text><Text style={styles.sectionTitle}>Cooking skill</Text></View></View>
            <ChipGroup<NonNullable<OnboardingProfile['cookingSkill']>>
              value={skill}
              onChange={setSkill}
              options={[
                { label: 'Basic', value: 'basic' },
                { label: 'Intermediate', value: 'intermediate' },
                { label: 'Advanced', value: 'advanced' },
              ]}
            />
          </Card>
        </View>

        <View style={styles.previewColumn}>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}><View style={styles.previewIcon}><Sparkles size={22} color={colors.black} /></View><StatusPill label="Live preview" color={colors.success} /></View>
            <Text style={styles.previewEyebrow}>MEAL PLAN IMPACT</Text>
            <Text style={styles.previewTitle}>{city.trim() || selectedRegion.label}</Text>
            <Text style={styles.previewSub}>{selectedRegion.description}</Text>
            <View style={styles.previewDivider} />
            <PreviewRow label="Region pool" value={selectedRegion.label} />
            <PreviewRow label="Dietary custom" value={religion === 'none' ? 'No additional filter' : religion} />
            <PreviewRow label="Recipe complexity" value={skill} />
            <PreviewRow label="Cook-time ceiling" value={`${profile?.cookingTimeMin ?? 30} minutes`} />
            <PreviewRow label="Food budget" value={profile?.budget ?? 'medium'} />
            <View style={styles.previewNote}><UtensilsCrossed size={17} color={colors.primary} /><Text style={styles.previewNoteText}>Saving rebuilds the seven-day meal and grocery plan, then syncs it to your account.</Text></View>
          </View>
          <Button label="Save & rebuild meals" icon={<RefreshCw size={17} color={colors.black} />} onPress={() => void save()} loading={generating} />
        </View>
      </View>
    </Screen>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.previewRow}><Text style={styles.previewRowLabel}>{label}</Text><Text style={styles.previewRowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end', marginBottom: -8 },
  closeButton: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  layoutCompact: { flexDirection: 'column' },
  formColumn: { flex: 1.35, width: '100%', gap: spacing.md },
  previewColumn: { flex: 0.65, width: '100%', gap: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  sectionEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: 2 },
  helpText: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  regionGrid: { flexDirection: 'row', gap: spacing.sm },
  regionGridCompact: { flexDirection: 'column' },
  regionCard: { flex: 1, minHeight: 142, padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong },
  regionCardOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  regionIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  regionIconOn: { backgroundColor: 'rgba(9,10,9,0.12)' },
  regionLabel: { color: colors.text, fontSize: font.small, fontWeight: '900' },
  regionLabelOn: { color: colors.black },
  regionDescription: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  regionDescriptionOn: { color: '#3C482C' },
  previewCard: { padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderStrong },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  previewIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  previewEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  previewTitle: { color: colors.text, fontSize: font.h1, fontWeight: '900', marginTop: 5, textTransform: 'capitalize' },
  previewSub: { color: colors.textDim, fontSize: font.small, lineHeight: 20, marginTop: 5 },
  previewDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  previewRow: { minHeight: 38, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  previewRowLabel: { color: colors.textMuted, fontSize: font.tiny },
  previewRowValue: { color: colors.text, fontSize: font.tiny, fontWeight: '800', textTransform: 'capitalize', textAlign: 'right' },
  previewNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginTop: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  previewNoteText: { flex: 1, color: colors.textDim, fontSize: font.tiny, lineHeight: 17 },
});
