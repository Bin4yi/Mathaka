import type { DeviceRole, Lang } from '@mathaka/core';
import { create } from 'zustand';

// Small UI state only. Real data lives in the repository (SQLite / memory).
type AppState = {
  role: DeviceRole | null;
  uiLang: Lang;
  setRole: (role: DeviceRole | null) => void;
  setUiLang: (lang: Lang) => void;
};

export const useAppStore = create<AppState>((set) => ({
  role: null,
  uiLang: 'en',
  setRole: (role) => set({ role }),
  setUiLang: (uiLang) => set({ uiLang }),
}));
