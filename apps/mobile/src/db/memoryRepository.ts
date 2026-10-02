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
import type { Repository } from './repository';

type Tables = {
  settings: Map<string, unknown>;
  elder: Elder | null;
  people: Map<string, Person>;
  medicines: Map<string, Medicine>;
  pillProfiles: Map<string, PillProfile>;
  lookalikes: Map<string, LookalikePair>;
  schedule: Map<string, ScheduleItem>;
  doseEvents: Map<string, DoseEvent>;
  questions: Map<string, QuestionEvent>;
  alerts: Map<string, Alert>;
  voiceClips: Map<string, VoiceClip>;
  audit: AuditEntry[];
  models: Map<string, ModelFile>;
};

const empty = (): Tables => ({
  settings: new Map(),
  elder: null,
  people: new Map(),
  medicines: new Map(),
  pillProfiles: new Map(),
  lookalikes: new Map(),
  schedule: new Map(),
  doseEvents: new Map(),
  questions: new Map(),
  alerts: new Map(),
  voiceClips: new Map(),
  audit: [],
  models: new Map(),
});

// structuredClone keeps callers from mutating stored rows by accident (same as a real DB).
const copy = <T>(v: T): T => (v === undefined ? v : structuredClone(v));
const values = <T>(m: Map<string, T>): T[] => [...m.values()].map(copy);

/** In-memory repository for the web preview and for tests. Data is lost on reload. */
export class MemoryRepository implements Repository {
  readonly kind = 'memory' as const;
  private t: Tables = empty();

  async init(): Promise<void> {}

  async getSetting<T>(key: string): Promise<T | null> {
    return this.t.settings.has(key) ? copy(this.t.settings.get(key) as T) : null;
  }
  async setSetting<T>(key: string, value: T): Promise<void> {
    this.t.settings.set(key, copy(value));
  }

  async getElder() {
    return copy(this.t.elder);
  }
  async saveElder(elder: Elder) {
    this.t.elder = copy(elder);
  }

  async listPeople() {
    return values(this.t.people);
  }
  async savePerson(p: Person) {
    this.t.people.set(p.id, copy(p));
  }

  async listMedicines() {
    return values(this.t.medicines);
  }
  async saveMedicine(m: Medicine) {
    this.t.medicines.set(m.id, copy(m));
  }

  async listPillProfiles() {
    return values(this.t.pillProfiles);
  }
  async savePillProfile(p: PillProfile) {
    this.t.pillProfiles.set(p.id, copy(p));
  }

  async listLookalikes() {
    return values(this.t.lookalikes);
  }
  async saveLookalike(p: LookalikePair) {
    this.t.lookalikes.set(p.id, copy(p));
  }

  async listSchedule() {
    return values(this.t.schedule);
  }
  async saveScheduleItem(s: ScheduleItem) {
    this.t.schedule.set(s.id, copy(s));
  }
  async deleteScheduleItem(id: string) {
    this.t.schedule.delete(id);
  }

  async listDoseEvents(fromDate: string, toDate: string) {
    return values(this.t.doseEvents)
      .filter((e) => e.date >= fromDate && e.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.at ?? '').localeCompare(b.at ?? ''));
  }
  async saveDoseEvent(e: DoseEvent) {
    this.t.doseEvents.set(e.id, copy(e));
  }

  async addQuestionEvent(q: QuestionEvent) {
    this.t.questions.set(q.id, copy(q));
  }
  async listQuestionEvents(date: string) {
    return values(this.t.questions).filter((q) => q.date === date);
  }

  async listAlerts() {
    return values(this.t.alerts).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async saveAlert(a: Alert) {
    this.t.alerts.set(a.id, copy(a));
  }

  async listVoiceClips() {
    return values(this.t.voiceClips);
  }
  async saveVoiceClip(c: VoiceClip) {
    this.t.voiceClips.set(c.id, copy(c));
  }

  async addAudit(e: AuditEntry) {
    this.t.audit.push(copy(e));
  }
  async listAudit() {
    return this.t.audit.map(copy);
  }

  async listModelFiles() {
    return values(this.t.models);
  }
  async saveModelFile(f: ModelFile) {
    this.t.models.set(f.name, copy(f));
  }

  async resetAll() {
    this.t = empty();
  }

  async importDemo(d: DemoData) {
    await this.saveElder(d.elder);
    for (const x of d.people) await this.savePerson(x);
    for (const x of d.medicines) await this.saveMedicine(x);
    for (const x of d.pillProfiles) await this.savePillProfile(x);
    for (const x of d.schedule) await this.saveScheduleItem(x);
    for (const x of d.doseEvents) await this.saveDoseEvent(x);
    for (const x of d.alerts) await this.saveAlert(x);
  }
}
