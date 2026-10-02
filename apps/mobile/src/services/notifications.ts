import { elderText, planReminders, SLOT_WORD } from '@mathaka/core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';
import { clock } from './clock';
import type { ElderView } from './doseService';

// Local scheduled notifications (work in Expo Go and when the app is closed).
// A custom low-tone chime (400–1000 Hz) needs a dev build (expo-notifications "sounds"): M3.

export const CHANNEL_ID = 'medicine';
export const NOTIFICATIONS_SUPPORTED = true;
/** One vibration pattern used only for medicine: long, pause, long. */
export const MEDICINE_VIBRATION = [0, 700, 500, 700];

let ready = false;

export async function setupNotifications(): Promise<void> {
  if (ready) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Medicine reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: MEDICINE_VIBRATION,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }
  ready = true;
}

export async function notificationsAllowed(): Promise<boolean> {
  const s = await Notifications.getPermissionsAsync();
  return s.granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const s = await Notifications.requestPermissionsAsync();
  return s.granted;
}

/**
 * Cancel and re-plan reminders for today and tomorrow: due time, +10 and +20 minutes.
 * Only on the elder phone. Demo time is honoured by shifting back to real time.
 */
export async function rescheduleReminders(view: ElderView): Promise<number> {
  if (useAppStore.getState().role !== 'elder') return 0;
  await setupNotifications();
  if (!(await notificationsAllowed())) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const offset = clock.now().getTime() - Date.now();
  const plan = planReminders(view.now, view.elder, view.active, view.events, 2);
  for (const r of plan) {
    const realAt = new Date(r.at.getTime() - offset);
    if (realAt.getTime() <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: elderText(view.ctx, 'dose.title', { slot: SLOT_WORD[view.ctx.lang][r.slot] }),
        body: elderText(view.ctx, 'reminder', { slot: SLOT_WORD[view.ctx.lang][r.slot] }),
        data: { slot: r.slot, date: r.date, repeat: r.repeat },
        sound: true,
        ...(Platform.OS === 'android' ? { vibrate: MEDICINE_VIBRATION } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: realAt, channelId: CHANNEL_ID },
    });
  }
  return plan.length;
}

export async function scheduledCount(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

/** Tapping a reminder opens the dose screen. Returns an unsubscribe function. */
export function onReminderTap(open: () => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(() => open());
  return () => sub.remove();
}
