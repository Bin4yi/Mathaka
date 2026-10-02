import type { Lang } from '@mathaka/core';
import { Text, type TextProps } from 'react-native';
import { fontFor, lineHeightFor } from '../a11y/fonts';
import { useTheme } from '../a11y/useTheme';

type Props = TextProps & { lang: Lang; size: number; bold?: boolean; color?: string };

/** Text with the right Noto font and line height for the language. Scales with system font size. */
export function AppText({ lang, size, bold, color, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fontFor(lang, bold), fontSize: size, lineHeight: lineHeightFor(lang, size), color: color ?? theme.text },
        style,
      ]}
    />
  );
}
