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
  bg: string; // soft off-white in light mode (less glare for cataract)
  surface: string; // neumorphic surfaces use the same tone as bg
  text: string;
  textMuted: string;
  border: string; // strong outline (high contrast, focus)
  outline: string; // soft outline around elder cards (non-text, >= 3:1 on bg)
  primary: string; // main elder button
  onPrimary: string;
  /** gradient for the main button; BOTH stops must keep onPrimary >= 7:1 */
  primaryGradient: [string, string];
  secondary: string; // second elder button
  onSecondary: string;
  taken: string;
  missed: string; // soft coral, family side only
  focus: string; // lit slot glow
  dim: number; // opacity of slots that are not now
  /** page background gradient + soft colour blobs behind glass */
  bgGradient: [string, string, string];
  blobs: [string, string, string];
  /** neumorphism: light shadow (top-left) and dark shadow (bottom-right) */
  neuHigh: string;
  neuLow: string;
  /** glassmorphism */
  glassFill: string;
  glassBorder: string;
  blurTint: 'light' | 'dark';
};

export const LIGHT: Theme = {
  name: 'light',
  bg: '#EDF1F5',
  surface: '#EDF1F5',
  text: '#1B2030',
  textMuted: '#3A4154',
  border: '#22283A',
  outline: '#5A6274',
  primary: '#145A52',
  onPrimary: '#FFFFFF',
  primaryGradient: ['#176358', '#0E463F'],
  secondary: '#E3E9F0',
  onSecondary: '#1B2030',
  taken: '#1A6B45',
  missed: '#A13F27',
  focus: '#E58E26',
  dim: 0.38,
  bgGradient: ['#F4F7FB', '#EBF0F6', '#E6F1EF'],
  blobs: ['#7FD1C4', '#F6C66B', '#C3B3E8'],
  neuHigh: 'rgba(255,255,255,0.95)',
  neuLow: 'rgba(150,164,186,0.55)',
  glassFill: 'rgba(255,255,255,0.58)',
  glassBorder: 'rgba(255,255,255,0.9)',
  blurTint: 'light',
};

export const DARK: Theme = {
  name: 'dark',
  bg: '#1C2129',
  surface: '#1C2129',
  text: '#F5F2EA',
  textMuted: '#D5D8DE',
  border: '#C9CCD3',
  outline: '#8A93A3',
  primary: '#8FDBCF',
  onPrimary: '#0B1513',
  primaryGradient: ['#9BE3D8', '#7ACDC0'],
  secondary: '#262D38',
  onSecondary: '#F5F2EA',
  taken: '#8FE0B3',
  missed: '#F5B3A2',
  focus: '#F6B93B',
  dim: 0.38,
  bgGradient: ['#20262F', '#191D24', '#1A242A'],
  blobs: ['#1F6F66', '#7A5A1E', '#4B3E73'],
  neuHigh: 'rgba(255,255,255,0.06)',
  neuLow: 'rgba(0,0,0,0.6)',
  glassFill: 'rgba(38,45,56,0.6)',
  glassBorder: 'rgba(255,255,255,0.14)',
  blurTint: 'dark',
};

/** Yellow/white on black for low vision: no soft shadows, no blur, just strong edges. */
export const HIGH_CONTRAST: Theme = {
  name: 'highContrast',
  bg: '#000000',
  surface: '#000000',
  text: '#FFFFFF',
  textMuted: '#FFF27A',
  border: '#FFFFFF',
  outline: '#FFFFFF',
  primary: '#FFE600',
  onPrimary: '#000000',
  primaryGradient: ['#FFE600', '#FFE600'],
  secondary: '#000000',
  onSecondary: '#FFFFFF',
  taken: '#7CFFB2',
  missed: '#FFB199',
  focus: '#FFE600',
  dim: 0.45,
  bgGradient: ['#000000', '#000000', '#000000'],
  blobs: ['#000000', '#000000', '#000000'],
  neuHigh: 'transparent',
  neuLow: 'transparent',
  glassFill: '#000000',
  glassBorder: '#FFFFFF',
  blurTint: 'dark',
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
  radius: 24,
  pill: 220,
} as const;

/** Elder text follows the system font size up to 200%. */
export const MAX_FONT_SCALE = 2;

/** Ignore a second tap within this time (tremor, and stops double logging). */
export const TAP_GUARD_MS = 1500;
/** No touch for this long on an elder screen -> gently go back home. */
export const IDLE_HOME_MS = 2 * 60 * 1000;
