import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { AnimatedNumber, EnergyLoader, Reveal, SpatialBackdrop, usePressMotion, useReducedMotion } from './motion';
import { colors, font, radius, shadow, spacing } from '../theme';

export function Screen({
  children,
  scroll = true,
  maxWidth = 1180,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={[styles.shell, { maxWidth }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SpatialBackdrop />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.staticContent}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
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

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  return (
    <Reveal style={[styles.pageHeader, compact && styles.pageHeaderCompact]}>
      <View style={styles.pageHeaderCopy}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Title>{title}</Title>
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </View>
      {action ? <View style={[styles.pageHeaderAction, compact && styles.pageHeaderActionCompact]}>{action}</View> : null}
    </Reveal>
  );
}

export function Card({
  children,
  style,
  tone = 'default',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'raised' | 'tinted';
}) {
  return (
    <Reveal
      style={[
        styles.card,
        tone === 'raised' && styles.cardRaised,
        tone === 'tinted' && styles.cardTinted,
        style,
      ]}
    >
      {children}
    </Reveal>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const { animatedStyle, pressHandlers } = usePressMotion(isDisabled);
  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={isDisabled}
        {...pressHandlers}
        style={({ pressed }) => [
          styles.btn,
          variant === 'primary' && styles.btnPrimary,
          variant === 'secondary' && styles.btnSecondary,
          variant === 'ghost' && styles.btnGhost,
          variant === 'danger' && styles.btnDanger,
          pressed && !isDisabled && styles.btnPressed,
          isDisabled && styles.btnDisabled,
        ]}
      >
        {loading ? (
          <EnergyLoader dark={variant === 'primary'} />
        ) : (
          <View style={styles.btnContent}>
            {icon}
            <Text style={[styles.btnText, variant === 'primary' && styles.btnTextPrimary]}>
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Field({
  label,
  hint,
  error,
  right,
  containerStyle,
  inputStyle,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      </View>
      <View
        style={[
          styles.inputFrame,
          focused && !error && styles.inputFrameFocused,
          Boolean(error) && styles.inputFrameError,
          inputStyle,
        ]}
      >
        <TextInput
          {...props}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          style={[styles.input, props.multiline && styles.inputMultiline, webInputReset]}
          placeholderTextColor={colors.textMuted}
        />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

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
      {options.map((option) => {
        const active = selected(option.value);
        return <MotionChip key={String(option.value)} label={option.label} active={active} onPress={() => onChange(option.value)} />;
      })}
    </View>
  );
}

function MotionChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { animatedStyle, pressHandlers } = usePressMotion();
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={onPress}
        {...pressHandlers}
        style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
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
      <View style={[styles.tileMarker, { backgroundColor: accent }]} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

export function ProgressRing({
  progress,
  value,
  label,
  size = 116,
  accent = colors.primary,
}: {
  progress: number;
  value: string;
  label?: string;
  size?: number;
  accent?: string;
}) {
  const stroke = Math.max(7, Math.round(size * 0.075));
  const radiusValue = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const safe = Math.max(0, Math.min(100, progress));
  const ringProgress = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(0);
  const reduced = useReducedMotion();
  const parsed = value.match(/^([\d.]+)(.*)$/);

  useEffect(() => {
    const listener = ringProgress.addListener(({ value: next }) => setDisplayProgress(next));
    if (reduced) ringProgress.setValue(safe);
    else {
      Animated.spring(ringProgress, {
        toValue: safe,
        damping: 18,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: false,
      }).start();
    }
    return () => ringProgress.removeListener(listener);
  }, [reduced, ringProgress, safe]);

  const animatedOffset = circumference - (circumference * displayProgress) / 100;

  return (
    <Reveal distance={8} style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.ringSvg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          fill="none"
          stroke={colors.surfaceMuted}
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCopy}>
        {parsed ? (
          <AnimatedNumber
            value={Number(parsed[1])}
            suffix={parsed[2]}
            decimals={parsed[1].includes('.') ? 1 : 0}
            style={[styles.ringValue, size < 90 && styles.ringValueSmall]}
          />
        ) : <Text style={[styles.ringValue, size < 90 && styles.ringValueSmall]}>{value}</Text>}
        {label ? <Text style={styles.ringLabel}>{label}</Text> : null}
      </View>
    </Reveal>
  );
}

export function StatusPill({
  label,
  color = colors.primary,
  icon,
}: {
  label: string;
  color?: string;
  icon?: ReactNode;
}) {
  return (
    <View style={[styles.statusPill, { borderColor: `${color}66`, backgroundColor: `${color}14` }]}>
      {icon}
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function InlineNotice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'danger' | 'success';
}) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'danger' && styles.noticeDanger,
        tone === 'success' && styles.noticeSuccess,
      ]}
    >
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

const webInputReset = Platform.OS === 'web'
  ? ({ outlineStyle: 'none', outlineWidth: 0, boxShadow: 'none' } as any)
  : null;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 96 },
  staticContent: { flex: 1 },
  shell: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: font.tiny,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800', lineHeight: 36 },
  subtitle: { color: colors.textDim, fontSize: font.body, lineHeight: 22, maxWidth: 680 },
  section: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginTop: spacing.xs },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  pageHeaderCompact: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.sm },
  pageHeaderCopy: { flex: 1, gap: spacing.xs },
  pageHeaderAction: { flexShrink: 0 },
  pageHeaderActionCompact: { alignSelf: 'flex-start' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardRaised: { backgroundColor: colors.bgElevated, borderColor: colors.borderStrong, ...shadow.card },
  cardTinted: { backgroundColor: colors.primaryDim, borderColor: '#5C702C' },
  btn: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.glow },
  btnSecondary: { backgroundColor: colors.text, borderColor: colors.text },
  btnGhost: { backgroundColor: colors.surfaceAlt, borderColor: colors.borderStrong },
  btnDanger: { backgroundColor: '#3A1B18', borderColor: '#71332D' },
  btnPressed: { transform: [{ translateY: 1 }], opacity: 0.88 },
  btnDisabled: { opacity: 0.42 },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  btnText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  btnTextPrimary: { color: colors.black },
  fieldWrap: { gap: 7 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  fieldHint: { color: colors.textMuted, fontSize: font.tiny },
  inputFrame: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputFrameFocused: { borderColor: colors.primary },
  inputFrameError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: font.body, paddingVertical: 13 },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  fieldError: { color: colors.danger, fontSize: font.tiny },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.8 },
  chipText: { color: colors.textDim, fontWeight: '600', fontSize: font.small },
  chipTextActive: { color: colors.black },
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
  tileSub: { color: colors.textMuted, fontSize: font.tiny },
  ring: { alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute' },
  ringCopy: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  ringValue: { color: colors.text, fontSize: font.h3, fontWeight: '900', textAlign: 'center' },
  ringValueSmall: { fontSize: font.small },
  ringLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },
  statusPill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, borderWidth: 1, borderRadius: radius.pill },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: font.tiny, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  notice: {
    backgroundColor: '#172432',
    borderWidth: 1,
    borderColor: '#294968',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeDanger: { backgroundColor: '#321A18', borderColor: '#6B302B' },
  noticeSuccess: { backgroundColor: '#15291F', borderColor: '#2F6247' },
  noticeText: { color: colors.text, fontSize: font.small, lineHeight: 19 },
});
