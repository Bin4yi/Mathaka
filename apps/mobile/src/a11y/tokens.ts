import type { Slot } from '@mathaka/core';

// Design tokens shared by every screen. src/a11y/contrast.test.ts checks every pair below.

/** Slot colours are never used alone: always with an icon and a word. */
export const SLOT_COLORS: Record<Slot, string> = {
  morning: '#F6B93B',
  noon: '#F28C38',
  evening: '#9B6FB6',
  night: '#3C4A7A',
};
/** Icon/mark colour on a slot colour (non-text, needs 3:1). Slot WORDS always sit on the surface, never on the colour. */
export const SLOT_ON: Record<Slot, string> = {
  morning: '#1B2030',
  noon: '#1B2030',
  evening: '#FFFFFF',
  night: '#FFFFFF',
};

export type ThemeName = 'light' | 'dark' | 'highContrast';
export type ThemeChoice = 'system' | ThemeName;

export type Theme = {
  name: ThemeName;
  bg: string; // off-white in light mode (less glare for cataract)
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string; // main elder button
  onPrimary: string;
  secondary: string; // second elder button
  onSecondary: string;
  taken: string;
  missed: string; // soft coral, family side only
  focus: string; // lit slot glow
  dim: number; // opacity of slots that are not now
};

export const LIGHT: Theme = {
  name: 'light',
  bg: '#FBF8F1',
  surface: '#FFFFFF',
  text: '#1B2030',
  textMuted: '#3F4659',
  border: '#22283A',
  primary: '#145A52',
  onPrimary: '#FFFFFF',
  secondary: '#E8EEF6',
  onSecondary: '#1B2030',
  taken: '#1A6B45',
  missed: '#A13F27',
  focus: '#E58E26',
  dim: 0.35,
};

export const DARK: Theme = {
  name: 'dark',
  bg: '#14181F',
  surface: '#1F2530',
  text: '#F5F2EA',
  textMuted: '#D5D8DE',
  border: '#C9CCD3',
  primary: '#8FDBCF',
  onPrimary: '#0B1513',
  secondary: '#2C3442',
  onSecondary: '#F5F2EA',
  taken: '#8FE0B3',
  missed: '#F5B3A2',
  focus: '#F6B93B',
  dim: 0.35,
};

/** Yellow/white on black for low vision. */
export const HIGH_CONTRAST: Theme = {
  name: 'highContrast',
  bg: '#000000',
  surface: '#000000',
  text: '#FFFFFF',
  textMuted: '#FFF27A',
  border: '#FFFFFF',
  primary: '#FFE600',
  onPrimary: '#000000',
  secondary: '#000000',
  onSecondary: '#FFFFFF',
  taken: '#7CFFB2',
  missed: '#FFB199',
  focus: '#FFE600',
  dim: 0.45,
};

export const THEMES: Record<ThemeName, Theme> = { light: LIGHT, dark: DARK, highContrast: HIGH_CONTRAST };

/** Sizes in dp/sp. Elder text >= 28, main message >= 36, targets >= 72 (main buttons >= 96). */
export const SIZE = {
  elderText: 28,
  elderMain: 36,
  elderSmall: 24, // only for secondary lines like "pink · round · number 5"
  familyText: 18,
  familyTitle: 26,
  target: 72,
  mainTarget: 96,
  gap: 16,
  radius: 20,
  pill: 220,
} as const;

/** Elder text follows the system font size up to 200%. */
export const MAX_FONT_SCALE = 2;

/** Ignore a second tap within this time (tremor, and stops double logging). */
export const TAP_GUARD_MS = 1500;
/** No touch for this long on an elder screen -> gently go back home. */
export const IDLE_HOME_MS = 2 * 60 * 1000;
