// Shared capture UI for the Phase 5 camera screens: a preview + "Take photo" /
// "Choose from library" buttons that hand back a PickedImage.

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { captureFromCamera, pickFromLibrary, type PickedImage } from '../services/imagePicker';
import { colors, font, radius, spacing } from '../theme';

export function CaptureButtons({
  image,
  onPicked,
  busy = false,
}: {
  image: PickedImage | null;
  onPicked: (img: PickedImage) => void;
  busy?: boolean;
}) {
  const run = async (fn: () => Promise<PickedImage | null>) => {
    const img = await fn();
    if (img) onPicked(img);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📷</Text>
          <Text style={styles.placeholderText}>No photo yet</Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable
          style={[styles.btn, styles.primary, busy && styles.disabled]}
          onPress={() => run(captureFromCamera)}
          disabled={busy}
        >
          <Text style={styles.primaryText}>Take photo</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.ghost, busy && styles.disabled]}
          onPress={() => run(pickFromLibrary)}
          disabled={busy}
        >
          <Text style={styles.ghostText}>Choose photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 240, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  placeholder: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  placeholderIcon: { fontSize: 40 },
  placeholderText: { color: colors.textDim, fontSize: font.small },
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  primaryText: { color: colors.bg, fontWeight: '700', fontSize: font.body },
  ghost: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.text, fontWeight: '700', fontSize: font.body },
  disabled: { opacity: 0.5 },
});
