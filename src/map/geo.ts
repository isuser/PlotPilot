import type { BoundaryPoint } from '../db/types';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceMeters(a: BoundaryPoint, b: BoundaryPoint): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Sum of great-circle edge lengths around a closed boundary ring. */
export function polygonPerimeterMeters(boundary: BoundaryPoint[]): number {
  if (boundary.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < boundary.length; i++) {
    total += haversineDistanceMeters(boundary[i], boundary[(i + 1) % boundary.length]);
  }
  return total;
}

/**
 * Spherical polygon area (Chamberlain & Duquette, "Some Algorithms for
 * Polygons on a Sphere", JPL) — the same algorithm behind Turf.js's
 * `@turf/area`. Accurate for small-to-moderate plot sizes.
 */
export function polygonAreaHectares(boundary: BoundaryPoint[]): number {
  const n = boundary.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const p1 = boundary[(i - 1 + n) % n];
    const p2 = boundary[i];
    const p3 = boundary[(i + 1) % n];
    total += (toRadians(p3.longitude) - toRadians(p1.longitude)) * Math.sin(toRadians(p2.latitude));
  }
  const areaSquareMeters = Math.abs((total * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS) / 2);
  return areaSquareMeters / 10000;
}

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
