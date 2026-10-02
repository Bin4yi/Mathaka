import { base64ToBytes } from '@mathaka/core';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Read/write/share raw bytes on the phone. (Web version: fileBytes.web.ts.)

export async function readBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) return base64ToBytes(uri);
  return new File(uri).bytes();
}

/** Save into the app's own folder (documents/<folder>/<name>) and return the file uri. */
export function writeAppFile(folder: string, name: string, bytes: Uint8Array): string {
  const dir = new Directory(Paths.document, folder);
  dir.create({ idempotent: true });
  const f = new File(dir, name);
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  return f.uri;
}

/** Write to cache and open the Android share sheet (Bluetooth, WhatsApp-to-self, USB…). */
export async function shareBytes(name: string, bytes: Uint8Array, mimeType: string, title: string): Promise<void> {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: title });
}
