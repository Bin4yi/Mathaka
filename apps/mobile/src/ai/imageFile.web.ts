import { bytesToBase64 } from '@mathaka/core';

// Web preview: images are data: or blob: URLs.

export function toFileUri(uri: string): string {
  return uri;
}

export async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri.replace(/^data:[^,]*,/, '');
  const res = await fetch(uri);
  return bytesToBase64(new Uint8Array(await res.arrayBuffer()));
}
