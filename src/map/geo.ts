import type { BoundaryPoint } from '../db/types';

export function boundaryToPolygon(boundary: BoundaryPoint[]): GeoJSON.Polygon {
  const ring = boundary.map((point): [number, number] => [point.longitude, point.latitude]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closedRing = first && (first[0] !== last[0] || first[1] !== last[1]) ? [...ring, first] : ring;
  return { type: 'Polygon', coordinates: [closedRing] };
}

export function boundaryToLineString(boundary: BoundaryPoint[]): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: boundary.map((point): [number, number] => [point.longitude, point.latitude]),
  };
}
