import { requireOptionalNativeModule } from 'expo';

type MathakaSmsModule = {
  canSend(): boolean;
  /** resolves with the number of SMS parts sent */
  sendAsync(phone: string, message: string): Promise<number>;
};

/** null in Expo Go, on web and on iOS: the caller falls back to the SMS app. */
export default requireOptionalNativeModule<MathakaSmsModule>('MathakaSms');
