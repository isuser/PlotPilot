export type RootStackParamList = {
  Home: undefined;
  Map: { focusPlotId?: number } | undefined;
  PlotForm: { initialCenter?: [number, number] } | undefined;
  PlotDetail: { plotId: number };
  ActivityForm: { plotId: number; activityId?: number };
  Timeline: undefined;
  Settings: undefined;
};
