/** Bildval, komprimering och uppladdning. */

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { getBackend } from "@/api";
import type { ImageBucket } from "@/api/types";

export interface PickOptions {
  /** Kvadratisk beskärning för profilbilder, 3:2 för omslag. */
  aspect: [number, number];
  /** Längsta sidan efter komprimering. */
  maxWidth: number;
}

const PRESETS: Record<ImageBucket, PickOptions> = {
  "avatars": { aspect: [1, 1], maxWidth: 800 },
  "activity-covers": { aspect: [3, 2], maxWidth: 1400 },
  "chat-images": { aspect: [4, 3], maxWidth: 1400 },
};

/**
 * Väljer en bild ur biblioteket och komprimerar den.
 *
 * Returnerar null när användaren avbryter, det är ett normalt utfall och
 * inget att kasta fel för.
 */
export async function pickImage(bucket: ImageBucket): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("FRIEND behöver tillgång till dina bilder för att du ska kunna välja en.");
  }

  const preset = PRESETS[bucket];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: preset.aspect,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return compress(result.assets[0].uri, preset.maxWidth);
}

/** Samma sak, men med kameran. */
export async function captureImage(bucket: ImageBucket): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("FRIEND behöver tillgång till kameran för att du ska kunna ta en bild.");
  }

  const preset = PRESETS[bucket];
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: preset.aspect,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return compress(result.assets[0].uri, preset.maxWidth);
}

async function compress(uri: string, maxWidth: number): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: maxWidth });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: 0.82,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

/** Väljer, komprimerar och laddar upp i ett svep. Returnerar bildens URL. */
export async function pickAndUpload(
  bucket: ImageBucket,
  pathPrefix?: string,
): Promise<string | null> {
  const localUri = await pickImage(bucket);
  if (!localUri) return null;
  return getBackend().uploadImage(bucket, localUri, pathPrefix);
}
