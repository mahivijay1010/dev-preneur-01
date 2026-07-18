import { useRouter } from 'expo-router';
import {
  Camera,
  Check,
  ChefHat,
  Clock3,
  History,
  Search,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, Card, Eyebrow, Field, ProgressRing, Screen, StatusPill, Subtitle } from '@/components/ui';
import { DirectionalReveal, Reveal, StaggerText, usePressMotion } from '@/components/motion';
import { Gradient, GlowPulse } from '@/components/depth';
import { evaluateDish } from '@/engine/restaurant';
import { useAppStore } from '@/store/appStore';
import { colors, font, glass, gradients, radius, spacing } from '@/theme';
import type { RestaurantEvaluation, RestaurantHistoryItem } from '@/types';

const EXAMPLES = ['Butter chicken with naan', 'Paneer tikka', 'Veg biryani', 'Masala dosa', 'Grilled fish'];

const VERDICT_META: Record<RestaurantEvaluation['verdict'], { label: string; color: string; score: number; message: string }> = {
  great: { label: 'Strong fit', color: colors.success, score: 90, message: 'This works well with your current target.' },
  ok: { label: 'Good with edits', color: colors.warning, score: 65, message: 'A few ordering choices can make this fit better.' },
  occasional: { label: 'Plan around it', color: colors.peach, score: 38, message: 'Enjoy it intentionally and adjust the surrounding meals.' },
};

const VERDICT_ORDER: RestaurantEvaluation['verdict'][] = ['great', 'ok', 'occasional'];

