// Reusable UI primitives shared across screens.

import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, font, radius, spacing } from '../theme';

export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function SectionHeader({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        (pressed || isDisabled) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.text} />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === 'primary' && { color: colors.bg },
            variant === 'danger' && { color: colors.text },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// Horizontal/wrapping selectable chips. Supports single or multi select.
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: { label: string; value: T }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multi?: boolean;
}) {
  const selected = (v: T) =>
    multi ? Array.isArray(value) && value.includes(v) : value === v;
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          style={[styles.chip, selected(o.value) && styles.chipActive]}
        >
          <Text
            style={[styles.chipText, selected(o.value) && styles.chipTextActive]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent = colors.primary,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color: accent }]}>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 21 },
  section: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  btn: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnGhost: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textDim, fontWeight: '600', fontSize: font.small },
  chipTextActive: { color: colors.bg },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  tileLabel: { color: colors.textDim, fontSize: font.tiny, textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontSize: font.h2, fontWeight: '800' },
  tileSub: { color: colors.textDim, fontSize: font.tiny },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
