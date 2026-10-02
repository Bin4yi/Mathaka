import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZE } from '../a11y/tokens';
import { useTheme } from '../a11y/useTheme';

/** Every screen scrolls, so big system font sizes wrap instead of being cut off. */
export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SIZE.gap, gap: SIZE.gap, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
