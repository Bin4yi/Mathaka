import { base64ToBytes, decodeJpeg, type RGBAImage } from '@mathaka/core';
import { File, Directory, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Photos for calibration. Camera on the phone; on the web preview the "camera" is a file picker.

export type Photo = { uri: string; width: number; height: number };

export async function takePhoto(source: 'camera' | 'library'): Promise<Photo | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: false, exif: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const a = res.canceled ? null : res.assets?.[0];
  return a ? { uri: a.uri, width: a.width, height: a.height } : null;
}

/** Decode a photo into pixels, longest side at most `maxSide` (the pipeline works on ~1000 px). */
export async function loadPixels(photo: Photo, maxSide = 1000): Promise<RGBAImage> {
  const landscape = photo.width >= photo.height;
  const ctx = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > maxSide) ctx.resize(landscape ? { width: maxSide, height: null } : { width: null, height: maxSide });
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 0.92 });
  if (!saved.base64) throw new Error('no image data');
  return decodeJpeg(base64ToBytes(saved.base64));
}

/**
 * Keep a copy of a photo in the app's own folder (it travels to the elder phone in M6).
 * Web preview: no file system, keep the uri as it is.
 */
export function keepPhoto(uri: string, name: string): string {
  try {
    const dir = new Directory(Paths.document, 'photos');
    dir.create({ idempotent: true });
    const dest = new File(dir, name);
    if (dest.exists) dest.delete();
    if (uri.startsWith('data:')) {
      dest.write(uri.replace(/^data:[^,]*,/, ''), { encoding: 'base64' });
    } else {
      new File(uri).copySync(dest);
    }
    return dest.uri;
  } catch {
    return uri;
  }
}
