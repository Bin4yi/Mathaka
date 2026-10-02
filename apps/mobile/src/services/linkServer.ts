import { ElderLogMessageSchema, type ElderLogMessage, type Pairing } from '@mathaka/core';
import * as Network from 'expo-network';

// Phone-to-phone link on the home Wi-Fi (no cloud): the family phone listens, the elder
// phone connects, sends ONE JSON line, reads ONE JSON line back, closes.

type Tcp = typeof import('react-native-tcp-socket').default;
let tcpCache: Tcp | null | undefined;
/** Native module: missing in Expo Go, so load lazily. */
function tcp(): Tcp | null {
  if (tcpCache === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module
      tcpCache = (require('react-native-tcp-socket') as { default: Tcp }).default;
    } catch {
      tcpCache = null;
    }
  }
  return tcpCache;
}

export function linkSupported(): boolean {
  return tcp() !== null;
}
export const LINK_PORT = 8790;
const MAX_BYTES = 2_000_000;

type Server = ReturnType<Tcp['createServer']>;
let server: Server | null = null;

export async function localIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip && ip !== '0.0.0.0' ? ip : null;
  } catch {
    return null;
  }
}

/** Family phone: listen for elder-log messages with the right token. */
export function startLinkServer(token: string, onMessage: (m: ElderLogMessage) => Promise<void>): void {
  const T = tcp();
  if (server || !T) return;
  server = T.createServer((socket) => {
    let buf = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buf += typeof chunk === 'string' ? chunk : chunk.toString();
      if (buf.length > MAX_BYTES) {
        socket.destroy();
        return;
      }
      const nl = buf.indexOf('\n');
      if (nl < 0) return;
      const line = buf.slice(0, nl);
      void (async () => {
        try {
          const msg = ElderLogMessageSchema.parse(JSON.parse(line));
          if (msg.token !== token) throw new Error('bad token');
          await onMessage(msg);
          socket.write(JSON.stringify({ ok: true }) + '\n');
        } catch (e) {
          socket.write(JSON.stringify({ ok: false, error: String(e).slice(0, 120) }) + '\n');
        } finally {
          socket.end();
        }
      })();
    });
    socket.on('error', () => socket.destroy());
  });
  server.listen({ port: LINK_PORT, host: '0.0.0.0' });
}

export function stopLinkServer(): void {
  server?.close();
  server = null;
}

/** Elder phone: send one message to the paired family phone. */
export function sendToFamily(p: Pairing, msg: ElderLogMessage, timeoutMs = 8000): Promise<boolean> {
  const T = tcp();
  if (!T) return Promise.resolve(false);
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.destroy();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    let buf = '';
    const client = T.createConnection({ host: p.host, port: p.port }, () => {
      client.write(JSON.stringify(msg) + '\n');
    });
    client.on('data', (chunk) => {
      buf += typeof chunk === 'string' ? chunk : chunk.toString();
      const nl = buf.indexOf('\n');
      if (nl < 0) return;
      try {
        finish((JSON.parse(buf.slice(0, nl)) as { ok?: boolean }).ok === true);
      } catch {
        finish(false);
      }
    });
    client.on('error', () => finish(false));
    client.on('close', () => finish(false));
  });
}
