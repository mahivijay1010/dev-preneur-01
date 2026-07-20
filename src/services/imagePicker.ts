// Thin wrapper over expo-image-picker. Returns both a displayable URI and a
// base64 payload (for the vision model). Handles permissions and cancellation.
// On web, "Take photo" opens a real live camera (see webCamera.tsx) instead of
// a file dialog; it only falls back to the library picker if the browser has
// no camera API at all (e.g. an insecure http origin).

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { isWebCameraSupported, openWebCamera } from './webCamera';

export interface PickedImage {
  uri: string;
  base64: string | null;
  mimeType: string;
}

const COMMON: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.5, // keep base64 payloads small for the API
  base64: true,
  allowsEditing: true,
};

function firstAsset(result: ImagePicker.ImagePickerResult): PickedImage | null {
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    base64: a.base64 ?? null,
    mimeType: a.mimeType ?? 'image/jpeg',
  };
}

export async function captureFromCamera(
  options?: Partial<ImagePicker.ImagePickerOptions>,
): Promise<PickedImage | null> {
  if (Platform.OS === 'web') {
    if (isWebCameraSupported()) return openWebCamera();
    return pickFromLibrary(options); // no camera API available (e.g. insecure origin)
  }
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return pickFromLibrary(options);
  return firstAsset(await ImagePicker.launchCameraAsync({ ...COMMON, ...options }));
}

export async function pickFromLibrary(
  options?: Partial<ImagePicker.ImagePickerOptions>,
): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  return firstAsset(await ImagePicker.launchImageLibraryAsync({ ...COMMON, ...options }));
}
