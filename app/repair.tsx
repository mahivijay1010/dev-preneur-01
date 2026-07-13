import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { repairDay, SITUATIONS } from '@/engine/planRepair';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { RepairResult, RepairSituation } from '@/types';

// Plan Repair — the app repairs the day instead of showing failure.
export default function Repair() {
  const router = useRouter();
  const { plan, profile, updateTodayLog } = useAppStore();
  const [result, setResult] = useState<RepairResult | null>(null);

  if (!plan || !profile) {
    return (
      <Screen>
        <Title>Plan Repair</Title>
        <Subtitle>You need an active plan first.</Subtitle>
      </Screen>
    );
  }

  const choose = (s: RepairSituation) => setResult(repairDay(s, plan, profile));

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      {!result ? (
        <>
          <Title>What happened?</Title>
          <Subtitle>
            Life gets in the way. Pick what’s going on and we’ll fix today —
            no guilt, no broken streak.
          </Subtitle>
          <View style={styles.grid}>
            {SITUATIONS.map((s) => (
              <Pressable key={s.key} style={styles.tile} onPress={() => choose(s.key)}>
                <Text style={styles.icon}>{s.icon}</Text>
                <Text style={styles.tileLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <Title>{result.title}</Title>
          <Card>
            <Text style={styles.message}>{result.message}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: result.weeklyTargetSafe ? colors.success : colors.warning },
              ]}
            >
              <Text style={styles.badgeText}>
                {result.weeklyTargetSafe
                  ? '✓ Weekly target still achievable'
                  : '! Weekly target at risk — try not to miss the next one'}
              </Text>
            </View>
          </Card>

          {result.workout && (
            <Card>
              <SectionHeader>{result.workout.focus}</SectionHeader>
              {result.workout.exercises.map((e) => (
                <View key={e.exerciseId} style={styles.exRow}>
                  <Text style={styles.exName}>{e.name}</Text>
                  <Text style={styles.exMeta}>{e.sets}×{e.reps} · rest {e.restSec}s</Text>
                </View>
              ))}
            </Card>
          )}

          {result.mealSwaps && result.mealSwaps.length > 0 && (
            <Card>
              <SectionHeader>Suggested swaps</SectionHeader>
              {result.mealSwaps.map((sw, i) => (
                <Text key={i} style={styles.swap}>
                  {sw.slot}: {sw.from} → <Text style={{ color: colors.primary }}>{sw.to}</Text>
                </Text>
              ))}
            </Card>
          )}

          <Card>
            <SectionHeader>How to handle it</SectionHeader>
            {result.guidance.map((g, i) => (
              <Text key={i} style={styles.guide}>• {g}</Text>
            ))}
          </Card>

          {result.workout && (
            <Button
              label="Mark this session done"
              onPress={() => {
                updateTodayLog({ workoutCompleted: true });
                router.back();
              }}
            />
          )}
          <Button label="Choose something else" variant="ghost" onPress={() => setResult(null)} />
          <Button label="Done" variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '44%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  icon: { fontSize: 26 },
  tileLabel: { color: colors.text, fontWeight: '700', fontSize: font.body },
  message: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  badge: { borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12, marginTop: spacing.sm },
  badgeText: { color: colors.bg, fontWeight: '700', fontSize: font.small },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exName: { color: colors.text, fontSize: font.small, fontWeight: '600', flex: 1 },
  exMeta: { color: colors.textDim, fontSize: font.tiny },
  swap: { color: colors.text, fontSize: font.small, lineHeight: 22, textTransform: 'capitalize' },
  guide: { color: colors.text, fontSize: font.small, lineHeight: 22 },
});
