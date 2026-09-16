export type RootStackParamList = {
  Map: undefined;
  PlotForm: { initialCenter?: [number, number] } | undefined;
  PlotDetail: { plotId: number };
  ActivityForm: { plotId: number; activityId?: number };
  Timeline: undefined;
};
