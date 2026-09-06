export interface BoundaryPoint {
  latitude: number;
  longitude: number;
}

export interface Plot {
  id: number;
  name: string;
  boundary: BoundaryPoint[] | null;
  area: number | null;
  perimeter: number | null;
  latitude: number | null;
  longitude: number | null;
  crop: string | null;
  soilType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface NewPlot {
  name: string;
  boundary?: BoundaryPoint[] | null;
  area?: number | null;
  perimeter?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  crop?: string | null;
  soilType?: string | null;
  notes?: string | null;
}

export type PlotUpdate = Partial<NewPlot>;

export interface Activity {
  id: number;
  plotId: number;
  type: string;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface NewActivity {
  plotId: number;
  type: string;
  date: string;
  notes?: string | null;
}

export type ActivityUpdate = Partial<Omit<NewActivity, 'plotId'>>;
