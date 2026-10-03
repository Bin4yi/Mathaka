import type { BoxCommand, BoxEvent } from '@mathaka/core';

// Web preview: no Bluetooth pill box (the on-screen virtual box is used instead).

export function boxSupported(): boolean {
  return false;
}
export function boxConnected(): boolean {
  return false;
}
export function onBoxEvent(_fn: (e: BoxEvent) => void): void {}
export async function findAndConnectBox(): Promise<'unsupported'> {
  return 'unsupported';
}
export async function reconnectBox(): Promise<boolean> {
  return false;
}
export async function forgetBox(): Promise<void> {}
export async function sendBox(_cmds: BoxCommand[]): Promise<void> {}
