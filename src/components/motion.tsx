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
const spatialDrift = new Animated.Value(0);
const spatialGlow = new Animated.Value(0);
let spatialAnimations: Animated.CompositeAnimation[] = [];

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

function setSpatialMotionEnabled(enabled: boolean) {
  if (!enabled) {
    spatialAnimations.forEach((animation) => animation.stop());
    spatialAnimations = [];
    spatialDrift.setValue(0.5);
    spatialGlow.setValue(0.5);
    return;
  }
  if (spatialAnimations.length) return;
  const driftAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(spatialDrift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(spatialDrift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]),
  );
  const glowAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(spatialGlow, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(spatialGlow, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]),
  );
  spatialAnimations = [driftAnimation, glowAnimation];
  spatialAnimations.forEach((animation) => animation.start());
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
  const [display, setDisplay] = useState(current.current);

  useEffect(() => {
    if (reduced) {
      current.current = value;
      setDisplay(value);
      return;
    }

    const from = current.current;
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const elapsed = Math.min(1, (Date.now() - started) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const next = from + (value - from) * eased;
      current.current = next;
      setDisplay(next);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduced, value]);

  return <Text style={style}>{prefix}{display.toFixed(decimals)}{suffix}</Text>;
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

export function SpatialBackdrop() {
  const reduced = useReducedMotion();

  useEffect(() => {
    setSpatialMotionEnabled(!reduced);
  }, [reduced]);

  const lanes = useMemo(() => Array.from({ length: 4 }, (_, index) => index), []);
  const beats = useMemo(() => Array.from({ length: 7 }, (_, index) => index), []);

  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.backdropBase} />
      <View style={styles.cadenceHeader}>
        <View style={styles.cadenceLabel} />
        <View style={styles.cadenceBeats}>
          {beats.map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.cadenceBeat,
                index === 3 && styles.cadenceBeatStrong,
                { opacity: spatialGlow.interpolate({ inputRange: [0, 1], outputRange: [0.16 + index * 0.018, 0.36 - index * 0.018] }) },
              ]}
            />
          ))}
        </View>
      </View>
      <Animated.View
        style={[
          styles.trackField,
          {
            opacity: spatialGlow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.27] }),
            transform: [
              { translateX: spatialDrift.interpolate({ inputRange: [0, 1], outputRange: [-26, 18] }) },
              { translateY: spatialGlow.interpolate({ inputRange: [0, 1], outputRange: [8, -6] }) },
            ],
          },
        ]}
      >
        {lanes.map((index) => (
          <View
            key={index}
            style={[
              styles.trackLane,
              {
                left: index * 34,
                top: index * 34,
                right: index * 34,
                bottom: index * 34,
                borderColor: index === 1 ? colors.primaryDim : index === 2 ? colors.accentDim : colors.borderStrong,
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.trackRunner,
            {
              opacity: spatialGlow.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.9] }),
              transform: [{ translateX: spatialDrift.interpolate({ inputRange: [0, 1], outputRange: [70, 390] }) }],
            },
          ]}
        />
      </Animated.View>
      <View style={styles.edgeShade} />
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
  backdrop: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: colors.bg },
  backdropBase: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg },
  cadenceHeader: { position: 'absolute', top: 28, left: '7%', right: '7%', height: 18, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: 0.8 },
  cadenceLabel: { width: 34, height: 3, borderRadius: 2, backgroundColor: colors.primary },
  cadenceBeats: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cadenceBeat: { flex: 1, height: 1, backgroundColor: colors.borderStrong },
  cadenceBeatStrong: { flex: 1.6, height: 2, backgroundColor: colors.accent },
  trackField: { position: 'absolute', width: 760, height: 520, left: -270, bottom: -300 },
  trackLane: { position: 'absolute', borderWidth: 1, borderRadius: 360 },
  trackRunner: { position: 'absolute', top: 68, left: 0, width: 48, height: 3, borderRadius: 2, backgroundColor: colors.primary, ...shadow.glow },
  edgeShade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, backgroundColor: colors.successDim, opacity: 0.34 },
  burstOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(9,10,9,0.42)' },
  burstCore: { minWidth: 230, minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.primary, ...shadow.glow },
  burstEyebrow: { color: colors.primary, fontSize: font.small, fontWeight: '900', letterSpacing: 1.2 },
  burstTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  particle: { position: 'absolute', width: 7, height: 22, borderRadius: 3 },
});
