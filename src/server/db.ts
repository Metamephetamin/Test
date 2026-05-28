import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { JournalEntry, WorkType } from "../shared/journal";

export type AppDatabase = {
  sqlite: Database.Database;
  close: () => void;
};

type EntryRow = {
  id: number;
  work_date: string;
  work_type_id: number;
  work_type_name: string;
  quantity: number;
  unit: string;
  performer: string;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type WorkTypeRow = {
  id: number;
  name: string;
  default_unit: string;
};

const workTypes: WorkType[] = [
  { id: 1, name: "Кладка перегородок", defaultUnit: "м3" },
  { id: 2, name: "Монтаж опалубки", defaultUnit: "м2" },
  { id: 3, name: "Бетонирование", defaultUnit: "м3" },
  { id: 4, name: "Армирование", defaultUnit: "м.п." },
  { id: 5, name: "Монтаж инженерных сетей", defaultUnit: "м.п." },
  { id: 6, name: "Отделочные работы", defaultUnit: "м2" }
];

export function createDatabase(dbPath = process.env.DATABASE_PATH ?? "data/work-journal.sqlite"): AppDatabase {
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const sqlite = new Database(dbPath);
  initializeDatabase(sqlite);

  return {
    sqlite,
    close: () => sqlite.close()
  };
}

export function createTestDatabase(): AppDatabase {
  return createDatabase(":memory:");
}

export function initializeDatabase(sqlite: Database.Database) {
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS work_types (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_unit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_date TEXT NOT NULL,
      work_type_id INTEGER NOT NULL REFERENCES work_types(id),
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT NOT NULL,
      performer TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_journal_entries_work_date
      ON journal_entries(work_date DESC);
  `);

  const seed = sqlite.prepare(`
    INSERT INTO work_types (id, name, default_unit)
    VALUES (@id, @name, @defaultUnit)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      default_unit = excluded.default_unit
  `);

  const seedMany = sqlite.transaction((items: WorkType[]) => {
    items.forEach((item) => seed.run(item));
  });
  seedMany(workTypes);
}

export function listWorkTypes(database: AppDatabase): WorkType[] {
  const rows = database.sqlite
    .prepare("SELECT id, name, default_unit FROM work_types ORDER BY name")
    .all() as WorkTypeRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultUnit: row.default_unit
  }));
}

export function workTypeExists(database: AppDatabase, id: number): boolean {
  const row = database.sqlite.prepare("SELECT id FROM work_types WHERE id = ?").get(id);
  return Boolean(row);
}

export function findOrCreateWorkType(database: AppDatabase, name: string, defaultUnit: string): WorkType {
  const normalizedName = name.trim();
  const normalizedUnit = defaultUnit.trim();
  const existing = database.sqlite
    .prepare("SELECT id, name, default_unit FROM work_types WHERE name = ?")
    .get(normalizedName) as WorkTypeRow | undefined;

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      defaultUnit: existing.default_unit
    };
  }

  const result = database.sqlite
    .prepare("INSERT INTO work_types (name, default_unit) VALUES (?, ?)")
    .run(normalizedName, normalizedUnit);

  return {
    id: Number(result.lastInsertRowid),
    name: normalizedName,
    defaultUnit: normalizedUnit
  };
}

export function toJournalEntry(row: EntryRow): JournalEntry {
  return {
    id: row.id,
    workDate: row.work_date,
    workTypeId: row.work_type_id,
    workTypeName: row.work_type_name,
    quantity: row.quantity,
    unit: row.unit,
    performer: row.performer,
    comment: row.comment ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getEntryById(database: AppDatabase, id: number): JournalEntry | null {
  const row = database.sqlite
    .prepare(
      `
      SELECT
        e.id,
        e.work_date,
        e.work_type_id,
        wt.name AS work_type_name,
        e.quantity,
        e.unit,
        e.performer,
        e.comment,
        e.created_at,
        e.updated_at
      FROM journal_entries e
      JOIN work_types wt ON wt.id = e.work_type_id
      WHERE e.id = ?
    `
    )
    .get(id) as EntryRow | undefined;

  return row ? toJournalEntry(row) : null;
}
