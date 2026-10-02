import type {
  Alert,
  AuditEntry,
  DemoData,
  DoseEvent,
  Elder,
  LookalikePair,
  Medicine,
  ModelFile,
  Person,
  PillProfile,
  QuestionEvent,
  ScheduleItem,
  VoiceClip,
} from '@mathaka/core';

/**
 * All storage goes through this interface.
 * Phones: SQLite (sqliteRepository). Web preview + tests: in memory (memoryRepository).
 */
export interface Repository {
  readonly kind: 'sqlite' | 'memory';
  init(): Promise<void>;

  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;

  getElder(): Promise<Elder | null>;
  saveElder(elder: Elder): Promise<void>;

  listPeople(): Promise<Person[]>;
  savePerson(person: Person): Promise<void>;

  listMedicines(): Promise<Medicine[]>;
  saveMedicine(medicine: Medicine): Promise<void>;

  listPillProfiles(): Promise<PillProfile[]>;
  savePillProfile(profile: PillProfile): Promise<void>;

  listLookalikes(): Promise<LookalikePair[]>;
  saveLookalike(pair: LookalikePair): Promise<void>;

  listSchedule(): Promise<ScheduleItem[]>;
  saveScheduleItem(item: ScheduleItem): Promise<void>;
  deleteScheduleItem(id: string): Promise<void>;

  /** Dose events with fromDate <= date <= toDate ("YYYY-MM-DD"), oldest first. */
  listDoseEvents(fromDate: string, toDate: string): Promise<DoseEvent[]>;
  saveDoseEvent(event: DoseEvent): Promise<void>;

  addQuestionEvent(event: QuestionEvent): Promise<void>;
  listQuestionEvents(date: string): Promise<QuestionEvent[]>;

  /** Newest first. */
  listAlerts(): Promise<Alert[]>;
  saveAlert(alert: Alert): Promise<void>;

  listVoiceClips(): Promise<VoiceClip[]>;
  saveVoiceClip(clip: VoiceClip): Promise<void>;

  addAudit(entry: AuditEntry): Promise<void>;
  listAudit(): Promise<AuditEntry[]>;

  listModelFiles(): Promise<ModelFile[]>;
  saveModelFile(file: ModelFile): Promise<void>;

  /** Wipe all data (keeps nothing). */
  resetAll(): Promise<void>;
  /** Write a whole demo data set in one go. */
  importDemo(data: DemoData): Promise<void>;
}
