import type { Slot } from '@mathaka/core';

// Design tokens shared by every screen. M2 adds the contrast unit test,
// high-contrast theme and the colour-blind checks on top of these.

export const SLOT_COLORS: Record<Slot, string> = {
  morning: '#F6B93B',
  noon: '#F28C38',
  evening: '#9B6FB6',
  night: '#3C4A7A',
};

export type Theme = {
  name: 'light' | 'dark';
  bg: string; // off-white, not pure white (less glare for cataract)
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  taken: string;
  missed: string; // soft coral, family side only
};

export const LIGHT: Theme = {
  name: 'light',
  bg: '#FBF8F1',
  surface: '#FFFFFF',
  text: '#1B2030',
  textMuted: '#454C5E',
  border: '#22283A',
  primary: '#1F6F66',
  onPrimary: '#FFFFFF',
  taken: '#1E7A50',
  missed: '#B4472C',
};

export const DARK: Theme = {
  name: 'dark',
  bg: '#14181F',
  surface: '#1F2530',
  text: '#F5F2EA',
  textMuted: '#C9CCD3',
  border: '#C9CCD3',
  primary: '#7FD1C4',
  onPrimary: '#0E1A18',
  taken: '#7FD6A6',
  missed: '#F0A08A',
};

/** Sizes in dp/sp. Elder text >= 28, main message >= 36, targets >= 72 (main buttons >= 96). */
export const SIZE = {
  elderText: 28,
  elderMain: 36,
  familyText: 18,
  familyTitle: 26,
  target: 72,
  mainTarget: 96,
  gap: 16,
  radius: 20,
} as const;
