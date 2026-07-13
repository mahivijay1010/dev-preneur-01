import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionHeader, Subtitle, Title } from '@/components/ui';
import { buildGroceryPlan } from '@/engine/grocery';
import { useAppStore } from '@/store/appStore';
import { colors, font, radius, spacing } from '@/theme';

// Weekly grocery plan derived from the current meal plan.
export default function Grocery() {
  const router = useRouter();
  const { plan, ownedIngredients, setOwnedIngredients } = useAppStore();

  const grocery = useMemo(
    () => (plan ? buildGroceryPlan(plan, ownedIngredients) : null),
    [plan, ownedIngredients],
  );

  if (!plan || !grocery) {
    return (
      <Screen>
        <Title>Grocery list</Title>
        <Subtitle>Generate a plan first.</Subtitle>
      </Screen>
    );
  }

  const toggleOwned = (ingredient: string, currentlyOwned: boolean) => {
    const lower = ingredient.toLowerCase();
    if (currentlyOwned) {
      setOwnedIngredients(ownedIngredients.filter((i) => i.toLowerCase() !== lower));
    } else {
      setOwnedIngredients([...ownedIngredients, ingredient]);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <Title>Weekly grocery list</Title>
      <Subtitle>Tap an item to mark it as already owned and exclude it from the cost.</Subtitle>

      <Card>
        <View style={styles.costRow}>
          <View>
            <Text style={styles.costLabel}>Estimated to buy</Text>
            <Text style={styles.costValue}>₹{grocery.totalCost}</Text>
          </View>
          <View>
            <Text style={styles.costLabel}>Saved (owned)</Text>
            <Text style={[styles.costValue, { color: colors.success }]}>₹{grocery.ownedSavings}</Text>
          </View>
        </View>
      </Card>

      <SectionHeader>Shopping list</SectionHeader>
      {grocery.items.map((item) => (
        <Pressable key={item.ingredient} onPress={() => toggleOwned(item.ingredient, item.owned)}>
          <View style={[styles.item, item.owned && styles.itemOwned]}>
            <View style={[styles.check, item.owned && styles.checkOn]}>
              {item.owned ? <Text style={styles.tick}>✓</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, item.owned && styles.struck]}>{item.ingredient}</Text>
              <Text style={styles.itemMeta}>
                {item.quantityNote} · used in {item.fromMeals} meal{item.fromMeals > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={[styles.itemCost, item.owned && styles.struck]}>₹{item.estCost}</Text>
          </View>
        </Pressable>
      ))}

      <Card>
        <SectionHeader>Reduce food waste</SectionHeader>
        {grocery.wasteTips.map((t, i) => (
          <Text key={i} style={styles.tip}>• {t}</Text>
        ))}
      </Card>

      <Card>
        <SectionHeader>Meal-prep plan</SectionHeader>
        {grocery.prepSteps.map((t, i) => (
          <Text key={i} style={styles.tip}>• {t}</Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { color: colors.textDim, fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.5 },
  costValue: { color: colors.primary, fontSize: font.h2, fontWeight: '800' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemOwned: { opacity: 0.6 },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  tick: { color: colors.bg, fontWeight: '900', fontSize: 12 },
  itemName: { color: colors.text, fontWeight: '600', fontSize: font.small, textTransform: 'capitalize' },
  itemMeta: { color: colors.textDim, fontSize: font.tiny },
  itemCost: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  struck: { textDecorationLine: 'line-through', color: colors.textDim },
  tip: { color: colors.text, fontSize: font.small, lineHeight: 21 },
});
