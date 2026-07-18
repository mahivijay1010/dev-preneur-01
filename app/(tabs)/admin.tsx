import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Building2, ShieldCheck } from 'lucide-react-native';

import { AnimatedBorder, Gradient, GlowPulse } from '@/components/depth';
import { AnimatedNumber, Reveal, usePressMotion } from '@/components/motion';
import { Button, Card, PageHeader, ProgressRing, Screen, SectionHeader, StatusPill, Subtitle, Title } from '@/components/ui';
import { EXERCISES } from '@/data/exercises';
import { FOODS } from '@/data/foods';
import { REGIONAL_FOODS } from '@/data/regionalFoods';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';

// Read-only operational overview for catalogs, the current user, plan review,
// and reported safety issues. Account data is backed by the API.
type Section = 'exercises' | 'meals' | 'users' | 'plan' | 'safety';

export default function Admin() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const { user, profile, plan } = useAppStore();
  const [section, setSection] = useState<Section>('exercises');

  if (user?.role !== 'admin') {
    return (
      <Screen>
        <Title>Admin</Title>
        <Subtitle>You need an admin account to view this panel.</Subtitle>
      </Screen>
    );
  }

  const tabs: { key: Section; label: string }[] = [
    { key: 'exercises', label: 'Exercises' },
    { key: 'meals', label: 'Foods' },
    { key: 'users', label: 'Users' },
    { key: 'plan', label: 'Plan review' },
    { key: 'safety', label: 'Safety' },
  ];

  const trainingDays = plan ? plan.workouts.filter((w) => !w.isRest).length : 0;

  return (
    <Screen>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Admin control"
        subtitle="Manage catalogs, review plans, and monitor safety reports."
        action={
          <Button
            label="Coach dashboard"
            variant="ghost"
            icon={<Building2 size={17} color={colors.text} />}
            onPress={() => router.push('/coach-dashboard')}
          />
        }
      />

      <Reveal delay={40}>
        <AnimatedBorder radius={radius.md} borderWidth={1} colors={gradients.primary} speed={14000} style={styles.statusStrip}>
          <View style={styles.statusInner}>
            <GlowPulse color={colors.success} radius={6} intensity={0.6} style={styles.statusDotWrap}>
              <View style={styles.statusDot} />
            </GlowPulse>
            <Text style={styles.statusLabel}>ALL SYSTEMS NOMINAL</Text>
            <View style={styles.statusCounts}>
              <StatusCount value={EXERCISES.length} label="exercises" />
              <Text style={styles.statusSep}>·</Text>
              <StatusCount value={FOODS.length} label="foods" />
              <Text style={styles.statusSep}>·</Text>
              <StatusCount value={1} label="users" />
            </View>
          </View>
        </AnimatedBorder>
      </Reveal>

      <View style={styles.tiles}>
        <TileNum label="Exercises" value={EXERCISES.length} />
        <TileNum label="Foods" value={FOODS.length} accent={colors.accent} />
        <TileNum label="Regional foods" value={REGIONAL_FOODS.length} accent={colors.warning} />
        <TileNum label="Active users" value={user ? 1 : 0} accent={colors.success} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <SectionTab key={t.key} label={t.label} active={section === t.key} onPress={() => setSection(t.key)} />
        ))}
      </View>

      {section === 'exercises' && (
        <View style={styles.grid}>
          {EXERCISES.map((e, index) => (
            <Reveal key={e.id} delay={index * 55} style={[styles.gridItem, wide && styles.gridItemWide]}>
              <Card tone="glass" style={styles.catalogCard}>
                <View style={styles.head}>
                  <Text style={styles.name}>{e.name}</Text>
                  <StatusPill label={e.focus} color={colors.accent} />
                </View>
                <Text style={styles.meta}>
                  {e.defaultSets}×{e.defaultReps} · rest {e.restSec}s · {e.equipment}
                </Text>
                <Text style={styles.body}>{e.instructions}</Text>
              </Card>
            </Reveal>
          ))}
        </View>
      )}

      {section === 'meals' && (
        <View style={styles.grid}>
          {FOODS.map((f, index) => (
            <Reveal key={f.id} delay={index * 55} style={[styles.gridItem, wide && styles.gridItemWide]}>
              <Card tone="glass" style={styles.catalogCard}>
                <View style={styles.head}>
                  <Text style={styles.name}>{f.name}</Text>
                  <StatusPill label={f.slot} color={colors.accent} />
                </View>
                <Text style={styles.meta}>
                  {f.calories} kcal · {f.proteinG}g protein · {f.diets.join(', ')}
                </Text>
                {f.tags.length ? (
                  <View style={styles.tagRow}>
                    {f.tags.map((tag) => (
                      <StatusPill key={tag} label={tag} color={colors.warning} />
                    ))}
                  </View>
                ) : null}
              </Card>
            </Reveal>
          ))}
        </View>
      )}

      {section === 'users' && (
        <Reveal key="users">
          <Card tone="raised">
            <View style={styles.userHead}>
              <View style={styles.avatar}>
                <Gradient colors={gradients.primary} direction="diagonal" radius={24} />
                <View><Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text></View>
              </View>
              <View style={{ flex: 1 }}>
                <SectionHeader>{user.name}</SectionHeader>
                <Text style={styles.meta}>{user.email} · {user.role} · {user.provider}</Text>
                <Text style={styles.meta}>
                  Joined {new Date(user.createdAt).toLocaleDateString()} · consent{' '}
                  {user.consentAcceptedAt ? 'accepted' : 'pending'}
                </Text>
              </View>
            </View>
            {profile && (
              <Text style={styles.body}>
                Goal: {profile.goal} · {profile.currentWeightKg}→{profile.targetWeightKg}kg
              </Text>
            )}
          </Card>
        </Reveal>
      )}

      {section === 'plan' && (
        <Reveal key="plan">
          <Card tone="raised">
            <View style={styles.planHead}>
              <View style={{ flex: 1, gap: 3 }}>
                <SectionHeader>Current plan review</SectionHeader>
                {plan ? (
                  <>
                    <Text style={styles.meta}>
                      {plan.macros.calories} kcal · {plan.macros.proteinG}g protein ·{' '}
                      {plan.personalized ? 'AI-personalized' : 'template-only'}
                    </Text>
                    <Text style={styles.body}>
                      {trainingDays} training days · {plan.meals.length}-day meal plan
                    </Text>
                    <Text style={styles.meta}>Generated {new Date(plan.createdAt).toLocaleString()}</Text>
                  </>
                ) : (
                  <Text style={styles.body}>No plan generated yet.</Text>
                )}
              </View>
              {plan ? (
                <ProgressRing
                  progress={(trainingDays / 7) * 100}
                  value={`${trainingDays}/7`}
                  label="train days"
                  size={64}
                  accent={colors.primary}
                  gradient={gradients.primary}
                />
              ) : null}
            </View>
          </Card>
        </Reveal>
      )}

      {section === 'safety' && (
        <Reveal key="safety">
          <Card tone="tinted" style={styles.safetyCard}>
            <Gradient colors={['rgba(89,212,153,0.14)', 'rgba(89,212,153,0)']} direction="diagonal" radius={radius.md} />
            <View style={styles.safetyHead}>
              <View style={styles.safetyTitleRow}>
                <GlowPulse color={colors.success} radius={6} intensity={0.6} style={styles.statusDotWrap}>
                  <View style={styles.safetyDot} />
                </GlowPulse>
                <SectionHeader>No safety reports</SectionHeader>
              </View>
              <StatusPill label="MONITORING" color={colors.success} icon={<ShieldCheck size={12} color={colors.success} />} />
            </View>
            <Text style={styles.meta}>
              User-submitted reports about exercises or meals will surface here for review.
            </Text>
          </Card>
        </Reveal>
      )}
    </Screen>
  );
}

function SectionTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        {...pressHandlers}
        style={[styles.tab, active && styles.tabOn]}
      >
        <Text style={[styles.tabText, active && styles.tabTextOn]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function TileNum({ label, value, accent = colors.primary }: { label: string; value: number; accent?: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileMarker, { backgroundColor: accent }]} />
      <Text style={styles.tileLabel}>{label}</Text>
      <AnimatedNumber value={value} style={styles.tileValue} />
    </View>
  );
}

function StatusCount({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statusCount}>
      <AnimatedNumber value={value} style={styles.statusCountValue} />
      <Text style={styles.statusCountLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusStrip: { alignSelf: 'stretch' },
  statusInner: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  statusDotWrap: { width: 6, height: 6, borderRadius: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  statusLabel: { color: colors.text, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  statusCounts: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginLeft: 'auto' },
  statusCount: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statusCountValue: { color: colors.primary, fontSize: font.small, fontWeight: '900' },
  statusCountLabel: { color: colors.textMuted, fontSize: font.tiny },
  statusSep: { color: colors.textMuted, fontSize: font.small },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 116,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  tileMarker: { width: 24, height: 3, borderRadius: 2, marginBottom: spacing.sm },
  tileLabel: { color: colors.textDim, fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.8 },
  tileValue: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tab: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textDim, fontWeight: '700', fontSize: font.small },
  tabTextOn: { color: colors.black },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { width: '100%' },
  gridItemWide: { flexBasis: '48%', flexGrow: 1, width: 'auto' },
  catalogCard: { gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontWeight: '700', fontSize: font.body, flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  meta: { color: colors.textDim, fontSize: font.small },
  body: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  userHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitial: { color: colors.black, fontSize: font.h3, fontWeight: '900' },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  safetyCard: { gap: spacing.sm },
  safetyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  safetyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  safetyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
});
