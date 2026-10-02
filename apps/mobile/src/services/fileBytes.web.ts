import { base64ToBytes, bytesToBase64 } from '@mathaka/core';

// Web preview: files are data:/blob: URLs; "share" downloads the file.

export async function readBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) return base64ToBytes(uri);
  const res = await fetch(uri);
  return new Uint8Array(await res.arrayBuffer());
}

export function writeAppFile(_folder: string, name: string, bytes: Uint8Array): string {
  const type = name.endsWith('.bmp') ? 'image/bmp' : name.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${type};base64,${bytesToBase64(bytes)}`;
}

export async function shareBytes(name: string, bytes: Uint8Array, mimeType: string, _title: string): Promise<void> {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
