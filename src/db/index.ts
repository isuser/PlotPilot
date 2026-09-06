import { type SQLiteDatabase, openDatabaseAsync } from 'expo-sqlite';

const DATABASE_NAME = 'plotpilot.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

// PLO-2 owns the actual plot/activity schema; this just opens the
// on-device database that will be the app's source of truth.
async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
}

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
