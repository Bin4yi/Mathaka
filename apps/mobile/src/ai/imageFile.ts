import { File, Paths } from 'expo-file-system';

// Turn any image uri (file://, content://, data:) into what each runner needs.

let n = 0;

/** llama.rn wants a real file path. data: URIs (our BMP crops) are written to the cache first. */
export function toFileUri(uri: string): string {
  if (!uri.startsWith('data:')) return uri;
  const ext = uri.startsWith('data:image/bmp') ? 'bmp' : uri.startsWith('data:image/png') ? 'png' : 'jpg';
  const f = new File(Paths.cache, `ai-input-${Date.now()}-${n++}.${ext}`);
  f.write(uri.replace(/^data:[^,]*,/, ''), { encoding: 'base64' });
  return f.uri;
}

/** The laptop helper takes base64 in JSON. */
export async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri.replace(/^data:[^,]*,/, '');
  return new File(uri).base64();
}
