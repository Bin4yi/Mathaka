/**
 * Versioned SQLite migrations. Index i upgrades the DB from version i to i+1.
 * Never edit a migration that has shipped; add a new one.
 * Nested objects (specs, purposes, a11y prefs) are stored as JSON text.
 */
export const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

  CREATE TABLE elder (
    id TEXT PRIMARY KEY NOT NULL,
    preferred_name TEXT NOT NULL,
    language TEXT NOT NULL,
    times TEXT NOT NULL,
    a11y TEXT NOT NULL
  );

  CREATE TABLE person (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('buddy','family')),
    relation TEXT,
    phone TEXT,
    photo_path TEXT,
    photo_asset TEXT
  );

  CREATE TABLE medicine (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    strength TEXT NOT NULL,
    form TEXT NOT NULL,
    purpose_si TEXT NOT NULL,
    purpose_ta TEXT NOT NULL,
    purpose_en TEXT NOT NULL,
    received_count INTEGER NOT NULL,
    remaining_count INTEGER NOT NULL
  );

  CREATE TABLE pill_profile (
    id TEXT PRIMARY KEY NOT NULL,
    medicine_id TEXT NOT NULL REFERENCES medicine(id),
    spec TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_paths TEXT NOT NULL,
    asset_key TEXT,
    embeddings TEXT,
    calibrated_by TEXT,
    approved_by TEXT,
    version INTEGER NOT NULL
  );

  CREATE TABLE lookalike_pair (
    id TEXT PRIMARY KEY NOT NULL,
    profile_a TEXT NOT NULL,
    profile_b TEXT NOT NULL,
    distance REAL NOT NULL,
    note TEXT
  );

  CREATE TABLE schedule_item (
    id TEXT PRIMARY KEY NOT NULL,
    medicine_id TEXT NOT NULL REFERENCES medicine(id),
    slot TEXT NOT NULL CHECK (slot IN ('morning','noon','evening','night')),
    count REAL NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('before','after','any'))
  );

  CREATE TABLE dose_event (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    slot TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('due','taken','missed','prevented_double','unsure')),
    source TEXT NOT NULL,
    at TEXT
  );
  CREATE INDEX dose_event_date ON dose_event (date);

  CREATE TABLE question_event (
    id TEXT PRIMARY KEY NOT NULL,
    at TEXT NOT NULL,
    date TEXT NOT NULL,
    intent TEXT NOT NULL,
    via TEXT NOT NULL
  );
  CREATE INDEX question_event_date ON question_event (date);

  CREATE TABLE alert (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    date TEXT NOT NULL,
    slot TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT,
    data TEXT
  );

  CREATE TABLE voice_clip (
    id TEXT PRIMARY KEY NOT NULL,
    phrase_key TEXT NOT NULL,
    lang TEXT NOT NULL,
    path TEXT NOT NULL,
    recorded_by TEXT NOT NULL,
    consent_at TEXT NOT NULL
  );

  CREATE TABLE audit_log (
    id TEXT PRIMARY KEY NOT NULL,
    at TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT
  );

  CREATE TABLE model_file (
    name TEXT PRIMARY KEY NOT NULL,
    path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size INTEGER NOT NULL
  );
  `,
];

export const DB_VERSION = MIGRATIONS.length;

export const ALL_TABLES = [
  'settings', 'elder', 'person', 'medicine', 'pill_profile', 'lookalike_pair', 'schedule_item',
  'dose_event', 'question_event', 'alert', 'voice_clip', 'audit_log', 'model_file',
] as const;
