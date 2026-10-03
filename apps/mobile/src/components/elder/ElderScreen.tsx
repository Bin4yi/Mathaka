import type { Lang } from '@mathaka/core';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIdleHome } from '../../a11y/hooks';
import { SIZE } from '../../a11y/tokens';
import { AppBackground, GlassPanel } from '../../ui/surfaces';
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
  const touched = useIdleHome(idleHome);
  return (
    <View style={styles.flex} onTouchStart={touched}>
      <AppBackground />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <OrientationStrip lang={lang} now={now} />
          {children}
        </ScrollView>
        <View style={styles.actionsWrap}>
          <GlassPanel style={styles.actions} radius={30}>
            {actions}
          </GlassPanel>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: SIZE.gap + 2, gap: SIZE.gap + 4, maxWidth: 720, width: '100%', alignSelf: 'center', paddingBottom: 24 },
  actionsWrap: { paddingHorizontal: 12, paddingBottom: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  actions: { padding: 14, gap: 14 },
});
