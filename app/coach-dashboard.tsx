import { useRouter } from 'expo-router';
import { LockKeyhole } from 'lucide-react-native';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Gradient, GlowPulse } from '@/components/depth';
import { AnimatedNumber, Reveal } from '@/components/motion';
import { Button, Card, PageHeader, ProgressRing, Screen, SectionHeader, StatusPill } from '@/components/ui';
import { DEMO_CLIENTS, summarizeRoster } from '@/data/demoClients';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';
import type { CoachClient } from '@/types';

// B2B coach dashboard — for gyms, trainers, dietitians, and corporate wellness.
// Admin-gated; uses a demo roster to show the concept (production pulls the
// coach's real clients from the backend).
export default function CoachDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const user = useAppStore((s) => s.user);

  if (user?.role !== 'admin') {
    return (
      <Screen>
        <Reveal style={styles.gate}>
          <Card tone="glass" style={styles.gateCard}>
            <View style={styles.gateIcon}>
              <Gradient colors={gradients.primary} direction="diagonal" radius={26} />
              <View><LockKeyhole size={24} color={colors.black} /></View>
            </View>
            <Text style={styles.gateTitle}>Coach dashboard</Text>
            <Text style={styles.gateBody}>This B2B view requires a coach (admin) account.</Text>
            <Button label="Go back" variant="ghost" onPress={() => router.back()} />
          </Card>
        </Reveal>
      </Screen>
    );
  }

  const roster = summarizeRoster(DEMO_CLIENTS);
  const sorted = [...DEMO_CLIENTS].sort((a, b) => a.adherence - b.adherence);

  const adherenceColor = (n: number) =>
    n >= 75 ? colors.success : n >= 50 ? colors.warning : colors.danger;

  return (
    <Screen>
      <PageHeader
        eyebrow="B2B · COACH DASHBOARD"
        title="Your clients"
        subtitle="Monitor adherence and progress across your roster, and act on safety alerts."
      />

      <View style={styles.tiles}>
        <StatTileNum label="Clients" value={roster.total} />
        <StatTileNum label="Avg adherence" value={roster.avgAdherence} suffix="%" accent={colors.primary} />
        <StatTileNum label="At risk" value={roster.atRisk} accent={colors.warning} />
        <StatTileNum label="Safety alerts" value={roster.safetyAlerts} accent={colors.danger} />
      </View>

      {roster.safetyAlerts > 0 && (
        <Reveal delay={80}>
          <Card tone="tinted" style={styles.alertsCard}>
            <Gradient colors={['rgba(255,120,110,0.16)', 'rgba(255,120,110,0)']} direction="diagonal" radius={radius.md} />
            <View style={styles.alertsHead}>
              <GlowPulse color={colors.danger} radius={7} intensity={0.6} style={styles.alertsDotWrap}>
                <View style={styles.alertsDot} />
              </GlowPulse>
              <SectionHeader>Safety alerts</SectionHeader>
            </View>
            {DEMO_CLIENTS.filter((c) => c.safetyFlag).map((c) => (
              <View key={c.id} style={styles.alertRow}>
                <Text style={styles.alertName}>{c.name}</Text>
                <StatusPill label={c.safetyFlag ?? ''} color={colors.danger} />
              </View>
            ))}
          </Card>
        </Reveal>
      )}

      <SectionHeader>Roster (lowest adherence first)</SectionHeader>
      <View style={styles.roster}>
        {sorted.map((c: CoachClient, index) => (
          <Reveal key={c.id} delay={index * 70} style={[styles.rosterItem, wide && styles.rosterItemWide]}>
            <Card tone="glass" style={styles.clientCard}>
              <View style={styles.clientRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.clientName}>{c.name}</Text>
                  <Text style={styles.clientMeta}>
                    {c.goal === 'weight_loss' ? 'Weight loss' : 'Muscle gain'} · {c.weeklyWorkouts} workouts ·{' '}
                    {c.weightTrendKg > 0 ? '+' : ''}{c.weightTrendKg} kg / mo
                  </Text>
                  <View style={styles.clientPills}>
                    <StatusPill
                      label={c.lastActiveDays === 0 ? 'Active today' : `Last active ${c.lastActiveDays}d ago`}
                      color={c.lastActiveDays === 0 ? colors.success : colors.textDim}
                    />
                    {c.safetyFlag ? <StatusPill label={c.safetyFlag} color={colors.danger} /> : null}
                  </View>
                </View>
                <ProgressRing
                  progress={c.adherence}
                  value={`${c.adherence}`}
                  label="adherence"
                  size={64}
                  accent={adherenceColor(c.adherence)}
                  gradient={
                    c.adherence >= 75 ? gradients.success : c.adherence >= 50 ? gradients.peach : ['#FF9A8F', '#FF786E']
                  }
                />
              </View>
            </Card>
          </Reveal>
        ))}
      </View>

      <Text style={styles.footer}>
        Demo roster. Production connects to your real clients and supports messaging, plan
        edits, and progress monitoring per client.
      </Text>
    </Screen>
  );
}

function StatTileNum({
  label,
  value,
  suffix = '',
  accent = colors.primary,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
}) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileMarker, { backgroundColor: accent }]} />
      <Text style={styles.tileLabel}>{label}</Text>
      <AnimatedNumber value={value} suffix={suffix} style={styles.tileValue} />
    </View>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  gateCard: { maxWidth: 420, alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  gateIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gateTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', textAlign: 'center' },
  gateBody: { color: colors.textDim, fontSize: font.body, lineHeight: 22, textAlign: 'center' },
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
  alertsCard: { gap: spacing.sm },
  alertsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertsDotWrap: { width: 7, height: 7, borderRadius: 4 },
  alertsDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  alertName: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  roster: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rosterItem: { width: '100%' },
  rosterItemWide: { flexBasis: '48%', flexGrow: 1, width: 'auto' },
  clientCard: { justifyContent: 'center' },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientName: { color: colors.text, fontWeight: '700', fontSize: font.body },
  clientMeta: { color: colors.textDim, fontSize: font.tiny },
  clientPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  footer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.sm },
});
