import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { colors, font, radius, shadow, spacing } from '../theme';

let reducedMotionValue = false;
let reducedMotionReady = false;
const reducedMotionSubscribers = new Set<(value: boolean) => void>();

function initializeReducedMotion() {
  if (reducedMotionReady) return;
  reducedMotionReady = true;
  void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
    reducedMotionValue = value;
    reducedMotionSubscribers.forEach((subscriber) => subscriber(value));
  });
  AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
    reducedMotionValue = value;
    reducedMotionSubscribers.forEach((subscriber) => subscriber(value));
  });
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotionValue);

  useEffect(() => {
    initializeReducedMotion();
    reducedMotionSubscribers.add(setReduced);
    setReduced(reducedMotionValue);
    return () => {
      reducedMotionSubscribers.delete(setReduced);
    };
  }, []);

  return reduced;
}

export function Reveal({
  children,
  delay = 0,
  distance = 18,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      delay,
      damping: 18,
      stiffness: 150,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [delay, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function DirectionalReveal({
  children,
  direction = 1,
  delay = 0,
  distance = 34,
  style,
}: {
  children: ReactNode;
  direction?: -1 | 1;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      delay,
      damping: 20,
      stiffness: 165,
      mass: 0.78,
      useNativeDriver: true,
    }).start();
  }, [delay, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [distance * direction, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function FloatingLayer({
  children,
  distance = 7,
  duration = 4200,
  style,
}: {
  children: ReactNode;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      float.setValue(0.5);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [duration, float, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [distance / 2, -distance / 2] }) },
            { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-0.35deg', '0.35deg'] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Word-by-word cascading text reveal. Words in `accentWords` are highlighted.
// Supports explicit line breaks via '\n'. Cross-platform (pure Animated).
export function StaggerText({
  text,
  style,
  accentWords = [],
  accentColor = colors.primary,
  delay = 0,
  stagger = 65,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  accentWords?: string[];
  accentColor?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const lines = useMemo(() => text.split('\n').map((line) => line.split(/\s+/).filter(Boolean)), [text]);
  const totalWords = useMemo(() => lines.reduce((sum, words) => sum + words.length, 0), [lines]);
  const values = useRef(Array.from({ length: totalWords }, () => new Animated.Value(reduced ? 1 : 0))).current;
  const accents = useMemo(() => new Set(accentWords.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))), [accentWords]);

  useEffect(() => {
    if (reduced) {
      values.forEach((v) => v.setValue(1));
      return;
    }
    values.forEach((v) => v.setValue(0));
    const animations = values.map((v, index) =>
      Animated.spring(v, { toValue: 1, delay: delay + index * stagger, damping: 14, stiffness: 160, mass: 0.7, useNativeDriver: true }),
    );
    Animated.parallel(animations).start();
  }, [delay, reduced, stagger, text, values]);

  let wordIndex = -1;
  return (
    <View>
      {lines.map((words, lineIdx) => (
        <View key={lineIdx} style={staggerStyles.line}>
          {words.map((word, idx) => {
            wordIndex += 1;
            const v = values[wordIndex];
            const isAccent = accents.has(word.toLowerCase().replace(/[^a-z0-9]/g, ''));
            return (
              <Animated.View
                key={`${word}-${idx}`}
                style={{
                  opacity: v,
                  transform: [
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
                    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['3deg', '0deg'] }) },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                  ],
                }}
              >
                <Text style={[style, isAccent && { color: accentColor }]}>
                  {word}
                  {idx < words.length - 1 ? ' ' : ''}
                </Text>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const staggerStyles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap' },
});

export function usePressMotion(disabled = false) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();

  const move = (toValue: number) => {
    if (disabled || reduced) return;
    Animated.spring(scale, {
      toValue,
      damping: 14,
      stiffness: 280,
      mass: 0.55,
      useNativeDriver: true,
    }).start();
  };

  return {
    animatedStyle: { transform: [{ scale }] } as any,
    pressHandlers: {
      onPressIn: () => move(0.965),
      onPressOut: () => move(1),
      onHoverIn: () => move(1.012),
      onHoverOut: () => move(1),
    },
  };
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 700,
  style,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
}) {
  const reduced = useReducedMotion();
  const current = useRef(reduced ? value : 0);
  const [display, setDisplay] = useState(current.current.toFixed(decimals));

  useEffect(() => {
    if (reduced) {
      current.current = value;
      setDisplay(value.toFixed(decimals));
      return;
    }

    const from = current.current;
    const started = Date.now();
    let frame = 0;
    let lastLabel = from.toFixed(decimals);
    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = from + (value - from) * eased;
      current.current = next;
      // Only re-render when the visible string actually changes (not every frame).
      const label = next.toFixed(decimals);
      if (label !== lastLabel) {
        lastLabel = label;
        setDisplay(label);
      }
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [decimals, duration, reduced, value]);

  return <Text style={style}>{prefix}{display}{suffix}</Text>;
}

export function EnergyLoader({ dark = false }: { dark?: boolean }) {
  const reduced = useReducedMotion();
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(phase, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    animation.start();
    return () => animation.stop();
  }, [phase, reduced]);

  return (
    <View accessibilityLabel="Loading" style={styles.loader}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.loaderBar,
            { backgroundColor: dark ? colors.black : colors.primary },
            {
              transform: [{
                scaleY: phase.interpolate({
                  inputRange: [0, 0.33 + index * 0.12, 0.66 + index * 0.1, 1],
                  outputRange: [0.45, 1, 0.55, 0.45],
                }),
              }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function AchievementBurst({
  visible,
  title = 'Momentum added',
  detail = '+120 XP',
  onFinished,
}: {
  visible: boolean;
  title?: string;
  detail?: string;
  onFinished?: () => void;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const particles = useMemo(() => Array.from({ length: 12 }, (_, index) => ({
    angle: (Math.PI * 2 * index) / 12,
    color: [colors.primary, colors.accent, colors.peach, colors.success][index % 4],
  })), []);

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    Animated.sequence([
      Animated.spring(progress, { toValue: 0.62, damping: 11, stiffness: 170, mass: 0.7, useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, delay: reduced ? 250 : 900, duration: reduced ? 120 : 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onFinishedRef.current?.();
    });
  }, [progress, reduced, visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.burstOverlay}>
      <Animated.View
        style={[
          styles.burstCore,
          {
            opacity: progress.interpolate({ inputRange: [0, 0.2, 0.72, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 0.62, 1], outputRange: [0.7, 1, 0.92] }) }],
          },
        ]}
      >
        <Text style={styles.burstEyebrow}>{detail}</Text>
        <Text style={styles.burstTitle}>{title}</Text>
      </Animated.View>
      {particles.map((particle, index) => {
        const distance = 96 + (index % 3) * 18;
        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              { backgroundColor: particle.color },
              {
                opacity: progress.interpolate({ inputRange: [0, 0.2, 0.72, 1], outputRange: [0, 1, 0.7, 0] }),
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0, Math.cos(particle.angle) * distance, Math.cos(particle.angle) * distance * 1.1] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0, Math.sin(particle.angle) * distance, Math.sin(particle.angle) * distance * 1.1] }) },
                  { rotate: `${index * 23}deg` },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  loaderBar: { width: 3, height: 17, borderRadius: 2 },
  burstOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,10,9,0.42)' },
  burstCore: { minWidth: 230, minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.primary, ...shadow.glow },
  burstEyebrow: { color: colors.primary, fontSize: font.small, fontWeight: '900', letterSpacing: 1.2 },
  burstTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  particle: { position: 'absolute', width: 7, height: 22, borderRadius: 3 },
});
