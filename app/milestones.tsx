import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen, Subtitle, Title } from '@/components/ui';
import { computeMilestones } from '@/engine/milestones';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

export default function Milestones() {
  const router = useRouter();
  const { logs, measurements, reviews, repairsCompleted, profile } = useAppStore();

  const milestones = useMemo(
    () => computeMilestones({ logs, measurements, reviews, repairsCompleted, profile }),
    [logs, measurements, reviews, repairsCompleted, profile],
  );
  const achieved = milestones.filter((m) => m.achieved).length;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Milestones</Title>
      <Subtitle>{achieved} of {milestones.length} unlocked. Every one is earned from your real activity.</Subtitle>

      {milestones.map((m) => (
        <View key={m.id} style={[styles.card, m.achieved && styles.cardOn]}>
          <Text style={[styles.icon, !m.achieved && styles.dim]}>{m.achieved ? m.icon : '🔒'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !m.achieved && styles.dimText]}>{m.title}</Text>
            <Text style={styles.desc}>{m.description}</Text>
            {m.achievedHint ? <Text style={styles.hint}>{m.achievedHint}</Text> : null}
          </View>
          {m.achieved && <Text style={styles.done}>✓</Text>}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardOn: { borderColor: colors.success },
  icon: { fontSize: 30 },
  dim: { opacity: 0.5 },
  title: { color: colors.text, fontWeight: '700', fontSize: font.body },
  dimText: { color: colors.textDim },
  desc: { color: colors.textDim, fontSize: font.small },
  hint: { color: colors.primary, fontSize: font.tiny, fontWeight: '600' },
  done: { color: colors.success, fontSize: 22, fontWeight: '900' },
});
