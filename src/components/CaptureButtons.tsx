import { Camera, ImagePlus, ScanLine, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { usePressMotion, useReducedMotion } from './motion';
import { captureFromCamera, pickFromLibrary, type PickedImage } from '../services/imagePicker';
import { colors, font, radius, shadow, spacing } from '../theme';

export function CaptureButtons({
  image,
  onPicked,
  busy = false,
  emptyImage = require('../../assets/images/meal-scan-guide-v1.png'),
  title = 'Frame what matters',
  description = 'Use natural light and keep the subject fully inside the guide.',
  accent = colors.primary,
}: {
  image: PickedImage | null;
  onPicked: (img: PickedImage) => void;
  busy?: boolean;
  emptyImage?: ImageSourcePropType;
  title?: string;
  description?: string;
  accent?: string;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const reduced = useReducedMotion();
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced || busy) {
      scan.setValue(0.5);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [busy, reduced, scan]);

  const run = async (fn: () => Promise<PickedImage | null>) => {
    const selected = await fn();
    if (selected) onPicked(selected);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.previewFrame, { borderColor: `${accent}66` }]}>
        <Image
          source={image ? { uri: image.uri } : emptyImage}
          style={styles.preview}
          resizeMode="cover"
        />
        <View style={styles.scrim} />
        <View style={[styles.statusPill, { backgroundColor: `${accent}E8` }]}>
          <ScanLine size={15} color={colors.black} />
          <Text style={styles.statusText}>{image ? 'CAPTURE READY' : 'GUIDED CAPTURE'}</Text>
        </View>
        <View style={styles.captureGuide}>
          <View style={[styles.guideCorner, styles.guideTopLeft, { borderColor: accent }]} />
          <View style={[styles.guideCorner, styles.guideTopRight, { borderColor: accent }]} />
          <View style={[styles.guideCorner, styles.guideBottomLeft, { borderColor: accent }]} />
          <View style={[styles.guideCorner, styles.guideBottomRight, { borderColor: accent }]} />
        </View>
        <Animated.View
          style={[
            styles.scanLine,
            { backgroundColor: accent },
            { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [42, 222] }) }] },
          ]}
        />
        <View style={styles.previewCopy}>
          <Text style={styles.previewTitle}>{image ? 'Photo selected' : title}</Text>
          <Text style={styles.previewDescription}>{image ? 'Review the estimate below before saving.' : description}</Text>
        </View>
      </View>

      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <CaptureAction
          label="Take photo"
          icon={<Camera size={18} color={colors.black} />}
          primary
          busy={busy}
          onPress={() => void run(captureFromCamera)}
        />
        <CaptureAction
          label="Choose photo"
          icon={<ImagePlus size={18} color={colors.text} />}
          busy={busy}
          onPress={() => void run(pickFromLibrary)}
        />
      </View>
      <View style={styles.privacyLine}>
        <ShieldCheck size={14} color={colors.success} />
        <Text style={styles.privacyText}>You review every estimate before it is saved.</Text>
      </View>
    </View>
  );
}

function CaptureAction({
  label,
  icon,
  primary = false,
  busy,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  primary?: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, pressHandlers } = usePressMotion(busy);
  return (
    <Animated.View style={[styles.actionShell, primary && styles.actionGlow, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={busy}
        onPress={onPress}
        {...pressHandlers}
        style={[styles.action, primary ? styles.actionPrimary : styles.actionSecondary, busy && styles.disabled]}
      >
        {icon}
        <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  previewFrame: {
    width: '100%',
    height: 280,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceSunken,
  },
  preview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,8,6,0.28)' },
  statusPill: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  statusText: { color: colors.black, fontSize: font.tiny, fontWeight: '900', letterSpacing: 0 },
  captureGuide: { position: 'absolute', top: 38, right: 34, bottom: 54, left: 34 },
  guideCorner: { position: 'absolute', width: 30, height: 30 },
  guideTopLeft: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  guideTopRight: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  guideBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  guideBottomRight: { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2 },
  scanLine: { position: 'absolute', left: 34, right: 34, top: 0, height: 1, opacity: 0.8 },
  previewCopy: { position: 'absolute', right: spacing.lg, bottom: spacing.md, left: spacing.lg },
  previewTitle: { color: colors.white, fontSize: font.h3, fontWeight: '900' },
  previewDescription: { color: '#D4DBD3', fontSize: font.small, marginTop: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionsCompact: { flexDirection: 'column' },
  actionShell: { flex: 1 },
  actionGlow: shadow.glow,
  action: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionPrimary: { backgroundColor: colors.primary },
  actionSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderStrong },
  actionText: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  actionTextPrimary: { color: colors.black },
  privacyLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  privacyText: { color: colors.textMuted, fontSize: font.tiny },
  disabled: { opacity: 0.5 },
});
