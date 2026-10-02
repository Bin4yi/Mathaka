import type { Lang } from '@mathaka/core';
import { Text, type TextProps } from 'react-native';
import { fontFor, lineHeightFor } from '../a11y/fonts';
import { MAX_FONT_SCALE } from '../a11y/tokens';
import { useTheme } from '../a11y/useTheme';

type Props = TextProps & { lang: Lang; size: number; bold?: boolean; color?: string };

/**
 * Text with the right Noto font and line height for the language.
 * Follows the phone's font size setting up to 200%; layouts wrap, never clip.
 */
export function AppText({ lang, size, bold, color, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[
        { fontFamily: fontFor(lang, bold), fontSize: size, lineHeight: lineHeightFor(lang, size), color: color ?? theme.text },
        style,
      ]}
    />
  );
}
