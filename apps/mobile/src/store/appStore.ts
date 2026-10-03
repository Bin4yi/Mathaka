import type { DeviceRole, Lang } from '@mathaka/core';
import { create } from 'zustand';
import type { ThemeChoice } from '../a11y/tokens';

// Small UI state only. Real data lives in the repository (SQLite / memory).

/** The last sentence shown to the elder (answer screen + "Say it again"). */
export type ElderMessage = { text: string; tone: 'calm' | 'ask_family' | 'done' };

type AppState = {
  role: DeviceRole | null;
  uiLang: Lang;
  themeChoice: ThemeChoice;
  speechRate: number;
  /** demo-time offset in ms (only used in DEMO_MODE) */
  demoOffsetMs: number;
  elderMessage: ElderMessage | null;
  /** bumps when dose data changes, so screens reload */
  dataVersion: number;
  /** evening calm mode is on right now (softer colours, slower speech on elder screens) */
  calmActive: boolean;
  setRole: (role: DeviceRole | null) => void;
  setUiLang: (lang: Lang) => void;
  setThemeChoice: (c: ThemeChoice) => void;
  setElderMessage: (m: ElderMessage | null) => void;
  bumpData: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  role: null,
  uiLang: 'en',
  themeChoice: 'system',
  speechRate: 0.8,
  demoOffsetMs: 0,
  elderMessage: null,
  dataVersion: 0,
  calmActive: false,
  setRole: (role) => set({ role }),
  setUiLang: (uiLang) => set({ uiLang }),
  setThemeChoice: (themeChoice) => set({ themeChoice }),
  setElderMessage: (elderMessage) => set({ elderMessage }),
  bumpData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
}));
