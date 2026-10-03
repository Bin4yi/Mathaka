import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZE } from '../a11y/tokens';
import { AppBackground } from '../ui/surfaces';

/** Family / Buddy screens: calm gradient, content scrolls (big system fonts wrap, never clip). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.flex}>
      <AppBackground />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SIZE.gap + 4, gap: SIZE.gap + 4, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 48 },
});
