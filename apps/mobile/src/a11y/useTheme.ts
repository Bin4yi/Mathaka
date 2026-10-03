import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { DARK, LIGHT, THEMES, type Theme } from './tokens';

/** Follows the system light/dark setting unless the family picked a theme in settings. */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const choice = useAppStore((s) => s.themeChoice);
  const calm = useAppStore((s) => s.calmActive && s.role === 'elder');
  if (choice !== 'system') return THEMES[choice];
  // evening calm mode: softer dark colours (contrast is still tested >= 7:1)
  if (calm) return DARK;
  return scheme === 'dark' ? DARK : LIGHT;
}
