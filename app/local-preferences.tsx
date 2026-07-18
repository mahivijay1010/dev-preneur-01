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
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Gradient, GlowPulse, ParticleField, ShineSweep } from '@/components/depth';
import { AnimatedNumber, DirectionalReveal, Reveal, StaggerText, usePressMotion } from '@/components/motion';
import { Button, Card, ChipGroup, Eyebrow, Field, Screen, StatusPill, Subtitle } from '@/components/ui';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';
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
  // Re-flavor signature: each change to region/religion/skill remounts the keyed
  // reveal + shine sweep so the preview visibly ripples. City is excluded so
  // typing does not restart the animation on every keystroke.
  const changeKey = `${region}-${religion}-${skill}`;

  return (
    <Screen maxWidth={1040}>
      <Reveal style={[styles.header, width < 700 && styles.headerCompact]}>
        <View style={styles.headerCopy}>
          <Eyebrow>LOCAL FOOD INTELLIGENCE</Eyebrow>
          <StaggerText text="Make the plan feel familiar." accentWords={['familiar.']} style={styles.titleText} />
          <Subtitle>Your location and cultural preferences change the meal pool, while your calorie and protein targets remain stable.</Subtitle>
          <View style={styles.headerPill}>
            <StatusPill label="Regenerates meals only" color={colors.accent} icon={<RefreshCw size={13} color={colors.accent} />} />
          </View>
        </View>
        <View style={width < 700 ? styles.headerActionCompact : null}>
          <Pressable accessibilityLabel="Close local preferences" style={styles.closeButton} onPress={() => router.back()}><X size={20} color={colors.text} /></Pressable>
        </View>
      </Reveal>

      {compact ? (
        <Reveal delay={40} style={styles.impactStrip}>
          <StatusPill label={selectedRegion.label} color={colors.primary} />
          <StatusPill label={religion === 'none' ? 'No custom' : religion} color={colors.peach} />
          <StatusPill label={skill} color={colors.accent} />
        </Reveal>
      ) : null}

      <View style={[styles.layout, compact && styles.layoutCompact]}>
        <View style={styles.formColumn}>
          <DirectionalReveal direction={-1} delay={40}>
            <Card tone="raised">
              <View style={styles.sectionHeading}><View style={styles.sectionIcon}><MapPin size={19} color={colors.primary} /></View><View><Text style={styles.sectionEyebrow}>REGION</Text><Text style={styles.sectionTitle}>Where should meals feel from?</Text></View></View>
              <View style={[styles.regionGrid, compact && styles.regionGridCompact]}>
                {REGIONS.map(({ value, label, description, icon: Icon }) => (
                  <RegionCard
                    key={value}
                    active={region === value}
                    label={label}
                    description={description}
                    Icon={Icon}
                    onPress={() => setRegion(value)}
                  />
                ))}
              </View>
              <Field label="City" hint="optional" value={city} onChangeText={setCity} placeholder="e.g. Bengaluru" right={<MapPin size={17} color={colors.textMuted} />} />
            </Card>
          </DirectionalReveal>

          <DirectionalReveal direction={-1} delay={90}>
            <Card tone="raised">
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, styles.sectionIconPeach]}><UtensilsCrossed size={19} color={colors.peach} /></View><View><Text style={styles.sectionEyebrow}>CULTURAL FIT</Text><Text style={styles.sectionTitle}>Dietary custom</Text></View></View>
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
          </DirectionalReveal>

          <DirectionalReveal direction={-1} delay={140}>
            <Card tone="raised">
              <View style={styles.sectionHeading}><View style={[styles.sectionIcon, styles.sectionIconAccent]}><ChefHat size={19} color={colors.accent} /></View><View><Text style={styles.sectionEyebrow}>KITCHEN CONFIDENCE</Text><Text style={styles.sectionTitle}>Cooking skill</Text></View></View>
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
          </DirectionalReveal>
        </View>

        <View style={styles.previewColumn}>
          <DirectionalReveal direction={1} delay={120}>
            <Card tone="glass" glow style={styles.previewCard}>
              <ShineSweep key={changeKey} interval={30000} delay={0} />
              {generating ? <ParticleField count={12} colors={[colors.primary]} /> : null}
              <View style={styles.previewTop}>
                <Gradient colors={gradients.primary} direction="diagonal" opacity={0.12} radius={radius.md} />
                <GlowPulse color={colors.primary} radius={radius.md} intensity={0.35} style={styles.previewIconGlow}>
                  <View style={styles.previewIcon}><View><Sparkles size={22} color={colors.black} /></View></View>
                </GlowPulse>
                <StatusPill label="Live preview" color={colors.success} />
              </View>
              <Reveal key={changeKey} distance={6}>
                <Text style={styles.previewEyebrow}>MEAL PLAN IMPACT</Text>
                <Text style={styles.previewTitle}>{city.trim() || selectedRegion.label}</Text>
                <Text style={styles.previewSub}>{selectedRegion.description}</Text>
                <View style={styles.previewDivider} />
                <PreviewRow label="Region pool" value={selectedRegion.label} />
                <PreviewRow label="Dietary custom" value={religion === 'none' ? 'No additional filter' : religion} />
                <PreviewRow label="Recipe complexity" value={skill} />
                <View style={styles.previewRow}>
                  <Text style={styles.previewRowLabel}>Cook-time ceiling</Text>
                  <AnimatedNumber value={profile?.cookingTimeMin ?? 30} suffix=" minutes" style={styles.previewRowValue} />
                </View>
                <PreviewRow label="Food budget" value={profile?.budget ?? 'medium'} />
              </Reveal>
              <View style={styles.previewNote}><View><UtensilsCrossed size={17} color={colors.primary} /></View><Text style={styles.previewNoteText}>Saving rebuilds the seven-day meal and grocery plan, then syncs it to your account.</Text></View>
            </Card>
          </DirectionalReveal>
          <Button label="Save & rebuild meals" icon={<RefreshCw size={17} color={colors.black} />} onPress={() => void save()} loading={generating} />
        </View>
      </View>
    </Screen>
  );
}

