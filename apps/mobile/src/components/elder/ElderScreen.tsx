import type { Lang } from '@mathaka/core';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIdleHome } from '../../a11y/hooks';
import { SIZE } from '../../a11y/tokens';
import { useTheme } from '../../a11y/useTheme';
import { OrientationStrip } from './OrientationStrip';

type Props = {
  lang: Lang;
  now: Date;
  children: ReactNode;
  /** At most 2 big buttons. They always sit at the bottom, in the same place. */
  actions: ReactNode;
  /** Home screen does not need to "return home". */
  idleHome?: boolean;
};

/** Same frame for every elder screen: orientation strip, content (scrolls), buttons at the bottom. */
export function ElderScreen({ lang, now, children, actions, idleHome = true }: Props) {
  const theme = useTheme();
  const touched = useIdleHome(idleHome);
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} onTouchStart={touched}>
      <ScrollView contentContainerStyle={styles.content}>
        <OrientationStrip lang={lang} now={now} />
        {children}
      </ScrollView>
      <View style={[styles.actions, { borderColor: theme.border, backgroundColor: theme.bg }]}>{actions}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SIZE.gap, gap: SIZE.gap, maxWidth: 720, width: '100%', alignSelf: 'center' },
  actions: {
    padding: SIZE.gap,
    gap: SIZE.gap,
    borderTopWidth: 2,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
});
