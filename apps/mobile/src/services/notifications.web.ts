import type { ElderView } from './doseService';

// expo-notifications does not support web. The web preview just skips reminders.

export const CHANNEL_ID = 'medicine';
export const MEDICINE_VIBRATION = [0, 700, 500, 700];
export const NOTIFICATIONS_SUPPORTED = false;

export async function setupNotifications(): Promise<void> {}
export async function notificationsAllowed(): Promise<boolean> {
  return false;
}
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}
export async function rescheduleReminders(_view: ElderView): Promise<number> {
  return 0;
}
export async function scheduledCount(): Promise<number> {
  return 0;
}
export function onReminderTap(_open: () => void): () => void {
  return () => {};
}
