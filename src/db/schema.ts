import type { SQLiteDatabase } from 'expo-sqlite';

export async function createSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      boundary TEXT,
      color TEXT,
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

  // CREATE TABLE IF NOT EXISTS above is a no-op on databases that already
  // exist from before the `color` column was added, so backfill it here.
  await addColumnIfMissing(db, 'plots', 'color', 'TEXT');
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}
