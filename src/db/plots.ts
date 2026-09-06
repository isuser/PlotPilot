import { getDatabase } from './index';
import type { BoundaryPoint, NewPlot, Plot, PlotUpdate } from './types';

interface PlotRow {
  id: number;
  name: string;
  boundary: string | null;
  area: number | null;
  perimeter: number | null;
  latitude: number | null;
  longitude: number | null;
  crop: string | null;
  soil_type: string | null;
  notes: string | null;
  created_at: string;
}

function toPlot(row: PlotRow): Plot {
  return {
    id: row.id,
    name: row.name,
    boundary: row.boundary ? (JSON.parse(row.boundary) as BoundaryPoint[]) : null,
    area: row.area,
    perimeter: row.perimeter,
    latitude: row.latitude,
    longitude: row.longitude,
    crop: row.crop,
    soilType: row.soil_type,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function createPlot(input: NewPlot): Promise<Plot> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO plots (name, boundary, area, perimeter, latitude, longitude, crop, soil_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.boundary ? JSON.stringify(input.boundary) : null,
    input.area ?? null,
    input.perimeter ?? null,
    input.latitude ?? null,
    input.longitude ?? null,
    input.crop ?? null,
    input.soilType ?? null,
    input.notes ?? null,
  );
  const plot = await getPlot(result.lastInsertRowId);
  if (!plot) throw new Error('Failed to create plot');
  return plot;
}

export async function getPlot(id: number): Promise<Plot | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PlotRow>('SELECT * FROM plots WHERE id = ?', id);
  return row ? toPlot(row) : null;
}

export async function listPlots(): Promise<Plot[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlotRow>('SELECT * FROM plots ORDER BY name ASC');
  return rows.map(toPlot);
}

export async function updatePlot(id: number, input: PlotUpdate): Promise<Plot | null> {
  const existing = await getPlot(id);
  if (!existing) return null;

  const merged: NewPlot = {
    name: input.name ?? existing.name,
    boundary: input.boundary !== undefined ? input.boundary : existing.boundary,
    area: input.area !== undefined ? input.area : existing.area,
    perimeter: input.perimeter !== undefined ? input.perimeter : existing.perimeter,
    latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
    longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
    crop: input.crop !== undefined ? input.crop : existing.crop,
    soilType: input.soilType !== undefined ? input.soilType : existing.soilType,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  };

  const db = await getDatabase();
  await db.runAsync(
    `UPDATE plots
     SET name = ?, boundary = ?, area = ?, perimeter = ?, latitude = ?, longitude = ?, crop = ?, soil_type = ?, notes = ?
     WHERE id = ?`,
    merged.name,
    merged.boundary ? JSON.stringify(merged.boundary) : null,
    merged.area ?? null,
    merged.perimeter ?? null,
    merged.latitude ?? null,
    merged.longitude ?? null,
    merged.crop ?? null,
    merged.soilType ?? null,
    merged.notes ?? null,
    id,
  );
  return getPlot(id);
}

export async function deletePlot(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM plots WHERE id = ?', id);
}
