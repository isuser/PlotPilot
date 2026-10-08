import { listAllActivities } from './activities';
import { listPlots } from './plots';
import { listTagsByPlot } from './tags';
import type { Activity, Plot } from './types';
import type { LanguagePreference } from '../i18n';
import type { ThemePreference } from '../theme/ThemeContext';

export interface ExportedPlot extends Plot {
  tags: string[];
}

export interface ExportedSettings {
  themePreference?: ThemePreference;
  languagePreference?: LanguagePreference;
}

export interface DataExport {
  exportedAt: string;
  plots: ExportedPlot[];
  activities: Activity[];
  settings?: ExportedSettings;
}

// Exports only the given plots, each with its tags and activities attached.
// App settings are included only when passed in.
export async function buildDataExport(plotIds: number[], settings?: ExportedSettings): Promise<DataExport> {
  const selected = new Set(plotIds);
  const [allPlots, activitiesWithPlot, tagsByPlot] = await Promise.all([
    listPlots(),
    listAllActivities(),
    listTagsByPlot(),
  ]);

  const plots: ExportedPlot[] = allPlots
    .filter((plot) => selected.has(plot.id))
    .map((plot) => ({ ...plot, tags: tagsByPlot.get(plot.id) ?? [] }));
  const activities: Activity[] = activitiesWithPlot
    .filter((activity) => selected.has(activity.plotId))
    .map(({ plotName: _plotName, plotColor: _plotColor, ...activity }) => activity);

  return {
    exportedAt: new Date().toISOString(),
    plots,
    activities,
    ...(settings ? { settings } : {}),
  };
}
