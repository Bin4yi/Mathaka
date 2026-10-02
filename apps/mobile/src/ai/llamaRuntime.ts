// llama.rn is a native module: it exists only in a dev/preview build, not in Expo Go or on web.
// Load it lazily so the rest of the app works everywhere.

type LlamaModule = typeof import('llama.rn');
let cached: LlamaModule | null | undefined;

export function llamaModule(): LlamaModule | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module
      cached = require('llama.rn') as LlamaModule;
    } catch {
      cached = null;
    }
  }
  return cached;
}
