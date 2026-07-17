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
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Card, Field, PageHeader, ProgressRing, Screen, StatusPill } from '@/components/ui';
import { buildGroceryPlan } from '@/engine/grocery';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

export default function Grocery() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 820;
  const { plan, ownedIngredients, setOwnedIngredients } = useAppStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'buy' | 'all'>('buy');
  const grocery = useMemo(() => (plan ? buildGroceryPlan(plan, ownedIngredients) : null), [plan, ownedIngredients]);

  if (!plan || !grocery) {
    return <Screen><PageHeader title="Grocery list" subtitle="Generate a plan first." /></Screen>;
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
    <Screen maxWidth={1080}>
      <View style={styles.closeRow}><Pressable accessibilityLabel="Close grocery list" style={styles.closeButton} onPress={() => router.back()}><X size={20} color={colors.textDim} /></Pressable></View>
      <PageHeader
        eyebrow="AUTO-BUILT FROM YOUR PLAN"
        title="Your smart grocery list"
        subtitle="Quantities, estimated cost, meal usage, and owned items update from the current seven-day plan."
        action={<StatusPill label={`${grocery.items.length} ingredients`} color={colors.success} icon={<ShoppingBasket size={13} color={colors.success} />} />}
      />

      <View style={[styles.hero, compact && styles.heroCompact]}>
        <ProgressRing progress={progress} value={`${ownedCount}/${grocery.items.length}`} label="already owned" size={128} accent={colors.success} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>ESTIMATED BASKET</Text>
          <Text style={styles.heroValue}>₹{grocery.totalCost}</Text>
          <Text style={styles.heroSub}>after removing ingredients already in your kitchen</Text>
          <View style={styles.heroSignals}>
            <HeroSignal icon={<WalletCards size={17} color={colors.primary} />} label="Saved" value={`₹${grocery.ownedSavings}`} />
            <HeroSignal icon={<ChefHat size={17} color={colors.peach} />} label="Meals covered" value={`${plan.meals.reduce((count, day) => count + day.items.length, 0)}`} />
            <HeroSignal icon={<Leaf size={17} color={colors.success} />} label="Waste tips" value={`${grocery.wasteTips.length}`} />
          </View>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.filterTabs}>
          <Pressable style={[styles.filterTab, filter === 'buy' && styles.filterTabOn]} onPress={() => setFilter('buy')}><Text style={[styles.filterText, filter === 'buy' && styles.filterTextOn]}>To buy</Text></Pressable>
          <Pressable style={[styles.filterTab, filter === 'all' && styles.filterTabOn]} onPress={() => setFilter('all')}><Text style={[styles.filterText, filter === 'all' && styles.filterTextOn]}>All items</Text></Pressable>
        </View>
        <Field containerStyle={styles.searchField} label="Find ingredient" value={query} onChangeText={setQuery} placeholder="Search list" right={<Search size={17} color={colors.textMuted} />} />
      </View>

      <View style={[styles.contentGrid, compact && styles.contentGridCompact]}>
        <View style={styles.listColumn}>
          <View style={styles.listHeader}><Text style={styles.sectionTitle}>{filter === 'buy' ? 'Still to buy' : 'Full shopping list'}</Text><Text style={styles.itemCount}>{visibleItems.length} shown</Text></View>
          {visibleItems.map((item) => (
            <Pressable key={item.ingredient} onPress={() => toggleOwned(item.ingredient, item.owned)} style={({ pressed }) => [styles.item, item.owned && styles.itemOwned, pressed && styles.itemPressed]}>
              <View style={[styles.check, item.owned && styles.checkOn]}>{item.owned ? <Check size={16} color={colors.black} strokeWidth={3} /> : null}</View>
              <View style={styles.itemCopy}>
                <Text style={[styles.itemName, item.owned && styles.struck]}>{item.ingredient}</Text>
                <View style={styles.itemMetaRow}><Text style={styles.itemMeta}>{item.quantityNote}</Text><View style={styles.metaDot} /><Text style={styles.itemMeta}>{item.fromMeals} meal{item.fromMeals === 1 ? '' : 's'}</Text></View>
              </View>
              <Text style={[styles.itemCost, item.owned && styles.struck]}>₹{item.estCost}</Text>
            </Pressable>
          ))}
          {!visibleItems.length ? <View style={styles.empty}><Check size={26} color={colors.success} /><Text style={styles.emptyTitle}>Nothing left in this view.</Text><Text style={styles.emptySub}>Switch to all items or clear your search.</Text></View> : null}
        </View>

        <View style={styles.sideColumn}>
          <Card tone="raised">
            <View style={styles.tipHeader}><View style={[styles.tipIcon, { backgroundColor: colors.successDim }]}><Leaf size={18} color={colors.success} /></View><View><Text style={styles.tipEyebrow}>USE MORE, WASTE LESS</Text><Text style={styles.cardTitle}>Storage notes</Text></View></View>
            {grocery.wasteTips.map((tip, index) => <TipRow key={tip} number={index + 1} text={tip} />)}
          </Card>
          <Card tone="raised">
            <View style={styles.tipHeader}><View style={[styles.tipIcon, { backgroundColor: colors.peachDim }]}><Sparkles size={18} color={colors.peach} /></View><View><Text style={styles.tipEyebrow}>ONE PREP, MANY MEALS</Text><Text style={styles.cardTitle}>Prep sequence</Text></View></View>
            {grocery.prepSteps.map((step, index) => <TipRow key={step} number={index + 1} text={step} />)}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function HeroSignal({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View style={styles.heroSignal}>{icon}<View><Text style={styles.signalValue}>{value}</Text><Text style={styles.signalLabel}>{label}</Text></View></View>;
}

function TipRow({ number, text }: { number: number; text: string }) {
  return <View style={styles.tipRow}><View style={styles.tipNumber}><Text style={styles.tipNumberText}>{number}</Text></View><Text style={styles.tipText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  closeRow: { alignItems: 'flex-end', marginBottom: -8 },
  closeButton: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  hero: { minHeight: 190, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: '#52682B' },
  heroCompact: { padding: spacing.lg, alignItems: 'flex-start' },
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
  filterTab: { minWidth: 90, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
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
  itemOwned: { backgroundColor: colors.successDim, borderColor: '#2D5542' },
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
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.successDim, borderWidth: 1, borderColor: '#2D5542' },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  emptySub: { color: colors.textDim, fontSize: font.small },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tipIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tipEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  tipNumber: { width: 26, height: 26, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  tipNumberText: { color: colors.primary, fontSize: font.tiny, fontWeight: '900' },
  tipText: { flex: 1, color: colors.textDim, fontSize: font.small, lineHeight: 20 },
});
