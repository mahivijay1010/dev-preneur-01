import { useRouter } from 'expo-router';
import { LockKeyhole, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AnimatedBorder, Gradient, GlowPulse, ShineSweep } from '@/components/depth';
import { AchievementBurst, Reveal, StaggerText } from '@/components/motion';
import { Card, ProgressRing, Screen, StatusPill } from '@/components/ui';
import { computeMilestones } from '@/engine/milestones';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';

// Parses engine hints like "3/5" or "12/28 day streak" into a 0-100 pct.
// Fails soft (null) for undefined or non "n/m" strings so hints always render.
function hintProgress(hint?: string): number | null {
  if (!hint) return null;
  const match = hint.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const numerator = parseFloat(match[1]);
  const denominator = parseFloat(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
}

export default function Milestones() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const { logs, measurements, reviews, repairsCompleted, profile } = useAppStore();

  const milestones = useMemo(
    () => computeMilestones({ logs, measurements, reviews, repairsCompleted, profile }),
    [logs, measurements, reviews, repairsCompleted, profile],
  );
  const achieved = milestones.filter((m) => m.achieved).length;
  const latestAchieved = useMemo(
    () => [...milestones].reverse().find((m) => m.achieved) ?? null,
    [milestones],
  );
  const [celebrating, setCelebrating] = useState(achieved > 0);

  const heroTitle = achieved === 0
    ? 'Your first marker is closer than you think.'
    : achieved === milestones.length
      ? 'Every marker earned. Keep stacking proof.'
      : 'Proof stacks up one earned marker at a time.';

  return (
    <>
    <Screen maxWidth={1080}>
      <Reveal style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>EARNED, NOT GIVEN</Text>
          <StaggerText
            text="Every milestone is earned."
            accentWords={['earned.']}
            style={styles.headerTitle}
          />
          <Text style={styles.headerSubtitle}>
            {achieved} of {milestones.length} unlocked. Every one is earned from your real activity.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close milestones"
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={21} color={colors.text} />
        </Pressable>
      </Reveal>

      <Card tone="glass" style={[styles.hero, !wide && styles.heroStack]}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>TROPHY WALL</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroBody}>
            Milestones unlock only from logged activity — no streak freezes, no shortcuts. The ring fills as your real behavior does.
          </Text>
        </View>
        <GlowPulse color={colors.primary} radius={64} intensity={0.12} style={styles.heroRing}>
          <ProgressRing
            progress={milestones.length ? (achieved / milestones.length) * 100 : 0}
            value={`${achieved}/${milestones.length}`}
            label="unlocked"
            size={128}
            gradient={gradients.primary}
          />
        </GlowPulse>
      </Card>

      <View style={[styles.grid, wide && styles.gridWide]}>
        {milestones.map((m, index) => {
          const pct = hintProgress(m.achievedHint);
          const charging = !m.achieved && pct !== null && pct > 0;
          const chargeAlpha = Math.round(56 + ((pct ?? 0) / 100) * 150)
            .toString(16)
            .padStart(2, '0');

          const card = (
            <Card
              tone={m.achieved ? 'tinted' : 'raised'}
              glow={m.achieved}
              style={[styles.card, charging && styles.cardCharging]}
            >
              {m.achieved ? <ShineSweep interval={6400} delay={700 + index * 260} /> : null}
              <View style={styles.cardRow}>
                {m.achieved ? (
                  <GlowPulse color={colors.success} radius={radius.md} intensity={0.28}>
                    <View style={[styles.iconWell, styles.iconWellOn]}>
                      <Text style={styles.iconGlyph}>{m.icon}</Text>
                    </View>
                  </GlowPulse>
                ) : (
                  <View style={styles.iconWell}>
                    <LockKeyhole size={18} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, !m.achieved && styles.cardTitleLocked]}>{m.title}</Text>
                  <Text style={styles.cardDesc}>{m.description}</Text>
                </View>
                {m.achieved ? <StatusPill label="Unlocked" color={colors.success} /> : null}
              </View>
              {!m.achieved && m.achievedHint ? (
                <View style={styles.trackRow}>
                  {pct !== null ? (
                    <View style={styles.track}>
                      <View style={[styles.trackFill, { width: `${Math.max(pct, 2)}%` }]}>
                        <Gradient colors={gradients.primary} direction="horizontal" radius={2} />
                      </View>
                    </View>
                  ) : null}
                  <Text style={styles.hint}>{m.achievedHint}</Text>
                </View>
              ) : null}
            </Card>
          );

          return (
            <Reveal key={m.id} delay={90 + index * 60} style={[styles.gridItem, wide && styles.gridItemWide]}>
              {charging ? (
                <AnimatedBorder
                  radius={radius.md}
                  borderWidth={1.2}
                  speed={9200}
                  fill="transparent"
                  colors={[
                    `${colors.primary}00`,
                    `${colors.primary}${chargeAlpha}`,
                    `${colors.primaryDim}66`,
                    `${colors.primary}00`,
                  ]}
                >
                  {card}
                </AnimatedBorder>
              ) : (
                card
              )}
            </Reveal>
          );
        })}
      </View>
    </Screen>
    <AchievementBurst
      visible={celebrating && latestAchieved !== null}
      title={latestAchieved ? latestAchieved.title : 'Milestone unlocked'}
      detail="UNLOCKED"
      onFinished={() => setCelebrating(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.4 },
  headerTitle: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  headerSubtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 680 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xl },
  heroStack: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.xs, minWidth: 220 },
  heroEyebrow: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900', lineHeight: 28 },
  heroBody: { color: colors.textDim, fontSize: font.small, lineHeight: 20, maxWidth: 520 },
  heroRing: { alignSelf: 'center', borderRadius: 64 },
  grid: { gap: spacing.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { width: '100%' },
  gridItemWide: { width: 'auto', flexBasis: '48%', flexGrow: 1 },
  card: { flex: 1, gap: spacing.md },
  cardCharging: { borderColor: 'transparent' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWell: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconWellOn: { backgroundColor: colors.successDim, borderColor: colors.success },
  iconGlyph: { fontSize: 22 },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: font.body },
  cardTitleLocked: { color: colors.textDim },
  cardDesc: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  trackFill: { height: 3, borderRadius: 2, overflow: 'hidden' },
  hint: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
});
