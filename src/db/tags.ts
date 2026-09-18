import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from './index';

export async function listAllTagNames(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>('SELECT name FROM tags ORDER BY name COLLATE NOCASE ASC');
  return rows.map((row) => row.name);
}

export async function listTagsForPlot(plotId: number): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT tags.name AS name
     FROM tags
     JOIN plot_tags ON plot_tags.tag_id = tags.id
     WHERE plot_tags.plot_id = ?
     ORDER BY tags.name COLLATE NOCASE ASC`,
    plotId,
  );
  return rows.map((row) => row.name);
}

async function getOrCreateTagId(db: SQLiteDatabase, name: string): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM tags WHERE name = ?', name);
  if (existing) return existing.id;
  const result = await db.runAsync('INSERT INTO tags (name) VALUES (?)', name);
  return result.lastInsertRowId;
}

// Replaces a plot's full tag set. Tag rows are created on demand and never
// deleted here (they may still be used by other plots, and an unused tag is
// harmless — it just won't show up on any plot).
export async function setPlotTags(plotId: number, tagNames: string[]): Promise<void> {
  const db = await getDatabase();
  const normalized = Array.from(new Set(tagNames.map((name) => name.trim()).filter((name) => name.length > 0)));

  await db.runAsync('DELETE FROM plot_tags WHERE plot_id = ?', plotId);
  for (const name of normalized) {
    const tagId = await getOrCreateTagId(db, name);
    await db.runAsync('INSERT OR IGNORE INTO plot_tags (plot_id, tag_id) VALUES (?, ?)', plotId, tagId);
  }
}
