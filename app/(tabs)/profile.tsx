import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, ChipGroup, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { isAIEnabled } from '@/services/claude';
import {
  DEFAULT_REMINDERS,
  requestPermission,
  syncReminders,
  type ReminderPrefs,
} from '@/services/notifications';
import { getJSON, setJSON } from '@/services/storage';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { CoachTone } from '@/types';

const PREFS_KEY = 'fitplan-reminders-v1';

export default function Profile() {
  const router = useRouter();
  const { user, profile, plan, regenerate, generating, signOut, setCoachTone } = useAppStore();
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDERS);

  useEffect(() => {
    getJSON<ReminderPrefs>(PREFS_KEY).then((p) => p && setPrefs(p));
  }, []);

  const persist = async (next: ReminderPrefs) => {
    setPrefs(next);
    await setJSON(PREFS_KEY, next);
    await syncReminders(next);
  };

  const toggleReminders = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await persist({ ...prefs, enabled });
  };

  const bump = (key: 'workoutHour' | 'mealHour' | 'weightHour') => {
    const next = { ...prefs, [key]: (prefs[key] + 1) % 24 };
    void persist(next);
  };

  return (
    <Screen>
      <Title>Profile</Title>
      <Subtitle>{user?.name} · {user?.email}</Subtitle>

      <Card>
        <SectionHeader>Your setup</SectionHeader>
        {profile && (
          <>
            <Row k="Goal" v={profile.goal === 'weight_loss' ? 'Weight loss' : 'Muscle gain'} />
            <Row k="Current → Target" v={`${profile.currentWeightKg} → ${profile.targetWeightKg} kg`} />
            <Row k="Training" v={`${profile.location} · ${profile.workoutDays.length} days/wk`} />
            <Row k="Diet" v={profile.dietType} />
            <Row k="Coach tone" v={profile.coachTone} />
            <Row k="AI personalization" v={isAIEnabled() ? 'On' : 'Off (offline templates)'} />
          </>
        )}
      </Card>

      {profile && (
        <Card>
          <SectionHeader>Coaching personality</SectionHeader>
          <Text style={styles.dim}>Only the tone changes — your plan and advice stay the same.</Text>
          <ChipGroup<CoachTone>
            value={profile.coachTone}
            onChange={setCoachTone}
            options={[
              { label: 'Supportive', value: 'supportive' },
              { label: 'Direct', value: 'direct' },
              { label: 'Scientific', value: 'scientific' },
              { label: 'Minimal', value: 'minimal' },
              { label: 'Competitive', value: 'competitive' },
            ]}
          />
        </Card>
      )}

      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <SectionHeader>Reminders</SectionHeader>
            <Text style={styles.dim}>Workout, meal, weigh-in & weekly summary.</Text>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={toggleReminders}
            trackColor={{ true: colors.primaryDim, false: colors.border }}
            thumbColor={prefs.enabled ? colors.primary : colors.textDim}
          />
        </View>
        {prefs.enabled && (
          <View style={{ gap: spacing.xs }}>
            <TimeRow label="Weigh-in" hour={prefs.weightHour} onPress={() => bump('weightHour')} />
            <TimeRow label="Meals" hour={prefs.mealHour} onPress={() => bump('mealHour')} />
            <TimeRow label="Workout" hour={prefs.workoutHour} onPress={() => bump('workoutHour')} />
          </View>
        )}
      </Card>

      <Button label="⌚ Devices & health apps" variant="ghost" onPress={() => router.push('/devices')} />
      <Button label="🩺 Expert support" variant="ghost" onPress={() => router.push('/experts')} />

      <Button
        label="Regenerate my plan"
        variant="ghost"
        loading={generating}
        onPress={() => regenerate()}
      />
      <Button
        label="Edit onboarding"
        variant="ghost"
        onPress={() => router.push('/onboarding')}
      />
      <Button
        label="Sign out"
        variant="danger"
        onPress={() => {
          signOut();
          router.replace('/(auth)/login');
        }}
      />

      <Text style={styles.footer}>FitPlan · Phase 1 MVP · {plan ? 'plan active' : 'no plan'}</Text>
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.dim}>{k}</Text>
      <Text style={styles.val}>{v}</Text>
    </View>
  );
}

function TimeRow({ label, hour, onPress }: { label: string; hour: number; onPress: () => void }) {
  return (
    <Pressable style={styles.timeRow} onPress={onPress}>
      <Text style={styles.dim}>{label}</Text>
      <Text style={styles.time}>{String(hour).padStart(2, '0')}:00</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  dim: { color: colors.textDim, fontSize: font.small },
  val: { color: colors.text, fontSize: font.small, fontWeight: '600', textTransform: 'capitalize' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  time: { color: colors.primary, fontWeight: '700', fontSize: font.body },
  footer: { color: colors.textDim, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.md },
});
