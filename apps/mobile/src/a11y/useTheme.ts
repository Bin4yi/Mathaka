import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type Theme } from './tokens';

/** Follows the system light/dark setting. Family override + high contrast come in M2. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}
