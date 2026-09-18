import { createActivity } from './activities';
import { createPlot } from './plots';
import type { DataExport } from './export';
import type { BoundaryPoint } from './types';

export type ImportParseErrorCode = 'notJson' | 'badShape' | 'badPlots' | 'badActivities';

export class ImportParseError extends Error {
  constructor(public code: ImportParseErrorCode) {
    super(code);
  }
}

function isBoundaryPoint(value: unknown): value is BoundaryPoint {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.latitude === 'number' && typeof v.longitude === 'number';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

function isImportPlot(value: unknown): value is DataExport['plots'][number] {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    typeof v.name === 'string' &&
    v.name.trim().length > 0 &&
    (v.boundary === null || (Array.isArray(v.boundary) && v.boundary.every(isBoundaryPoint))) &&
    isNullableString(v.color) &&
    isNullableString(v.crop) &&
    isNullableString(v.soilType) &&
    isNullableString(v.notes) &&
    isNullableNumber(v.latitude) &&
    isNullableNumber(v.longitude)
  );
}

function isImportActivity(value: unknown): value is DataExport['activities'][number] {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.plotId === 'number' &&
    typeof v.type === 'string' &&
    v.type.trim().length > 0 &&
    typeof v.date === 'string' &&
    v.date.trim().length > 0 &&
    isNullableString(v.notes)
  );
}

// Parses and structurally validates a pasted export payload without writing
// anything, so the caller can show a summary ("12 plots, 40 activities")
// before committing.
export function parseDataExport(raw: string): DataExport {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ImportParseError('notJson');
  }

  if (typeof json !== 'object' || json === null) throw new ImportParseError('badShape');
  const { plots, activities } = json as Record<string, unknown>;

  if (!Array.isArray(plots) || !plots.every(isImportPlot)) throw new ImportParseError('badPlots');
  if (!Array.isArray(activities) || !activities.every(isImportActivity)) {
    throw new ImportParseError('badActivities');
  }

  const exportedAt = (json as { exportedAt?: unknown }).exportedAt;
  return { exportedAt: typeof exportedAt === 'string' ? exportedAt : '', plots, activities };
}

export interface ImportResult {
  plotsImported: number;
  activitiesImported: number;
}

// Every plot/activity is inserted as a brand-new record — imported ids are
// only used to relink each activity to the newly created plot it belonged
// to, never to overwrite or merge with an existing plot.
export async function importDataExport(data: DataExport): Promise<ImportResult> {
  const idMap = new Map<number, number>();

  for (const plot of data.plots) {
    const created = await createPlot({
      name: plot.name,
      boundary: plot.boundary,
      color: plot.color,
      latitude: plot.latitude,
      longitude: plot.longitude,
      crop: plot.crop,
      soilType: plot.soilType,
      notes: plot.notes,
    });
    idMap.set(plot.id, created.id);
  }

  let activitiesImported = 0;
  for (const activity of data.activities) {
    const newPlotId = idMap.get(activity.plotId);
    if (newPlotId === undefined) continue;
    await createActivity({
      plotId: newPlotId,
      type: activity.type,
      date: activity.date,
      notes: activity.notes,
    });
    activitiesImported += 1;
  }

  return { plotsImported: data.plots.length, activitiesImported };
}
