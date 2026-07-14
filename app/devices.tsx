import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, Subtitle, Title } from '@/components/ui';
import { WEARABLES } from '@/services/wearables';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { WearableId } from '@/types';

// Wearables & health platforms. Real providers need native SDKs (unavailable in
// this build) and are shown honestly as such; the simulated device demonstrates
// the full import pipeline.
export default function Devices() {
  const router = useRouter();
  const { connectedWearables, connectWearable, disconnectWearable } = useAppStore();
  const [flash, setFlash] = useState<string | null>(null);

  const connect = (id: WearableId) => {
    const days = connectWearable(id);
    setFlash(days > 0 ? `Imported ${days} days of sample data into your logs.` : null);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Devices & health apps</Title>
      <Subtitle>Import steps, sleep, weight, heart rate, and workouts automatically.</Subtitle>

      {flash && (
        <Card style={{ borderColor: colors.success }}>
          <Text style={{ color: colors.success, fontSize: font.small }}>✓ {flash}</Text>
        </Card>
      )}

      {WEARABLES.map((w) => {
        const connected = connectedWearables.includes(w.id);
        return (
          <Card key={w.id}>
            <View style={styles.row}>
              <Text style={styles.icon}>{w.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{w.name}</Text>
                <Text style={styles.imports}>Imports: {w.imports.join(', ')}</Text>
              </View>
              {connected ? (
                <Pressable style={styles.disconnect} onPress={() => disconnectWearable(w.id)}>
                  <Text style={styles.disconnectText}>Connected ✓</Text>
                </Pressable>
              ) : w.available ? (
                <Pressable style={styles.connect} onPress={() => connect(w.id)}>
                  <Text style={styles.connectText}>Connect</Text>
                </Pressable>
              ) : (
                <View style={styles.unavailable}>
                  <Text style={styles.unavailableText}>Native build</Text>
                </View>
              )}
            </View>
            <Text style={styles.note}>{w.note}</Text>
          </Card>
        );
      })}

      <Text style={styles.disclaimer}>
        Note: wearable active-calorie estimates are imported for reference only — they’re
        notoriously inaccurate, so FitPlan never feeds them directly into your calorie target.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { fontSize: 28 },
  name: { color: colors.text, fontWeight: '700', fontSize: font.body },
  imports: { color: colors.textDim, fontSize: font.tiny },
  connect: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  connectText: { color: colors.bg, fontWeight: '700', fontSize: font.small },
  disconnect: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.success, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  disconnectText: { color: colors.success, fontWeight: '700', fontSize: font.small },
  unavailable: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  unavailableText: { color: colors.textDim, fontWeight: '600', fontSize: font.tiny },
  note: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', lineHeight: 16, marginTop: spacing.sm },
});
