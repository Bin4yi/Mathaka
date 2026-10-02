import type { ReactNode } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { useTheme } from '../a11y/useTheme';

/**
 * The generated icons have dark outlines. On dark / high-contrast themes they sit on a
 * light tile so they stay visible. Icons are decorative: words always say the same thing.
 */
export function Icon({ source, size }: { source: ImageSourcePropType; size: number }) {
  return (
    <Backdrop radius={size / 4}>
      <Image accessibilityIgnoresInvertColors source={source} style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no" />
    </Backdrop>
  );
}

/** Light tile behind dark-outlined art in dark / high-contrast themes; nothing in light theme. */
export function Backdrop({ children, radius = 16, pad = 4 }: { children: ReactNode; radius?: number; pad?: number }) {
  const theme = useTheme();
  if (theme.name === 'light') return <>{children}</>;
  return <View style={{ backgroundColor: '#F4F1EA', borderRadius: radius, padding: pad }}>{children}</View>;
}
