import { getDatabase } from './index';
import type { Activity, ActivityUpdate, NewActivity } from './types';

export const DEFAULT_ACTIVITY_TYPES = [
  'Planting',
  'Fertilizing',
  'Spraying',
  'Irrigation',
  'Harvesting',
];

interface ActivityRow {
  id: number;
  plot_id: number;
  type: string;
  date: string;
  notes: string | null;
  created_at: string;
}

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    plotId: row.plot_id,
    type: row.type,
    date: row.date,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function createActivity(input: NewActivity): Promise<Activity> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO activities (plot_id, type, date, notes) VALUES (?, ?, ?, ?)',
    input.plotId,
    input.type,
    input.date,
    input.notes ?? null,
  );
  const activity = await getActivity(result.lastInsertRowId);
  if (!activity) throw new Error('Failed to create activity');
  return activity;
}

export async function getActivity(id: number): Promise<Activity | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ActivityRow>('SELECT * FROM activities WHERE id = ?', id);
  return row ? toActivity(row) : null;
}

export async function listActivitiesForPlot(plotId: number): Promise<Activity[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActivityRow>(
    'SELECT * FROM activities WHERE plot_id = ? ORDER BY date DESC, id DESC',
    plotId,
  );
  return rows.map(toActivity);
}

export async function listAllActivities(): Promise<Activity[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActivityRow>(
    'SELECT * FROM activities ORDER BY date DESC, id DESC',
  );
  return rows.map(toActivity);
}

export async function updateActivity(id: number, input: ActivityUpdate): Promise<Activity | null> {
  const existing = await getActivity(id);
  if (!existing) return null;

  const merged = {
    type: input.type ?? existing.type,
    date: input.date ?? existing.date,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  };

  const db = await getDatabase();
  await db.runAsync(
    'UPDATE activities SET type = ?, date = ?, notes = ? WHERE id = ?',
    merged.type,
    merged.date,
    merged.notes ?? null,
    id,
  );
  return getActivity(id);
}

export async function deleteActivity(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM activities WHERE id = ?', id);
}

export async function listDistinctActivityTypes(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ type: string }>(
    'SELECT DISTINCT type FROM activities ORDER BY type COLLATE NOCASE ASC',
  );
  return rows.map((row) => row.type);
}
