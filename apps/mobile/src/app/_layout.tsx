import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FONT_FILES } from '../a11y/fonts';
import { loadAppSettings } from '../services/settings';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAppSettings()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(String(e)));
  }, []);

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
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
