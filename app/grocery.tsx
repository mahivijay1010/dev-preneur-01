import { useRouter } from 'expo-router';
import {
  Check,
  ChefHat,
  Leaf,
  Search,
  ShoppingBasket,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card, Eyebrow, Field, ProgressRing, Screen, StatusPill, Subtitle } from '@/components/ui';
import { AchievementBurst, AnimatedNumber, DirectionalReveal, Reveal, StaggerText, usePressMotion } from '@/components/motion';
import { Gradient, GlowPulse, ShineSweep } from '@/components/depth';
import { buildGroceryPlan } from '@/engine/grocery';
import { useAppStore } from '@/store/appStore';
import { colors, font, gradients, radius, spacing } from '@/theme';

export default function Grocery() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const { plan, ownedIngredients, setOwnedIngredients } = useAppStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'buy' | 'all'>('buy');
  const grocery = useMemo(() => (plan ? buildGroceryPlan(plan, ownedIngredients) : null), [plan, ownedIngredients]);

  // "Basket complete" celebration — fires once when the last item is checked.
  const [burst, setBurst] = useState(false);
  const wasComplete = useRef(false);
  const complete = !!grocery && grocery.items.length > 0 && grocery.items.every((item) => item.owned);
  useEffect(() => {
    if (complete && !wasComplete.current) setBurst(true);
    wasComplete.current = complete;
  }, [complete]);

  if (!plan || !grocery) {
    return <Screen><PageHeaderFallback /></Screen>;
  }

  const toggleOwned = (ingredient: string, currentlyOwned: boolean) => {
    const lower = ingredient.toLowerCase();
    setOwnedIngredients(currentlyOwned
      ? ownedIngredients.filter((item) => item.toLowerCase() !== lower)
      : [...ownedIngredients, ingredient]);
  };
  const visibleItems = grocery.items.filter((item) => {
    const matches = item.ingredient.toLowerCase().includes(query.trim().toLowerCase());
    return matches && (filter === 'all' || !item.owned);
  });
  const ownedCount = grocery.items.filter((item) => item.owned).length;
  const progress = grocery.items.length ? Math.round((ownedCount / grocery.items.length) * 100) : 0;

  return (
    <>
    <Screen maxWidth={1080}>
      <View style={styles.closeRow}><Pressable accessibilityRole="button" accessibilityLabel="Close grocery list" style={styles.closeButton} onPress={() => router.back()}><X size={20} color={colors.textDim} /></Pressable></View>
      <PageHeader
        title="Your smart grocery list"
        subtitle="Quantities, estimated cost, meal usage, and owned items update from the current seven-day plan."
        count={grocery.items.length}
        compact={compact}
      />

      <Card tone="tinted" style={[styles.hero, compact && styles.heroCompact]}>
        <Gradient colors={gradients.primary} direction="diagonal" opacity={0.12} radius={radius.lg} />
        <GlowPulse color={colors.success} radius={64} intensity={progress >= 80 ? 0.4 : 0.16} style={styles.heroRingGlow}>
          <ProgressRing progress={progress} value={`${ownedCount}/${grocery.items.length}`} label="already owned" size={128} accent={colors.success} gradient={gradients.success} />
        </GlowPulse>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>ESTIMATED BASKET</Text>
          <AnimatedNumber value={grocery.totalCost} prefix="₹" duration={700} style={styles.heroValue} />
          <Text style={styles.heroSub}>after removing ingredients already in your kitchen</Text>
          <View style={styles.heroSignals}>
            <View style={styles.heroSignal}><View><WalletCards size={17} color={colors.primary} /></View><View><AnimatedNumber value={grocery.ownedSavings} prefix="₹" duration={700} style={styles.signalValue} /><Text style={styles.signalLabel}>Saved</Text></View></View>
            <View style={styles.heroSignal}><View><ChefHat size={17} color={colors.peach} /></View><View><Text style={styles.signalValue}>{plan.meals.reduce((count, day) => count + day.items.length, 0)}</Text><Text style={styles.signalLabel}>Meals covered</Text></View></View>
            <View style={styles.heroSignal}><View><Leaf size={17} color={colors.success} /></View><View><Text style={styles.signalValue}>{grocery.wasteTips.length}</Text><Text style={styles.signalLabel}>Waste tips</Text></View></View>
          </View>
        </View>
      </Card>

      <View style={styles.toolbar}>
        <View style={styles.filterTabs}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'buy' }} style={[styles.filterTab, filter === 'buy' && styles.filterTabOn]} onPress={() => setFilter('buy')}><Text style={[styles.filterText, filter === 'buy' && styles.filterTextOn]}>To buy</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === 'all' }} style={[styles.filterTab, filter === 'all' && styles.filterTabOn]} onPress={() => setFilter('all')}><Text style={[styles.filterText, filter === 'all' && styles.filterTextOn]}>All items</Text></Pressable>
        </View>
        <Field containerStyle={styles.searchField} label="Find ingredient" value={query} onChangeText={setQuery} placeholder="Search list" right={<Search size={17} color={colors.textMuted} />} />
      </View>

      <View style={[styles.contentGrid, compact && styles.contentGridCompact]}>
        <View style={styles.listColumn}>
          <View style={styles.listHeader}><Text style={styles.sectionTitle}>{filter === 'buy' ? 'Still to buy' : 'Full shopping list'}</Text><Text style={styles.itemCount}>{visibleItems.length} shown</Text></View>
          {visibleItems.map((item, index) => (
            <GroceryRow
              key={item.ingredient}
              name={item.ingredient}
              quantityNote={item.quantityNote}
              fromMeals={item.fromMeals}
              estCost={item.estCost}
              owned={item.owned}
              delay={index * 40}
              onToggle={() => toggleOwned(item.ingredient, item.owned)}
            />
          ))}
          {!visibleItems.length ? (
            complete ? (
              <Card tone="glass" glow style={styles.completeCard}>
                <View style={styles.completeIcon}><Gradient colors={gradients.success} direction="diagonal" radius={radius.pill} /><View><Check size={24} color={colors.black} strokeWidth={3} /></View></View>
                <StatusPill label="Basket complete" color={colors.success} />
                <Text style={styles.emptyTitle}>Everything for the week is in your kitchen.</Text>
                <Text style={styles.emptySub}>Switch to all items to review the full list.</Text>
              </Card>
            ) : (
              <View style={styles.empty}><Check size={26} color={colors.success} /><Text style={styles.emptyTitle}>Nothing left in this view.</Text><Text style={styles.emptySub}>Switch to all items or clear your search.</Text></View>
            )
          ) : null}
        </View>

        <View style={styles.sideColumn}>
          <DirectionalReveal delay={100}>
            <Card tone="glass">
              <View style={styles.tipHeader}><View style={[styles.tipIcon, { backgroundColor: colors.successDim }]}><ShineSweep interval={8000} /><View><Leaf size={18} color={colors.success} /></View></View><View><Text style={styles.tipEyebrow}>USE MORE, WASTE LESS</Text><Text style={styles.cardTitle}>Storage notes</Text></View></View>
              {grocery.wasteTips.map((tip, index) => <TipRow key={tip} number={index + 1} text={tip} />)}
            </Card>
          </DirectionalReveal>
          <DirectionalReveal delay={200}>
            <Card tone="glass">
              <View style={styles.tipHeader}><View style={[styles.tipIcon, { backgroundColor: colors.peachDim }]}><Sparkles size={18} color={colors.peach} /></View><View><Text style={styles.tipEyebrow}>ONE PREP, MANY MEALS</Text><Text style={styles.cardTitle}>Prep sequence</Text></View></View>
              {grocery.prepSteps.map((step, index) => <TipRow key={step} number={index + 1} text={step} />)}
            </Card>
          </DirectionalReveal>
        </View>
      </View>
    </Screen>
    <AchievementBurst
      visible={burst}
      title="Basket complete"
      detail="WEEK STOCKED"
      onFinished={() => setBurst(false)}
    />
    </>
  );
}

