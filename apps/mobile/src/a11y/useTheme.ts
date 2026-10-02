import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { DARK, LIGHT, THEMES, type Theme } from './tokens';

/** Follows the system light/dark setting unless the family picked a theme in settings. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const choice = useAppStore((s) => s.themeChoice);
  if (choice !== 'system') return THEMES[choice];
  return scheme === 'dark' ? DARK : LIGHT;
}
