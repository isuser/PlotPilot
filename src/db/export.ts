import { listAllActivities } from './activities';
import { listPlots } from './plots';
import type { Activity, Plot } from './types';

export interface DataExport {
  exportedAt: string;
  plots: Plot[];
  activities: Activity[];
}

export async function buildDataExport(): Promise<DataExport> {
  const [plots, activitiesWithPlot] = await Promise.all([listPlots(), listAllActivities()]);
  const activities: Activity[] = activitiesWithPlot.map(
    ({ plotName: _plotName, plotColor: _plotColor, ...activity }) => activity,
  );
  return { exportedAt: new Date().toISOString(), plots, activities };
}