function PageHeader({ title, subtitle, count, compact }: { title: string; subtitle: string; count: number; compact: boolean }) {
  return (
    <Reveal style={[styles.pageHeader, compact && styles.pageHeaderCompact]}>
      <View style={styles.pageHeaderCopy}>
        <Eyebrow>AUTO-BUILT FROM YOUR PLAN</Eyebrow>
        <StaggerText text={title} accentWords={['smart']} style={styles.titleText} />
        <Subtitle>{subtitle}</Subtitle>
      </View>
      <View style={compact ? styles.pageHeaderActionCompact : undefined}>
        <StatusPill label={`${count} ingredients`} color={colors.success} icon={<ShoppingBasket size={13} color={colors.success} />} />
      </View>
    </Reveal>
  );
}

function PageHeaderFallback() {
  return (
    <View style={styles.pageHeaderCopy}>
      <Eyebrow>AUTO-BUILT FROM YOUR PLAN</Eyebrow>
      <Text style={styles.titleText}>Grocery list</Text>
      <Subtitle>Generate a plan first.</Subtitle>
    </View>
  );
}

function GroceryRow({
  name,
  quantityNote,
  fromMeals,
  estCost,
  owned,
  delay,
  onToggle,
}: {
  name: string;
  quantityNote: string;
  fromMeals: number;
  estCost: number;
  owned: boolean;
  delay: number;
  onToggle: () => void;
}) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Reveal delay={delay}>
      <Animated.View style={animatedStyle}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: owned }}
          accessibilityLabel={name}
          onPress={onToggle}
          {...pressHandlers}
          style={({ pressed }) => [styles.item, owned && styles.itemOwned, pressed && styles.itemPressed]}
        >
          <View style={[styles.check, owned && styles.checkOn]}>{owned ? <Check size={16} color={colors.black} strokeWidth={3} /> : null}</View>
          <View style={styles.itemCopy}>
            <Text style={[styles.itemName, owned && styles.struck]}>{name}</Text>
            <View style={styles.itemMetaRow}><Text style={styles.itemMeta}>{quantityNote}</Text><View style={styles.metaDot} /><Text style={styles.itemMeta}>{fromMeals} meal{fromMeals === 1 ? '' : 's'}</Text></View>
          </View>
          <Text style={[styles.itemCost, owned && styles.struck]}>₹{estCost}</Text>
        </Pressable>
      </Animated.View>
    </Reveal>
  );
}

