import * as SQLite from 'expo-sqlite';
import type {
  Alert,
  AuditEntry,
  CalibrationData,
  DemoData,
  DoseEvent,
  Elder,
  Lang,
  LookalikePair,
  Medicine,
  ModelFile,
  Person,
  PillProfile,
  QuestionEvent,
  ScheduleItem,
  VoiceClip,
} from '@mathaka/core';
import { ALL_TABLES, DB_VERSION, MIGRATIONS } from './migrations';
import type { Repository } from './repository';

type Row = Record<string, string | number | null>;
const json = (v: unknown) => JSON.stringify(v);
const parse = <T>(v: string | number | null | undefined): T => JSON.parse(String(v)) as T;
const opt = (v: string | number | null | undefined) => (v == null ? undefined : String(v));

export class SqliteRepository implements Repository {
  readonly kind = 'sqlite' as const;
  private db!: SQLite.SQLiteDatabase;

  constructor(private readonly name = 'mathaka.db') {}

  async init(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(this.name);
    await this.db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const row = await this.db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    let version = row?.user_version ?? 0;
    while (version < DB_VERSION) {
      const sql = MIGRATIONS[version]!;
      const next = version + 1;
      await this.db.withExclusiveTransactionAsync(async (tx) => {
        await tx.execAsync(sql);
        await tx.execAsync(`PRAGMA user_version = ${next}`);
      });
      version = next;
    }
  }

  private all(sql: string, ...params: (string | number | null)[]) {
    return this.db.getAllAsync<Row>(sql, params);
  }
  private run(sql: string, ...params: (string | number | null)[]) {
    return this.db.runAsync(sql, params);
  }

