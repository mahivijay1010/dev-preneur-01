import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionHeader, StatTile, Subtitle, Title } from '@/components/ui';
import { DEMO_CLIENTS, summarizeRoster } from '@/data/demoClients';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { CoachClient } from '@/types';

// B2B coach dashboard — for gyms, trainers, dietitians, and corporate wellness.
// Admin-gated; uses a demo roster to show the concept (production pulls the
// coach's real clients from the backend).
export default function CoachDashboard() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);

  if (user?.role !== 'admin') {
    return (
      <Screen>
        <Title>Coach dashboard</Title>
        <Subtitle>This B2B view requires a coach (admin) account.</Subtitle>
      </Screen>
    );
  }

  const roster = summarizeRoster(DEMO_CLIENTS);
  const sorted = [...DEMO_CLIENTS].sort((a, b) => a.adherence - b.adherence);

  const adherenceColor = (n: number) =>
    n >= 75 ? colors.success : n >= 50 ? colors.warning : colors.danger;

  return (
    <Screen>
      <Text style={styles.badge}>B2B · COACH DASHBOARD</Text>
      <Title>Your clients</Title>
      <Subtitle>Monitor adherence and progress across your roster, and act on safety alerts.</Subtitle>

      <View style={styles.tiles}>
        <StatTile label="Clients" value={`${roster.total}`} />
        <StatTile label="Avg adherence" value={`${roster.avgAdherence}%`} accent={colors.primary} />
        <StatTile label="At risk" value={`${roster.atRisk}`} accent={colors.warning} />
        <StatTile label="Safety alerts" value={`${roster.safetyAlerts}`} accent={colors.danger} />
      </View>

      {roster.safetyAlerts > 0 && (
        <Card style={{ borderColor: colors.danger }}>
          <SectionHeader>Safety alerts</SectionHeader>
          {DEMO_CLIENTS.filter((c) => c.safetyFlag).map((c) => (
            <Text key={c.id} style={styles.alert}>⚠️ {c.name}: {c.safetyFlag}</Text>
          ))}
        </Card>
      )}

      <SectionHeader>Roster (lowest adherence first)</SectionHeader>
      {sorted.map((c: CoachClient) => (
        <Card key={c.id}>
          <View style={styles.clientRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{c.name}</Text>
              <Text style={styles.clientMeta}>
                {c.goal === 'weight_loss' ? 'Weight loss' : 'Muscle gain'} · {c.weeklyWorkouts} workouts ·{' '}
                {c.weightTrendKg > 0 ? '+' : ''}{c.weightTrendKg} kg / mo
              </Text>
              <Text style={styles.clientMeta}>
                {c.lastActiveDays === 0 ? 'Active today' : `Last active ${c.lastActiveDays}d ago`}
              </Text>
              {c.safetyFlag ? <Text style={styles.flag}>⚠️ {c.safetyFlag}</Text> : null}
            </View>
            <View style={styles.adherenceWrap}>
              <Text style={[styles.adherenceNum, { color: adherenceColor(c.adherence) }]}>{c.adherence}</Text>
              <Text style={styles.adherenceLabel}>adherence</Text>
            </View>
          </View>
        </Card>
      ))}

      <Text style={styles.footer}>
        Demo roster. Production connects to your real clients and supports messaging, plan
        edits, and progress monitoring per client.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { color: colors.accent, fontWeight: '800', letterSpacing: 2, fontSize: font.tiny },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  alert: { color: colors.danger, fontSize: font.small, lineHeight: 20 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clientName: { color: colors.text, fontWeight: '700', fontSize: font.body },
  clientMeta: { color: colors.textDim, fontSize: font.tiny },
  flag: { color: colors.warning, fontSize: font.tiny, marginTop: 2 },
  adherenceWrap: { alignItems: 'center' },
  adherenceNum: { fontSize: font.h1, fontWeight: '900' },
  adherenceLabel: { color: colors.textDim, fontSize: font.tiny },
  footer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.sm },
});
