import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedBorder, GlowPulse, ParticleField } from '@/components/depth';
import { AchievementBurst, AnimatedNumber, Reveal } from '@/components/motion';
import { Button, Card, Divider, InlineNotice, Screen, StatusPill } from '@/components/ui';
import { WEARABLES } from '@/services/wearables';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { WearableId, WearableProviderInfo } from '@/types';

// Wearables & health platforms. Real providers need native SDKs (unavailable in
// this build) and are shown honestly as such; the simulated device demonstrates
// the full import pipeline.
export default function Devices() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const { connectedWearables, connectWearable, disconnectWearable } = useAppStore();
  const [imported, setImported] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  const connect = (id: WearableId) => {
    const days = connectWearable(id);
    if (days > 0) {
      setImported(days);
      setCelebrating(true);
    } else {
      setImported(null);
    }
  };

  const available = WEARABLES.filter((w) => w.available);
  const unavailable = WEARABLES.filter((w) => !w.available);

  return (
    <>
      <Screen maxWidth={1080}>
        <Reveal style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>AUTO-IMPORT</Text>
            <Text style={styles.headerTitle}>
              Your <Text style={styles.accentWord}>devices</Text>, feeding the plan.
            </Text>
            <Text style={styles.headerSubtitle}>Import steps, sleep, weight, heart rate, and workouts automatically.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close devices"
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={21} color={colors.text} />
          </Pressable>
        </Reveal>

        {imported !== null ? (
          <Reveal>
            <InlineNotice tone="success">
              <AnimatedNumber value={imported} prefix="Imported " suffix=" days of sample data into your logs." style={styles.noticeText} />
            </InlineNotice>
          </Reveal>
        ) : null}

        {available.map((w, index) => {
          const connected = connectedWearables.includes(w.id);
          return (
            <Reveal key={w.id} delay={60 + index * 60}>
              <AnimatedBorder radius={radius.md} borderWidth={1.4} speed={9000} fill={colors.primaryDim}>
                <View style={styles.featured}>
                  <ParticleField count={8} colors={[colors.primary, colors.success]} maxSize={3} />
                  <View style={styles.row}>
                    {connected ? (
                      <GlowPulse color={colors.success} radius={radius.md} intensity={0.24}>
                        <View style={[styles.iconWell, styles.iconWellOn]}><Text style={styles.icon}>{w.icon}</Text></View>
                      </GlowPulse>
                    ) : (
                      <View style={styles.iconWell}><Text style={styles.icon}>{w.icon}</Text></View>
                    )}
                    <View style={styles.rowCopy}>
                      <View style={styles.nameRow}>
                        <Text style={styles.name}>{w.name}</Text>
                        {connected ? <StatusPill label="Connected" color={colors.success} /> : <StatusPill label="Ready" color={colors.primary} />}
                      </View>
                      <ImportTags imports={w.imports} />
                    </View>
                  </View>
                  <Text style={styles.note}>{w.note}</Text>
                  {connected ? (
                    <Button label="Connected" variant="secondary" onPress={() => disconnectWearable(w.id)} />
                  ) : (
                    <Button label="Connect" onPress={() => connect(w.id)} />
                  )}
                </View>
              </AnimatedBorder>
            </Reveal>
          );
        })}

        <Divider />
        <Text style={styles.sectionLabel}>NEEDS A NATIVE BUILD</Text>

        <View style={[styles.grid, wide && styles.gridWide]}>
          {unavailable.map((w, index) => (
            <Reveal key={w.id} delay={140 + index * 50} style={[styles.gridItem, wide && styles.gridItemWide]}>
              <Card style={styles.quietCard}>
                <View style={styles.row}>
                  <View style={styles.iconWellQuiet}><Text style={styles.iconQuiet}>{w.icon}</Text></View>
                  <View style={styles.rowCopy}>
                    <View style={styles.nameRow}>
                      <Text style={styles.nameQuiet}>{w.name}</Text>
                      <StatusPill label="Native build" color={colors.textMuted} />
                    </View>
                    <ImportTags imports={w.imports} />
                  </View>
                </View>
                <Text style={styles.note}>{w.note}</Text>
              </Card>
            </Reveal>
          ))}
        </View>

        <Text style={styles.disclaimer}>
          Note: wearable active-calorie estimates are imported for reference only — they’re
          notoriously inaccurate, so FitPlan never feeds them directly into your calorie target.
        </Text>
      </Screen>
      <AchievementBurst
        visible={celebrating}
        title="Device synced"
        detail={imported !== null ? `+${imported} DAYS` : 'SYNCED'}
        onFinished={() => setCelebrating(false)}
      />
    </>
  );
}

function ImportTags({ imports }: { imports: WearableProviderInfo['imports'] }) {
  return (
    <View style={styles.tags}>
      {imports.map((item) => (
        <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  headerTitle: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  accentWord: { color: colors.primary },
  headerSubtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 680 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  noticeText: { color: colors.text, fontSize: font.small, lineHeight: 19, fontWeight: '700' },
  featured: { padding: spacing.lg, gap: spacing.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowCopy: { flex: 1, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  iconWell: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconWellOn: { backgroundColor: colors.successDim, borderColor: colors.success },
  iconWellQuiet: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  iconQuiet: { fontSize: 24, opacity: 0.7 },
  name: { color: colors.text, fontWeight: '800', fontSize: font.body },
  nameQuiet: { color: colors.textDim, fontWeight: '800', fontSize: font.body },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.textDim, fontSize: font.tiny, fontWeight: '600' },
  sectionLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  grid: { gap: spacing.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '100%' },
  gridItemWide: { width: 'auto', flexBasis: '48%', flexGrow: 1 },
  quietCard: { flex: 1, gap: spacing.sm },
  note: { color: colors.textDim, fontSize: font.tiny, lineHeight: 16 },
  disclaimer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', lineHeight: 16, marginTop: spacing.sm },
});
