// Thin wrapper over expo-image-picker. Returns both a displayable URI and a
// base64 payload (for the vision model). Handles permissions and cancellation.
// Works on web too (opens the native file dialog); camera falls back to library
// where a live camera isn't available.

import * as ImagePicker from 'expo-image-picker';

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

export async function captureFromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return pickFromLibrary();
  return firstAsset(await ImagePicker.launchCameraAsync(COMMON));
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  return firstAsset(await ImagePicker.launchImageLibraryAsync(COMMON));
}