export default function Restaurant() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const { profile, plan, restaurantHistory, addRestaurantEvaluation } = useAppStore();
  const [dish, setDish] = useState('');
  const [result, setResult] = useState<RestaurantEvaluation | null>(null);
  // Bumped per evaluation so the verdict hero re-runs its sweep on every check.
  const [runId, setRunId] = useState(0);

  const run = (value: string) => {
    if (!value.trim() || !profile) return;
    const evaluation = evaluateDish(value, profile);
    setDish(value);
    setResult(evaluation);
    setRunId((id) => id + 1);
    addRestaurantEvaluation(evaluation);
  };

  const verdict = result ? VERDICT_META[result.verdict] : null;

  return (
    <Screen maxWidth={1060}>
      <View style={styles.closeRow}><Pressable accessibilityRole="button" accessibilityLabel="Close restaurant mode" style={styles.closeButton} onPress={() => router.back()}><X size={20} color={colors.textDim} /></Pressable></View>
      <Reveal style={[styles.pageHeader, compact && styles.pageHeaderCompact]}>
        <View style={styles.pageHeaderCopy}>
          <Eyebrow>EAT OUT WITHOUT GUESSING</Eyebrow>
          <StaggerText text="Restaurant mode" accentWords={['Restaurant']} style={styles.titleText} />
          <Subtitle>Check a dish against your real calorie, protein, diet, and goal settings.</Subtitle>
        </View>
        {plan ? (
          <View style={compact ? styles.pageHeaderActionCompact : undefined}>
            <StatusPill label={`${plan.macros.proteinG}g protein target`} color={colors.peach} icon={<Utensils size={13} color={colors.peach} />} />
          </View>
        ) : null}
      </Reveal>

      <Reveal delay={60} style={[styles.searchHero, compact && styles.searchHeroCompact]}>
        <Gradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']} direction="vertical" locations={[0, 0.55]} radius={radius.lg} />
        <View style={styles.searchCopy}>
          <Text style={styles.searchEyebrow}>WHAT ARE YOU THINKING OF ORDERING?</Text>
          <Field label="Dish or meal" value={dish} onChangeText={setDish} placeholder="Try ‘butter chicken with naan’" onSubmitEditing={() => run(dish)} returnKeyType="search" right={<Search size={18} color={colors.textMuted} />} />
          <View style={[styles.searchActions, compact && styles.searchActionsCompact]}>
            <Button label="Evaluate dish" icon={<Sparkles size={17} color={colors.black} />} onPress={() => run(dish)} disabled={!dish.trim()} style={styles.evaluateButton} />
            <Button label="Scan menu" variant="ghost" icon={<Camera size={17} color={colors.text} />} onPress={() => router.push('/menu-scanner')} />
          </View>
        </View>
        <View style={styles.targetPanel}>
          <Gradient colors={gradients.primary} direction="diagonal" opacity={0.08} radius={radius.md} />
          <View><ChefHat size={24} color={colors.primary} /></View>
          <Text style={styles.targetTitle}>Fit, don’t forbid.</Text>
          <Text style={styles.targetText}>You’ll get portion guidance and practical ordering changes, not a red or green food label.</Text>
        </View>
      </Reveal>

      {!result ? (
        <View style={[styles.discoverLayout, compact && styles.discoverLayoutCompact]}>
          <View style={styles.discoverMain}>
            <Text style={styles.sectionLabel}>POPULAR CHECKS</Text>
            <View style={styles.examples}>
              {EXAMPLES.map((example, index) => (
                <ExampleChip key={example} label={example} number={index + 1} tint={EXAMPLE_COLORS[index]} delay={index * 40} onPress={() => run(example)} />
              ))}
            </View>
            {restaurantHistory.length ? (
              <Card>
                <View style={styles.sectionHeader}><View style={styles.sectionTitleRow}><History size={18} color={colors.accent} /><Text style={styles.cardTitle}>Recent checks</Text></View><Text style={styles.historyCount}>{restaurantHistory.length} saved</Text></View>
                <View style={styles.historyGrid}>
                  {restaurantHistory.slice(0, 4).map((item, index) => (
                    <HistoryEntry key={item.id} item={item} delay={index * 50} onPress={() => run(item.dish)} />
                  ))}
                </View>
              </Card>
            ) : null}
          </View>

          <DirectionalReveal delay={140} style={styles.scoreGuideWrap}>
            <Card tone="glass" style={styles.scoreGuide}>
              <Text style={styles.sectionLabel}>HOW THE FIT SCORE WORKS</Text>
              <Text style={styles.cardTitle}>Three verdicts, zero guilt.</Text>
              {VERDICT_ORDER.map((key) => (
                <View key={key} style={styles.tierRow}>
                  <StatusPill label={VERDICT_META[key].label} color={VERDICT_META[key].color} />
                  <Text style={styles.tierText}>{VERDICT_META[key].message}</Text>
                </View>
              ))}
            </Card>
          </DirectionalReveal>
        </View>
      ) : null}

      {result && verdict ? (
        <>
          {/* Signature: the fit-score verdict sweep — the ring counts up to the
              score, a glow in the verdict color breathes behind it, and the
              verdict pill lands as the count settles. */}
          <Reveal key={runId} style={[styles.resultHero, compact && styles.resultHeroCompact]}>
            <Gradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)']} direction="vertical" locations={[0, 0.55]} radius={radius.lg} />
            <GlowPulse color={verdict.color} radius={80} intensity={0.16} style={styles.ringGlow}>
              <ProgressRing progress={verdict.score} value={`${verdict.score}`} label="fit score" size={124} accent={verdict.color} />
            </GlowPulse>
            <DirectionalReveal delay={200} style={styles.resultCopy}>
              <Reveal delay={700} distance={8}>
                <StatusPill label={verdict.label} color={verdict.color} />
              </Reveal>
              <Text style={styles.resultDish}>{result.dish}</Text>
              <Text style={styles.resultMessage}>{verdict.message}</Text>
              <View style={styles.resultStats}>
                <ResultStat label="Calories" value={`${result.estCalories[0]}–${result.estCalories[1]}`} />
                <ResultStat label="Protein" value={`~${result.estProteinG}g`} />
                <ResultStat label="Confidence" value={result.confidence} />
              </View>
            </DirectionalReveal>
          </Reveal>

          <View style={[styles.adviceGrid, compact && styles.adviceGridCompact]}>
            <Reveal delay={80} style={styles.adviceCardWrap}>
              <Card tone="glass" style={styles.adviceCard}>
                <View style={styles.adviceStrip}><Gradient colors={gradients.success} direction="horizontal" /></View>
                <View style={styles.adviceHeader}><View style={[styles.adviceIcon, { backgroundColor: colors.successDim }]}><Check size={18} color={colors.success} /></View><Text style={styles.cardTitle}>Best way to order it</Text></View>
                {result.modifications.map((item, index) => <AdviceRow key={item} number={index + 1} text={item} />)}
              </Card>
            </Reveal>
            <Reveal delay={160} style={styles.adviceCardWrap}>
              <Card tone="glass" style={styles.adviceCard}>
                <View style={styles.adviceStrip}><Gradient colors={gradients.accent} direction="horizontal" /></View>
                <View style={styles.adviceHeader}><View style={[styles.adviceIcon, { backgroundColor: colors.accentDim }]}><Clock3 size={18} color={colors.accent} /></View><Text style={styles.cardTitle}>Portion strategy</Text></View>
                <Text style={styles.portionText}>{result.portionGuidance}</Text>
                <Text style={styles.alternativeLabel}>BETTER ALTERNATIVES</Text>
                {result.betterChoices.map((choice) => <View key={choice} style={styles.alternative}><View style={styles.alternativeDot} /><Text style={styles.alternativeText}>{choice}</Text></View>)}
              </Card>
            </Reveal>
          </View>
          <Text style={styles.disclaimer}>Restaurant estimates vary by recipe and serving size. Use this as decision support, not a precise nutrition label.</Text>
          <Button label="Check another dish" variant="ghost" onPress={() => { setResult(null); setDish(''); }} />
        </>
      ) : null}
    </Screen>
  );
}

const EXAMPLE_COLORS = [colors.primaryDim, colors.peachDim, colors.accentDim, colors.successDim, colors.warningDim];

