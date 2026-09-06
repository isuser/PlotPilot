import type { SQLiteDatabase } from 'expo-sqlite';

export async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      boundary TEXT,
      area REAL,
      perimeter REAL,
      latitude REAL,
      longitude REAL,
      crop TEXT,
      soil_type TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activities_plot_id ON activities(plot_id);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
  `);
}
