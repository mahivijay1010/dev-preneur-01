// Real live-camera capture for web (desktop webcam or mobile browser camera),
// via getUserMedia + a <video> preview + canvas snapshot. Mount <WebCameraHost/>
// once near the app root; call openWebCamera() from anywhere to show it and
// await the shot. Native platforms use expo-image-picker instead (see
// imagePicker.ts) — this module is a no-op there.
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, X } from 'lucide-react-native';

import { colors, font, radius, spacing } from '../theme';
import type { PickedImage } from './imagePicker';

type Resolver = (image: PickedImage | null) => void;

let activeResolver: Resolver | null = null;
let showModal: ((visible: boolean) => void) | null = null;
let showError: ((message: string | null) => void) | null = null;

export function isWebCameraSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

// Opens the live camera modal and resolves with the captured shot, or null if
// the user closes it (cancelled, or camera access failed).
export function openWebCamera(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    activeResolver = resolve;
    showError?.(null);
    showModal?.(true);
  });
}

function finish(image: PickedImage | null) {
  showModal?.(false);
  const resolve = activeResolver;
  activeResolver = null;
  resolve?.(image);
}

export function WebCameraHost() {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    showModal = setVisible;
    showError = setError;
    return () => {
      showModal = null;
      showError = null;
    };
  }, []);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch(() => setError('Camera access was blocked or unavailable. Close this and use “Choose photo” to upload one instead.'));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [visible]);

  if (Platform.OS !== 'web' || !visible) return null;

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    finish({ uri: dataUrl, base64: dataUrl.split(',')[1] ?? null, mimeType: 'image/jpeg' });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => finish(null)}>
      <View style={styles.backdrop}>
        <View style={styles.frame}>
          <Pressable accessibilityLabel="Close camera" hitSlop={8} style={styles.close} onPress={() => finish(null)}>
            <X size={18} color={colors.text} />
          </Pressable>
          {error ? (
            <View style={styles.errorState}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.errorButton} onPress={() => finish(null)}>
                <Text style={styles.errorButtonText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <video ref={videoRef} muted playsInline style={webVideoStyle as any} />
          )}
          {!error ? (
            <View style={styles.guide} pointerEvents="none">
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          ) : null}
        </View>
        {!error ? (
          <Pressable accessibilityLabel="Capture photo" style={styles.shutterOuter} onPress={capture}>
            <View style={styles.shutterInner}>
              <Camera size={26} color={colors.black} />
            </View>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const webVideoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  backgroundColor: '#000',
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,6,5,0.94)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  frame: { width: '100%', maxWidth: 640, aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceSunken, borderWidth: 1, borderColor: colors.borderStrong },
  close: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2, width: 36, height: 36, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  guide: { ...StyleSheet.absoluteFillObject, margin: spacing.lg },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: colors.primary },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  shutterOuter: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, borderColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  errorText: { color: colors.text, fontSize: font.body, textAlign: 'center', lineHeight: 21 },
  errorButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primary },
  errorButtonText: { color: colors.black, fontWeight: '800' },
});
