import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useReducedMotion } from './motion';
import { colors } from '../theme';

let gradientId = 0;
function useGradientId(prefix: string) {
  return useMemo(() => `${prefix}-${(gradientId += 1)}`, [prefix]);
}

type Direction = 'vertical' | 'horizontal' | 'diagonal' | 'diagonalUp';

const DIRECTIONS: Record<Direction, { x1: string; y1: string; x2: string; y2: string }> = {
  vertical: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
  horizontal: { x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
  diagonal: { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
  diagonalUp: { x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
};

/**
 * SVG-backed linear gradient fill. Renders identically on iOS / Android / Web.
 * By default it fills its parent (absolute). Give it a `radius` to clip corners.
 */
export function Gradient({
  colors: stops,
  direction = 'vertical',
  locations,
  radius,
  style,
  opacity = 1,
}: {
  colors: string[];
  direction?: Direction;
  locations?: number[];
  radius?: number;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const id = useGradientId('lg');
  const dir = DIRECTIONS[direction];

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, radius != null && { borderRadius: radius, overflow: 'hidden' }, { opacity }, style]}
    >
      {size.w > 0 && size.h > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <SvgLinearGradient id={id} x1={dir.x1} y1={dir.y1} x2={dir.x2} y2={dir.y2}>
              {stops.map((color, index) => (
                <Stop
                  key={index}
                  offset={locations ? locations[index] : index / Math.max(1, stops.length - 1)}
                  stopColor={color}
                />
              ))}
            </SvgLinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}

/** A soft radial glow blob (used by the aurora backdrop and glow accents). */
function Blob({
  color,
  size,
  style,
}: {
  color: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useGradientId('rg');
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgRadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgRadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function AuroraBlob({
  color,
  size,
  left,
  top,
  driftX,
  driftY,
  duration,
  reduced,
}: {
  color: string;
  size: number;
  left: number;
  top: number;
  driftX: number;
  driftY: number;
  duration: number;
  reduced: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      t.setValue(0.5);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [duration, reduced, t]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-driftX, driftX] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [driftY, -driftY] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) },
        ],
      }}
    >
      <Blob color={color} size={size} />
    </Animated.View>
  );
}

/**
 * Full-screen animated gradient-mesh backdrop. Slow-drifting colored blobs over
 * the base background with a vignette. This is the signature depth layer.
 */
export function AuroraBackdrop() {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const vignetteId = useGradientId('vig');
  const big = Math.max(width, height);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }]}>
      <AuroraBlob color="rgba(216,255,114,0.22)" size={big * 0.9} left={-big * 0.28} top={-big * 0.24} driftX={40} driftY={30} duration={13000} reduced={reduced} />
      <AuroraBlob color="rgba(125,184,255,0.18)" size={big * 0.85} left={width - big * 0.5} top={height * 0.34} driftX={52} driftY={42} duration={16000} reduced={reduced} />
      <AuroraBlob color="rgba(255,154,115,0.12)" size={big * 0.7} left={width * 0.1} top={height - big * 0.35} driftX={34} driftY={26} duration={18000} reduced={reduced} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgRadialGradient id={vignetteId} cx="50%" cy="42%" r="75%">
            <Stop offset="0" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="0.7" stopColor={colors.bg} stopOpacity={0} />
            <Stop offset="1" stopColor="#050605" stopOpacity={0.85} />
          </SvgRadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${vignetteId})`} />
      </Svg>
    </View>
  );
}

/**
 * A 3D tilt container. On web the card tilts to follow the cursor (perspective +
 * rotateX/rotateY); on native it does a gentle idle float. Sells depth without WebGL.
 */
export function TiltCard({
  children,
  style,
  intensity = 9,
  float = true,
  disabled = false,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  float?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const reduced = useReducedMotion();
  const size = useRef({ w: 1, h: 1 });
  const tiltX = useRef(new Animated.Value(0)).current; // degrees around X
  const tiltY = useRef(new Animated.Value(0)).current; // degrees around Y
  const idle = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || !float) {
      idle.setValue(0.5);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [float, idle, reduced]);

  const spring = (value: Animated.Value, toValue: number) =>
    Animated.spring(value, { toValue, damping: 15, stiffness: 180, mass: 0.7, useNativeDriver: true }).start();

  const handleMove = (event: any) => {
    if (reduced || disabled || Platform.OS !== 'web') return;
    const native = event.nativeEvent ?? {};
    const x = native.offsetX ?? native.locationX ?? 0;
    const y = native.offsetY ?? native.locationY ?? 0;
    const nx = x / size.current.w - 0.5;
    const ny = y / size.current.h - 0.5;
    spring(tiltY, nx * intensity * 2);
    spring(tiltX, -ny * intensity * 2);
  };

  const reset = () => {
    spring(tiltX, 0);
    spring(tiltY, 0);
    spring(lift, 0);
  };

  // idle sits at 0.5 when reduced/disabled -> contributes 0deg / 0px, so no extra guards needed.
  const idleRotX = idle.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });
  const idleTranslateY = idle.interpolate({ inputRange: [0, 1], outputRange: [3, -3] });
  const pointerRotX = tiltX.interpolate({ inputRange: [-60, 60], outputRange: ['-60deg', '60deg'], extrapolate: 'clamp' });
  const pointerRotY = tiltY.interpolate({ inputRange: [-60, 60], outputRange: ['-60deg', '60deg'], extrapolate: 'clamp' });

  const content = (
    <Animated.View
      onLayout={(event) => {
        size.current = { w: event.nativeEvent.layout.width || 1, h: event.nativeEvent.layout.height || 1 };
      }}
      style={[
        style,
        {
          transform: [
            { perspective: 1100 },
            { rotateX: pointerRotX },
            { rotateX: idleRotX },
            { rotateY: pointerRotY },
            { translateY: idleTranslateY },
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );

  if (!onPress && Platform.OS !== 'web') return content;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      // @ts-expect-error web-only pointer handlers passthrough
      onMouseMove={handleMove}
      onMouseEnter={() => Platform.OS === 'web' && spring(lift, 1)}
      onMouseLeave={reset}
      onPressIn={() => spring(lift, 1)}
      onPressOut={reset}
    >
      {content}
    </Pressable>
  );
}

/** A pulsing colored glow that sits behind its children. Opacity-only (native-driver safe). */
export function GlowPulse({
  children,
  color = colors.primary,
  radius = 40,
  intensity = 0.5,
  style,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.5);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, reduced]);

  return (
    <View style={style}>
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: radius,
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [intensity * 0.4, intensity] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] }) }],
        }}
      />
      {children}
    </View>
  );
}

/**
 * A diagonal light band that sweeps across its parent on a slow loop. Parent must
 * have overflow: 'hidden'. Great for hero cards / premium badges.
 */
export function ShineSweep({ interval = 4600, delay = 800, width = 90 }: { interval?: number; delay?: number; width?: number }) {
  const reduced = useReducedMotion();
  const [box, setBox] = useState(0);
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || box === 0) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1100, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(interval),
      ]),
    );
    x.setValue(0);
    anim.start();
    return () => anim.stop();
  }, [box, delay, interval, reduced, x]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(event) => setBox(event.nativeEvent.layout.width)}>
      <Animated.View
        style={{
          position: 'absolute',
          top: -40,
          bottom: -40,
          width,
          transform: [
            { translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-width * 2, box + width * 2] }) },
            { rotateZ: '18deg' },
          ],
        }}
      >
        <Gradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
          direction="horizontal"
        />
      </Animated.View>
    </View>
  );
}
