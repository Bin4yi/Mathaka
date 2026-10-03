import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FONT_FILES } from '../a11y/fonts';
import { useTheme } from '../a11y/useTheme';
import { registerElderBackgroundCheck } from '../services/backgroundTask';
import { onBoxEvent, reconnectBox } from '../services/boxService';
import { checkMissed, handleBoxEvent, loadElderView } from '../services/doseService';
import { deliverPending, startFamilyListener } from '../services/linkService';
import { onReminderTap, rescheduleReminders, setupNotifications } from '../services/notifications';
import { loadAppSettings } from '../services/settings';
import { useAppStore } from '../store/appStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = useAppStore((s) => s.role);
  const theme = useTheme();

  useEffect(() => {
    loadAppSettings()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // Elder phone: reminders, missed-dose check, and "tap reminder -> dose screen".
  useEffect(() => {
    if (!ready || role !== 'elder') return;
    void (async () => {
      await setupNotifications();
      await checkMissed();
      const view = await loadElderView();
      if (view) await rescheduleReminders(view);
      await registerElderBackgroundCheck();
      // optional Bluetooth pill box: its presses behave like the big buttons
      onBoxEvent((e) => {
        void handleBoxEvent(e).then((msg) => {
          if (msg) {
            useAppStore.getState().setElderMessage(msg);
            router.push('/elder/answer');
          }
        });
      });
      await reconnectBox();
      await deliverPending();
    })();
    return onReminderTap(() => router.push('/elder/dose'));
  }, [ready, role]);

  // Family phone: listen for the elder phone's log on the home Wi-Fi (dev/preview build).
  useEffect(() => {
    if (ready && role === 'family') void startFamilyListener();
  }, [ready, role]);

  const done = (fontsLoaded || !!fontError) && (ready || !!error);
  useEffect(() => {
    if (done) void SplashScreen.hideAsync();
  }, [done]);

  if (!done) return null;
  if (error) {
    // Developer-facing only: storage failed to open. Never shown in normal use.
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text selectable>Storage error: {error}</Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
