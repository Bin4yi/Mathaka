// Shared domain types. Pure TypeScript: used by the app, the tests and the Node eval.

export const SLOTS = ['morning', 'noon', 'evening', 'night'] as const;
export type Slot = (typeof SLOTS)[number];

export type Meal = 'before' | 'after' | 'any';
export type Lang = 'si' | 'ta' | 'en';
export const LANGS: readonly Lang[] = ['si', 'ta', 'en'];

/** Which job this phone does. Both can run on one phone for the demo. */
export type DeviceRole = 'family' | 'elder';

export type DoseStatus = 'due' | 'taken' | 'missed' | 'prevented_double' | 'unsure';
export type DoseSource = 'button' | 'box' | 'camera' | 'family' | 'seed';

// ---- pills (must match tools/generate-assets.mjs) ----
export type PillShape = 'round' | 'oval' | 'oblong' | 'capsule' | 'diamond' | 'triangle';
export const PILL_COLORS = {
  white: '#F4F4F2',
  cream: '#F3E6C4',
  yellow: '#F5D547',
  orange: '#F39A3D',
  pink: '#F2A2B8',
  red: '#D9483B',
  blue: '#5B8DD6',
  lightblue: '#A9CDEB',
  green: '#5DAE6B',
  brown: '#9A6B4F',
  purple: '#8E6BBF',
  grey: '#A7ADB5',
} as const;
export type PillColorName = keyof typeof PILL_COLORS;

export type PillSpec = {
  shape: PillShape;
  colorA: PillColorName | string;
  colorB?: PillColorName | string;
  split?: 'none' | 'vertical' | 'horizontal';
  score?: boolean;
  imprint?: string;
  sizeMm?: { length: number; width: number };
};

export type Localized = Record<Lang, string>;

// ---- data model (section 7) ----
export type A11yPrefs = {
  fontScale: number; // extra scale on top of the system setting (1 = none)
  highContrast: boolean;
  hearing: boolean; // visual + vibration alarm
  tremor: boolean; // longer tap debounce
  screenReader: boolean;
  confirmTaken: boolean; // "Did you swallow the pills now?" step
};

export type Elder = {
  id: string;
  preferredName: string; // the name the elder likes, e.g. "Ammi"
  language: Lang;
  times: { wake: string; breakfast: string; lunch: string; dinner: string; sleep: string }; // "HH:MM"
  a11y: A11yPrefs;
};

export type Person = {
  id: string;
  name: string;
  role: 'buddy' | 'family';
  relation?: string;
  phone?: string;
  photoPath?: string;
  /** asset key for demo photos (no real faces in the repo) */
  photoAsset?: string;
};

export type Medicine = {
  id: string;
  name: string;
  strength: string;
  form: 'tablet' | 'capsule' | 'liquid' | 'other';
  purpose: Localized;
  receivedCount: number;
  remainingCount: number;
};

export type PillProfile = {
  id: string;
  medicineId: string;
  spec: PillSpec;
  description: string;
  photoPaths: string[];
  /** key into PillLibrary / Assets.pills for demo pills */
  assetKey?: string;
  embeddings?: number[][];
  calibratedBy?: string;
  approvedBy?: string;
  version: number;
};

export type LookalikePair = { id: string; profileA: string; profileB: string; distance: number; note?: string };

export type ScheduleItem = { id: string; medicineId: string; slot: Slot; count: number; meal: Meal };

export type DoseEvent = {
  id: string;
  date: string; // local "YYYY-MM-DD"
  slot: Slot;
  status: DoseStatus;
  source: DoseSource;
  at: string | null; // ISO time of the action
};

export type QuestionIntent = 'did_i_take' | 'when_next' | 'which_pills' | 'other';
export type QuestionEvent = { id: string; at: string; date: string; intent: QuestionIntent; via: 'button' | 'voice' };

export type AlertKind = 'missed' | 'unsure_check' | 'new_pill' | 'low_stock' | 'clinic_soon' | 'unsure_answer';
export type Alert = {
  id: string;
  kind: AlertKind;
  date: string;
  slot?: Slot;
  createdAt: string;
  readAt: string | null;
  data?: Record<string, string | number>;
};

export type VoiceClip = { id: string; phraseKey: string; lang: Lang; path: string; recordedBy: string; consentAt: string };

export type AuditEntry = { id: string; at: string; actor: string; action: string; details?: string };

export type ModelFile = { name: string; path: string; sha256: string; size: number };