function TipRow({ number, text }: { number: number; text: string }) {
  return <View style={styles.tipRow}><View style={styles.tipNumber}><Text style={styles.tipNumberText}>{number}</Text></View><Text style={styles.tipText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end', marginBottom: -8 },
  closeButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  pageHeaderCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  pageHeaderCopy: { flex: 1, gap: spacing.xs },
  pageHeaderActionCompact: { alignSelf: 'flex-start' },
  titleText: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  hero: { minHeight: 190, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xl, borderRadius: radius.lg, overflow: 'hidden' },
  heroCompact: { padding: spacing.lg, alignItems: 'flex-start' },
  heroRingGlow: { borderRadius: 64 },
  heroCopy: { flex: 1, gap: 3 },
  heroEyebrow: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1.1 },
  heroValue: { color: colors.text, fontSize: 40, fontWeight: '900' },
  heroSub: { color: colors.textDim, fontSize: font.small },
  heroSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.md },
  heroSignal: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  signalValue: { color: colors.text, fontSize: font.small, fontWeight: '900' },
  signalLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase' },
  toolbar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  filterTabs: { flexDirection: 'row', backgroundColor: colors.surfaceSunken, padding: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  filterTab: { minWidth: 90, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: spacing.md },
  filterTabOn: { backgroundColor: colors.primary },
  filterText: { color: colors.textDim, fontSize: font.tiny, fontWeight: '800' },
  filterTextOn: { color: colors.black },
  searchField: { minWidth: 240, flex: 1, maxWidth: 360 },
  contentGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  contentGridCompact: { flexDirection: 'column' },
  listColumn: { flex: 1.25, width: '100%', gap: spacing.sm },
  sideColumn: { flex: 0.75, width: '100%', gap: spacing.md },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  itemCount: { color: colors.textMuted, fontSize: font.tiny },
  item: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  itemOwned: { backgroundColor: colors.successDim, borderColor: colors.success },
  itemPressed: { opacity: 0.76 },
  check: { width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.borderStrong },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  itemCopy: { flex: 1, gap: 4 },
  itemName: { color: colors.text, fontSize: font.small, fontWeight: '800', textTransform: 'capitalize' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemMeta: { color: colors.textMuted, fontSize: font.tiny },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textMuted },
  itemCost: { color: colors.primary, fontSize: font.small, fontWeight: '900' },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.successDim, borderWidth: 1, borderColor: colors.success },
  completeCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  completeIcon: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900', textAlign: 'center' },
  emptySub: { color: colors.textDim, fontSize: font.small, textAlign: 'center' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tipIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tipEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  tipNumber: { width: 26, height: 26, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  tipNumberText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  tipText: { flex: 1, color: colors.textDim, fontSize: font.small, lineHeight: 20 },
});