function RegionCard({ active, label, description, Icon, onPress }: { active: boolean; label: string; description: string; Icon: typeof Globe2; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={[styles.regionCardWrap, animatedStyle]}>
      <Pressable style={[styles.regionCard, active && styles.regionCardOn]} onPress={onPress} {...pressHandlers}>
        <View style={[styles.regionIcon, active && styles.regionIconOn]}>{active ? <Check size={18} color={colors.black} strokeWidth={3} /> : <Icon size={18} color={colors.textDim} />}</View>
        <Text style={[styles.regionLabel, active && styles.regionLabelOn]}>{label}</Text>
        <Text style={styles.regionDescription}>{description}</Text>
      </Pressable>
    </Animated.View>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.previewRow}><Text style={styles.previewRowLabel}>{label}</Text><Text style={styles.previewRowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  headerCopy: { flex: 1, gap: spacing.xs },
  headerActionCompact: { alignSelf: 'flex-start' },
  headerPill: { flexDirection: 'row', marginTop: spacing.xs },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong },
  impactStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  layoutCompact: { flexDirection: 'column' },
  formColumn: { flex: 1.35, width: '100%', gap: spacing.md },
  previewColumn: { flex: 0.65, width: '100%', gap: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  sectionIconPeach: { backgroundColor: colors.peachDim },
  sectionIconAccent: { backgroundColor: colors.accentDim },
  sectionEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: 2 },
  helpText: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  regionGrid: { flexDirection: 'row', gap: spacing.sm },
  regionGridCompact: { flexDirection: 'column' },
  regionCardWrap: { flex: 1 },
  regionCard: { minHeight: 142, padding: spacing.md, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong },
  regionCardOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 1.5 },
  regionIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  regionIconOn: { backgroundColor: colors.primary },
  regionLabel: { color: colors.text, fontSize: font.small, fontWeight: '900' },
  regionLabelOn: { color: colors.primary },
  regionDescription: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  previewCard: { padding: spacing.xl },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  previewIconGlow: { borderRadius: radius.md },
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
