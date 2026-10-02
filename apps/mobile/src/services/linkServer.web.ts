import type { ElderLogMessage, Pairing } from '@mathaka/core';

// Web preview: no raw sockets. Both "phones" are the same browser tab in the demo.

export function linkSupported(): boolean {
  return false;
}
export const LINK_PORT = 8790;

export async function localIp(): Promise<string | null> {
  return null;
}
export function startLinkServer(_token: string, _onMessage: (m: ElderLogMessage) => Promise<void>): void {}
export function stopLinkServer(): void {}
export async function sendToFamily(_p: Pairing, _msg: ElderLogMessage): Promise<boolean> {
  return false;
}