function ExampleChip({ label, number, tint, delay, onPress }: { label: string; number: number; tint: string; delay: number; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Reveal delay={delay} style={styles.exampleWrap}>
      <Animated.View style={animatedStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Check ${label}`} onPress={onPress} {...pressHandlers} style={({ pressed }) => [styles.example, pressed && styles.pressedItem]}>
          <View style={[styles.exampleNumber, { backgroundColor: tint }]}><Text style={styles.exampleNumberText}>{number}</Text></View>
          <Text style={styles.exampleText}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Reveal>
  );
}

function HistoryEntry({ item, delay, onPress }: { item: RestaurantHistoryItem; delay: number; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Reveal delay={delay} style={styles.historyItemWrap}>
      <Animated.View style={animatedStyle}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Re-check ${item.dish}`} onPress={onPress} {...pressHandlers} style={({ pressed }) => [styles.historyItem, pressed && styles.pressedItem]}>
          <View style={styles.historyCopy}><Text style={styles.historyDish}>{item.dish}</Text><Text style={styles.historyMeta}>{item.estCalories[0]}–{item.estCalories[1]} kcal</Text></View>
          <StatusPill label={VERDICT_META[item.verdict].label} color={VERDICT_META[item.verdict].color} />
        </Pressable>
      </Animated.View>
    </Reveal>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <View style={styles.resultStat}><Text style={styles.resultStatLabel}>{label}</Text><Text style={styles.resultStatValue}>{value}</Text></View>;
}

function AdviceRow({ number, text }: { number: number; text: string }) {
  return <View style={styles.adviceRow}><View style={styles.adviceNumber}><Text style={styles.adviceNumberText}>{number}</Text></View><Text style={styles.adviceText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end', marginBottom: -8 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  pageHeaderCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  pageHeaderCopy: { flex: 1, gap: spacing.xs },
  pageHeaderActionCompact: { alignSelf: 'flex-start' },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  searchHero: { flexDirection: 'row', gap: spacing.lg, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: glass.fill, borderWidth: 1, borderColor: glass.borderStrong, overflow: 'hidden' },
  searchHeroCompact: { flexDirection: 'column', padding: spacing.lg },
  searchCopy: { flex: 1.4, gap: spacing.md },
  searchEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.1 },
  searchActions: { flexDirection: 'row', gap: spacing.sm },
  searchActionsCompact: { flexDirection: 'column' },
  evaluateButton: { flex: 1 },
  targetPanel: { flex: 0.6, minWidth: 220, justifyContent: 'center', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryDim, overflow: 'hidden' },
  targetTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  targetText: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  discoverLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  discoverLayoutCompact: { flexDirection: 'column', alignItems: 'stretch' },
  discoverMain: { flex: 1.3, width: '100%', gap: spacing.md },
  scoreGuideWrap: { flex: 0.7, width: '100%', minWidth: 250 },
  scoreGuide: { gap: spacing.md },
  tierRow: { gap: 6, alignItems: 'flex-start', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  tierText: { color: colors.textDim, fontSize: font.small, lineHeight: 19 },
  sectionLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.1 },
  examples: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  exampleWrap: { flexGrow: 1, flexBasis: 180 },
  example: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressedItem: { opacity: 0.82 },
  exampleNumber: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  exampleNumberText: { color: colors.text, fontSize: font.tiny, fontWeight: '900' },
  exampleText: { flex: 1, color: colors.text, fontSize: font.tiny, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  historyCount: { color: colors.textMuted, fontSize: font.tiny },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyItemWrap: { flexGrow: 1, flexBasis: 210 },
  historyItem: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  historyCopy: { flex: 1 },
  historyDish: { color: colors.text, fontSize: font.tiny, fontWeight: '800', textTransform: 'capitalize' },
  historyMeta: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  resultHero: { minHeight: 190, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xl, borderRadius: radius.lg, backgroundColor: glass.fill, borderWidth: 1, borderColor: glass.borderStrong, overflow: 'hidden' },
  resultHeroCompact: { padding: spacing.lg, alignItems: 'flex-start' },
  ringGlow: { borderRadius: 80 },
  resultCopy: { flex: 1, alignItems: 'flex-start', gap: spacing.sm },
  resultDish: { color: colors.text, fontSize: 30, fontWeight: '900', textTransform: 'capitalize' },
  resultMessage: { color: colors.textDim, fontSize: font.small, lineHeight: 20 },
  resultStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  resultStat: { gap: 2 },
  resultStatLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  resultStatValue: { color: colors.text, fontSize: font.small, fontWeight: '900', textTransform: 'capitalize' },
  adviceGrid: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
  adviceGridCompact: { flexDirection: 'column' },
  adviceCardWrap: { flex: 1 },
  adviceCard: { flex: 1 },
  adviceStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  adviceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  adviceIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  adviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  adviceNumber: { width: 26, height: 26, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  adviceNumberText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  adviceText: { flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20 },
  portionText: { color: colors.text, fontSize: font.small, lineHeight: 21, padding: spacing.md, backgroundColor: colors.accentDim, borderRadius: radius.md },
  alternativeLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: spacing.sm },
  alternative: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  alternativeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  alternativeText: { color: colors.textDim, fontSize: font.small },
  disclaimer: { color: colors.textMuted, fontSize: font.tiny, lineHeight: 17, textAlign: 'center' },
});
