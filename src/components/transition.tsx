// Signature route-change transition: a lime "momentum sweep" that races across
// the screen whenever the pathname changes, with a soft energy flash underneath.
// Pure RN Animated -> identical on iOS, Android, and web. Respects reduced motion.
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient } from './depth';
import { useReducedMotion } from './motion';
import { colors, shadow } from '../theme';

export function RouteTransition() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets(); // keep the sweep below the notch on native
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const firstRender = useRef(true);
  const barWidth = Math.max(180, width * 0.34);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduced) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pathname, progress, reduced]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Soft lime flash that breathes across the whole screen. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.primary,
            opacity: progress.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.045, 0] }),
          },
        ]}
      />
      {/* Energy bar racing along the top edge. */}
      <Animated.View
        style={[
          styles.sweep,
          { width: barWidth, top: insets.top },
          {
            opacity: progress.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-barWidth, width + barWidth * 0.4],
                }),
              },
            ],
          },
        ]}
      >
        <Gradient
          colors={['rgba(216,255,114,0)', colors.primary, '#FFFFFF', colors.primary, 'rgba(216,255,114,0)']}
          direction="horizontal"
        />
      </Animated.View>
      {/* Trailing spark at the head of the bar. */}
      <Animated.View
        style={[
          styles.spark,
          { top: insets.top - 2.5 },
          {
            opacity: progress.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 0.9, 0] }),
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-12, width + barWidth * 0.4 + barWidth - 12],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sweep: { position: 'absolute', top: 0, left: 0, height: 3, overflow: 'hidden' },
  spark: { position: 'absolute', top: -2.5, left: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF', ...shadow.glowStrong },
});
