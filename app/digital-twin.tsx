import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { buildTwin, recommendTwinAdjustment, type TwinInputs } from '@/engine/digitalTwin';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';
import type { Confidence } from '@/types';

const CONF_COLOR: Record<Confidence, string> = {
  low: colors.textDim,
  medium: colors.warning,
  high: colors.success,
};
const RISK_COLOR = { low: colors.success, moderate: colors.warning, high: colors.danger };

function ConfBadge({ c }: { c: Confidence }) {
  return (
    <View style={[styles.conf, { borderColor: CONF_COLOR[c] }]}>
      <Text style={[styles.confText, { color: CONF_COLOR[c] }]}>{c} confidence</Text>
    </View>
  );
}

// The Digital Twin — a learned model of the individual, plus explainable
// adjustments. This is the long-term differentiator, not the chatbot.
export default function DigitalTwin() {
  const router = useRouter();
  const store = useAppStore();
  const inputs: TwinInputs = {
    logs: store.logs,
    measurements: store.measurements,
    reviews: store.reviews,
    adjustments: store.adjustments,
    profile: store.profile,
    plan: store.plan,
  };

  const twin = useMemo(() => buildTwin(inputs), [store.logs, store.reviews, store.adjustments, store.profile, store.plan, store.measurements]);
  const rec = useMemo(() => recommendTwinAdjustment(inputs), [store.logs, store.reviews, store.adjustments, store.profile, store.plan]);
  const [applied, setApplied] = useState(false);

  const apply = () => {
    store.applyTwinAdjustment(rec);
    setApplied(true);
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Your Digital Twin</Title>
      <Subtitle>
        A model of how your body and habits respond — learned only from what you’ve logged.
        {twin.ready ? '' : ' Keep logging to sharpen it.'}
      </Subtitle>

      {/* Explainable adjustment — the headline */}
      <Card style={{ borderColor: colors.primaryDim }}>
        <View style={styles.rowBetween}>
          <SectionHeader>Recommended adjustment</SectionHeader>
          <ConfBadge c={rec.confidence} />
        </View>
        <Text style={styles.explain}>{rec.explanation}</Text>
        {rec.factors.length > 0 && (
          <View style={styles.factors}>
            {rec.factors.map((f, i) => (
              <Text key={i} style={styles.factor}>• {f}</Text>
            ))}
          </View>
        )}
        {rec.calorieDelta !== 0 && !applied && (
          <Button
            label={`Apply ${rec.calorieDelta > 0 ? '+' : ''}${rec.calorieDelta} kcal to my plan`}
            onPress={apply}
          />
        )}
        {applied && <Text style={styles.applied}>✓ Applied to your plan</Text>}
      </Card>

      {/* Learned model */}
      <SectionHeader>What your twin has learned</SectionHeader>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Maintenance calories</Text>
          <ConfBadge c={twin.maintenanceCalories.confidence} />
        </View>
        <Text style={styles.value}>
          {twin.maintenanceCalories.value !== null ? `~${twin.maintenanceCalories.value} kcal/day` : 'Learning…'}
        </Text>
        <Text style={styles.basis}>{twin.maintenanceCalories.basis}</Text>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Recovery pattern</Text>
          <ConfBadge c={twin.recovery.confidence} />
        </View>
        <Text style={[styles.value, { textTransform: 'capitalize' }]}>{twin.recovery.value.quality}</Text>
        <Text style={styles.basis}>{twin.recovery.basis}</Text>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Strength progression</Text>
          <ConfBadge c={twin.strength.confidence} />
        </View>
        <Text style={[styles.value, { textTransform: 'capitalize' }]}>
          {twin.strength.value.trend === 'up' ? 'Trending up 💪' : twin.strength.value.trend === 'flat' ? 'Holding steady' : 'Unknown'}
        </Text>
        <Text style={styles.basis}>{twin.strength.basis}</Text>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.metric}>Dropout risk</Text>
          <Text style={[styles.riskPill, { color: RISK_COLOR[twin.dropoutRisk.value.level] }]}>
            {twin.dropoutRisk.value.level.toUpperCase()} · {twin.dropoutRisk.value.score}
          </Text>
        </View>
        {twin.dropoutRisk.value.triggers.map((t, i) => (
          <Text key={i} style={styles.basis}>• {t}</Text>
        ))}
      </Card>

      <Card>
        <Text style={styles.metric}>Response to calorie changes</Text>
        <Text style={[styles.value, { textTransform: 'capitalize' }]}>{twin.calorieResponse.value.sensitivity}</Text>
        <Text style={styles.basis}>{twin.calorieResponse.basis}</Text>
      </Card>

      {twin.adherenceDrivers.length > 0 && (
        <Card>
          <SectionHeader>What keeps you consistent</SectionHeader>
          {twin.adherenceDrivers.map((d, i) => (
            <Text key={i} style={styles.driver}>• {d}</Text>
          ))}
        </Card>
      )}

      <Card>
        <Text style={styles.metric}>Preferred coaching style</Text>
        <Text style={[styles.value, { textTransform: 'capitalize' }]}>{twin.preferredCoaching}</Text>
        <Text style={styles.basis}>Change this any time on the Profile tab.</Text>
      </Card>

      <Text style={styles.footer}>
        Modelled from {twin.dataDays} day{twin.dataDays === 1 ? '' : 's'} of your data. Everything here is an
        estimate that improves the more you log.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conf: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  confText: { fontSize: font.tiny, fontWeight: '700', textTransform: 'capitalize' },
  explain: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  factors: { gap: 2 },
  factor: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  applied: { color: colors.success, fontWeight: '700', fontSize: font.small },
  metric: { color: colors.textDim, fontSize: font.small, fontWeight: '600' },
  value: { color: colors.primary, fontSize: font.h3, fontWeight: '800' },
  basis: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  riskPill: { fontWeight: '800', fontSize: font.small },
  driver: { color: colors.text, fontSize: font.small, lineHeight: 21 },
  footer: { color: colors.textDim, fontSize: font.tiny, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.sm },
});