  // ---- settings ----
  async getSetting<T>(key: string): Promise<T | null> {
    const r = await this.db.getFirstAsync<Row>('SELECT value FROM settings WHERE key = ?', [key]);
    return r ? parse<T>(r.value) : null;
  }
  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, json(value));
  }

  // ---- elder ----
  async getElder(): Promise<Elder | null> {
    const r = await this.db.getFirstAsync<Row>('SELECT * FROM elder LIMIT 1');
    if (!r) return null;
    return {
      id: String(r.id),
      preferredName: String(r.preferred_name),
      language: r.language as Lang,
      times: parse(r.times),
      a11y: parse(r.a11y),
    };
  }
  async saveElder(e: Elder): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO elder (id, preferred_name, language, times, a11y) VALUES (?, ?, ?, ?, ?)',
      e.id, e.preferredName, e.language, json(e.times), json(e.a11y),
    );
  }

  // ---- people ----
  async listPeople(): Promise<Person[]> {
    return (await this.all('SELECT * FROM person ORDER BY name')).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      role: r.role as Person['role'],
      relation: opt(r.relation),
      phone: opt(r.phone),
      photoPath: opt(r.photo_path),
      photoAsset: opt(r.photo_asset),
    }));
  }
  async savePerson(p: Person): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO person (id, name, role, relation, phone, photo_path, photo_asset) VALUES (?, ?, ?, ?, ?, ?, ?)',
      p.id, p.name, p.role, p.relation ?? null, p.phone ?? null, p.photoPath ?? null, p.photoAsset ?? null,
    );
  }

  // ---- medicines ----
  async listMedicines(): Promise<Medicine[]> {
    return (await this.all('SELECT * FROM medicine ORDER BY name')).map((r) => ({
      id: String(r.id),
      name: String(r.name),
      strength: String(r.strength),
      form: r.form as Medicine['form'],
      purpose: { si: String(r.purpose_si), ta: String(r.purpose_ta), en: String(r.purpose_en) },
      receivedCount: Number(r.received_count),
      remainingCount: Number(r.remaining_count),
    }));
  }
  async saveMedicine(m: Medicine): Promise<void> {
    await this.run(
      `INSERT OR REPLACE INTO medicine
       (id, name, strength, form, purpose_si, purpose_ta, purpose_en, received_count, remaining_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      m.id, m.name, m.strength, m.form, m.purpose.si, m.purpose.ta, m.purpose.en, m.receivedCount, m.remainingCount,
    );
  }

  // ---- pill profiles ----
  async listPillProfiles(): Promise<PillProfile[]> {
    return (await this.all('SELECT * FROM pill_profile')).map((r) => ({
      id: String(r.id),
      medicineId: String(r.medicine_id),
      spec: parse(r.spec),
      description: String(r.description),
      photoPaths: parse(r.photo_paths),
      assetKey: opt(r.asset_key),
      embeddings: r.embeddings == null ? undefined : parse(r.embeddings),
      calibratedBy: opt(r.calibrated_by),
      approvedBy: opt(r.approved_by),
      version: Number(r.version),
    }));
  }
  async savePillProfile(p: PillProfile): Promise<void> {
    await this.run(
      `INSERT OR REPLACE INTO pill_profile
       (id, medicine_id, spec, description, photo_paths, asset_key, embeddings, calibrated_by, approved_by, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p.id, p.medicineId, json(p.spec), p.description, json(p.photoPaths), p.assetKey ?? null,
      p.embeddings ? json(p.embeddings) : null, p.calibratedBy ?? null, p.approvedBy ?? null, p.version,
    );
  }

  // ---- look-alikes ----
  async listLookalikes(): Promise<LookalikePair[]> {
    return (await this.all('SELECT * FROM lookalike_pair')).map((r) => ({
      id: String(r.id),
      profileA: String(r.profile_a),
      profileB: String(r.profile_b),
      distance: Number(r.distance),
      note: opt(r.note),
    }));
  }
  async saveLookalike(p: LookalikePair): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO lookalike_pair (id, profile_a, profile_b, distance, note) VALUES (?, ?, ?, ?, ?)',
      p.id, p.profileA, p.profileB, p.distance, p.note ?? null,
    );
  }

  // ---- schedule ----
  async listSchedule(): Promise<ScheduleItem[]> {
    return (await this.all('SELECT * FROM schedule_item')).map((r) => ({
      id: String(r.id),
      medicineId: String(r.medicine_id),
      slot: r.slot as ScheduleItem['slot'],
      count: Number(r.count),
      meal: r.meal as ScheduleItem['meal'],
    }));
  }
  async saveScheduleItem(s: ScheduleItem): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO schedule_item (id, medicine_id, slot, count, meal) VALUES (?, ?, ?, ?, ?)',
      s.id, s.medicineId, s.slot, s.count, s.meal,
    );
  }
  async deleteScheduleItem(id: string): Promise<void> {
    await this.run('DELETE FROM schedule_item WHERE id = ?', id);
  }

  // ---- dose events ----
  async listDoseEvents(fromDate: string, toDate: string): Promise<DoseEvent[]> {
    const rows = await this.all(
      'SELECT * FROM dose_event WHERE date >= ? AND date <= ? ORDER BY date, at',
      fromDate, toDate,
    );
    return rows.map((r) => ({
      id: String(r.id),
      date: String(r.date),
      slot: r.slot as DoseEvent['slot'],
      status: r.status as DoseEvent['status'],
      source: r.source as DoseEvent['source'],
      at: r.at == null ? null : String(r.at),
    }));
  }
  async saveDoseEvent(e: DoseEvent): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO dose_event (id, date, slot, status, source, at) VALUES (?, ?, ?, ?, ?, ?)',
      e.id, e.date, e.slot, e.status, e.source, e.at,
    );
  }

  // ---- questions ----
  async addQuestionEvent(q: QuestionEvent): Promise<void> {
    await this.run(
      'INSERT INTO question_event (id, at, date, intent, via) VALUES (?, ?, ?, ?, ?)',
      q.id, q.at, q.date, q.intent, q.via,
    );
  }
  async listQuestionEvents(date: string): Promise<QuestionEvent[]> {
    return (await this.all('SELECT * FROM question_event WHERE date = ? ORDER BY at', date)).map((r) => ({
      id: String(r.id),
      at: String(r.at),
      date: String(r.date),
      intent: r.intent as QuestionEvent['intent'],
      via: r.via as QuestionEvent['via'],
    }));
  }

  // ---- alerts ----
  async listAlerts(): Promise<Alert[]> {
    return (await this.all('SELECT * FROM alert ORDER BY created_at DESC')).map((r) => ({
      id: String(r.id),
      kind: r.kind as Alert['kind'],
      date: String(r.date),
      slot: opt(r.slot) as Alert['slot'],
      createdAt: String(r.created_at),
      readAt: r.read_at == null ? null : String(r.read_at),
      data: r.data == null ? undefined : parse(r.data),
    }));
  }
  async saveAlert(a: Alert): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO alert (id, kind, date, slot, created_at, read_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      a.id, a.kind, a.date, a.slot ?? null, a.createdAt, a.readAt, a.data ? json(a.data) : null,
    );
  }

  // ---- voice clips ----
  async listVoiceClips(): Promise<VoiceClip[]> {
    return (await this.all('SELECT * FROM voice_clip')).map((r) => ({
      id: String(r.id),
      phraseKey: String(r.phrase_key),
      lang: r.lang as Lang,
      path: String(r.path),
      recordedBy: String(r.recorded_by),
      consentAt: String(r.consent_at),
    }));
  }
  async saveVoiceClip(c: VoiceClip): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO voice_clip (id, phrase_key, lang, path, recorded_by, consent_at) VALUES (?, ?, ?, ?, ?, ?)',
      c.id, c.phraseKey, c.lang, c.path, c.recordedBy, c.consentAt,
    );
  }

  // ---- audit ----
  async addAudit(e: AuditEntry): Promise<void> {
    await this.run(
      'INSERT INTO audit_log (id, at, actor, action, details) VALUES (?, ?, ?, ?, ?)',
      e.id, e.at, e.actor, e.action, e.details ?? null,
    );
  }
  async listAudit(): Promise<AuditEntry[]> {
    return (await this.all('SELECT * FROM audit_log ORDER BY at')).map((r) => ({
      id: String(r.id),
      at: String(r.at),
      actor: String(r.actor),
      action: String(r.action),
      details: opt(r.details),
    }));
  }

  // ---- model files ----
  async listModelFiles(): Promise<ModelFile[]> {
    return (await this.all('SELECT * FROM model_file')).map((r) => ({
      name: String(r.name),
      path: String(r.path),
      sha256: String(r.sha256),
      size: Number(r.size),
    }));
  }
  async saveModelFile(f: ModelFile): Promise<void> {
    await this.run(
      'INSERT OR REPLACE INTO model_file (name, path, sha256, size) VALUES (?, ?, ?, ?)',
      f.name, f.path, f.sha256, f.size,
    );
  }

  async resetAll(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      for (const t of ALL_TABLES) await tx.execAsync(`DELETE FROM ${t}`);
    });
  }

  async replaceCalibration(d: CalibrationData): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      // children first (foreign keys)
      for (const t of ['schedule_item', 'pill_profile', 'lookalike_pair', 'voice_clip', 'medicine', 'person', 'elder']) {
        await this.db.execAsync(`DELETE FROM ${t}`);
      }
      await this.saveElder(d.elder);
      for (const x of d.people) await this.savePerson(x);
      for (const x of d.medicines) await this.saveMedicine(x);
      for (const x of d.pillProfiles) await this.savePillProfile(x);
      for (const x of d.schedule) await this.saveScheduleItem(x);
      for (const x of d.lookalikes) await this.saveLookalike(x);
      for (const x of d.voiceClips) await this.saveVoiceClip(x);
    });
  }

  async importDemo(d: DemoData): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.saveElder(d.elder);
      for (const x of d.people) await this.savePerson(x);
      for (const x of d.medicines) await this.saveMedicine(x);
      for (const x of d.pillProfiles) await this.savePillProfile(x);
      for (const x of d.schedule) await this.saveScheduleItem(x);
      for (const x of d.doseEvents) await this.saveDoseEvent(x);
      for (const x of d.alerts) await this.saveAlert(x);
    });
  }
}
