import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button, Card, Screen, SectionHeader, StatTile, Subtitle, Title } from '@/components/ui';
import { EXERCISES } from '@/data/exercises';
import { FOODS } from '@/data/foods';
import { REGIONAL_FOODS } from '@/data/regionalFoods';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

// Read-only admin overview for Phase 1: exercise/meal/food catalogs, the
// current user, plan review, and a placeholder for reported safety issues.
// Editing/CRUD lands in a later iteration against a real backend.
type Section = 'exercises' | 'meals' | 'users' | 'plan' | 'safety';

export default function Admin() {
  const router = useRouter();
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

  return (
    <Screen>
      <Title>Admin panel</Title>
      <Subtitle>Manage catalogs, review plans, and monitor safety reports.</Subtitle>

      <Button label="🏢 Open B2B coach dashboard" variant="ghost" onPress={() => router.push('/coach-dashboard')} />

      <View style={styles.tiles}>
        <StatTile label="Exercises" value={`${EXERCISES.length}`} />
        <StatTile label="Foods" value={`${FOODS.length}`} accent={colors.accent} />
        <StatTile label="Regional foods" value={`${REGIONAL_FOODS.length}`} accent={colors.warning} />
        <StatTile label="Active users" value={user ? '1' : '0'} accent={colors.success} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setSection(t.key)}
            style={[styles.tab, section === t.key && styles.tabOn]}
          >
            <Text style={[styles.tabText, section === t.key && { color: colors.bg }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {section === 'exercises' &&
        EXERCISES.map((e) => (
          <Card key={e.id}>
            <View style={styles.head}>
              <Text style={styles.name}>{e.name}</Text>
              <Text style={styles.badge}>{e.focus}</Text>
            </View>
            <Text style={styles.meta}>
              {e.defaultSets}×{e.defaultReps} · rest {e.restSec}s · {e.equipment}
            </Text>
            <Text style={styles.body}>{e.instructions}</Text>
          </Card>
        ))}

      {section === 'meals' &&
        FOODS.map((f) => (
          <Card key={f.id}>
            <View style={styles.head}>
              <Text style={styles.name}>{f.name}</Text>
              <Text style={styles.badge}>{f.slot}</Text>
            </View>
            <Text style={styles.meta}>
              {f.calories} kcal · {f.proteinG}g protein · {f.diets.join(', ')}
            </Text>
            {f.tags.length ? <Text style={styles.tags}>allergens: {f.tags.join(', ')}</Text> : null}
          </Card>
        ))}

      {section === 'users' && (
        <Card>
          <SectionHeader>{user.name}</SectionHeader>
          <Text style={styles.meta}>{user.email} · {user.role} · {user.provider}</Text>
          <Text style={styles.meta}>
            Joined {new Date(user.createdAt).toLocaleDateString()} · consent{' '}
            {user.consentAcceptedAt ? 'accepted' : 'pending'}
          </Text>
          {profile && (
            <Text style={styles.body}>
              Goal: {profile.goal} · {profile.currentWeightKg}→{profile.targetWeightKg}kg
            </Text>
          )}
        </Card>
      )}

      {section === 'plan' && (
        <Card>
          <SectionHeader>Current plan review</SectionHeader>
          {plan ? (
            <>
              <Text style={styles.meta}>
                {plan.macros.calories} kcal · {plan.macros.proteinG}g protein ·{' '}
                {plan.personalized ? 'AI-personalized' : 'template-only'}
              </Text>
              <Text style={styles.body}>
                {plan.workouts.filter((w) => !w.isRest).length} training days ·{' '}
                {plan.meals.length}-day meal plan
              </Text>
              <Text style={styles.meta}>Generated {new Date(plan.createdAt).toLocaleString()}</Text>
            </>
          ) : (
            <Text style={styles.body}>No plan generated yet.</Text>
          )}
        </Card>
      )}

      {section === 'safety' && (
        <Card>
          <SectionHeader>Reported safety issues</SectionHeader>
          <Text style={styles.body}>No safety reports. 🎉</Text>
          <Text style={styles.meta}>
            User-submitted reports about exercises or meals will surface here for review.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textDim, fontWeight: '700', fontSize: font.small },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.text, fontWeight: '700', fontSize: font.body, flex: 1 },
  badge: {
    color: colors.bg,
    backgroundColor: colors.accent,
    fontSize: font.tiny,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    textTransform: 'uppercase',
  },
  meta: { color: colors.textDim, fontSize: font.small },
  body: { color: colors.text, fontSize: font.small, lineHeight: 20 },
  tags: { color: colors.warning, fontSize: font.tiny },
});
