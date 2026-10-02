import * as SMS from 'expo-sms';
import { PermissionsAndroid, Platform } from 'react-native';
import MathakaSms from '../../modules/mathaka-sms';

// SMS works without mobile data, and every family in Sri Lanka has it.
// 1) dev/preview build: our tiny native module sends directly (no tap needed).
// 2) Expo Go / no permission: open the SMS app with the text filled in (someone must tap Send).

export type SmsResult = 'sent' | 'composer_opened' | 'unavailable';

export async function smsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !MathakaSms) return false;
  if (MathakaSms.canSend()) return true;
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS, {
    title: 'Mathaka',
    message: 'Mathaka sends a short SMS to the family if a medicine is not confirmed. It never sends anything else.',
    buttonPositive: 'OK',
  });
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

export function canSendDirect(): boolean {
  try {
    return Platform.OS === 'android' && !!MathakaSms && MathakaSms.canSend();
  } catch {
    return false;
  }
}

/** Send now if we can; with `allowComposer`, open the SMS app as the fallback. */
export async function sendSms(phone: string, text: string, allowComposer: boolean): Promise<SmsResult> {
  if (canSendDirect()) {
    await MathakaSms!.sendAsync(phone, text);
    return 'sent';
  }
  if (allowComposer && (await SMS.isAvailableAsync())) {
    await SMS.sendSMSAsync([phone], text);
    return 'composer_opened';
  }
  return 'unavailable';
}
