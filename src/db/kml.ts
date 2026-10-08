import { DOMParser, onErrorStopParsing, type Element, type Node } from '@xmldom/xmldom';

import { PLOT_COLORS } from '../map/plotColors';
import { createPlot } from './plots';
import type { BoundaryPoint } from './types';

export type KmlParseErrorCode = 'notXml' | 'notKml' | 'noPolygons';

export class KmlParseError extends Error {
  constructor(public code: KmlParseErrorCode) {
    super(code);
  }
}

export interface KmlPlot {
  name: string | null;
  boundary: BoundaryPoint[];
}

export interface KmlParseResult {
  plots: KmlPlot[];
  // Placemarks with no usable polygon (points, paths, broken coordinates).
  skippedPlacemarks: number;
}

const ELEMENT_NODE = 1;

// Matches by local name so both namespaced (`<kml xmlns="…">`, `kml:Placemark`)
// and namespace-less files work.
function childElements(node: Node, localName: string): Element[] {
  const result: Element[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === ELEMENT_NODE && (child as Element).localName === localName) {
      result.push(child as Element);
    }
  }
  return result;
}

function descendantElements(node: Node, localName: string): Element[] {
  const result: Element[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType !== ELEMENT_NODE) continue;
    if ((child as Element).localName === localName) result.push(child as Element);
    result.push(...descendantElements(child, localName));
  }
  return result;
}

// KML coordinates are whitespace-separated "lon,lat[,alt]" tuples. The ring
// repeats its first point at the end, which PlotPilot boundaries don't.
// Returns null if any tuple is malformed or there are fewer than 3 points.
function parseRing(text: string): BoundaryPoint[] | null {
  const points: BoundaryPoint[] = [];
  for (const tuple of text.trim().split(/\s+/)) {
    if (!tuple) continue;
    const [longitude, latitude] = tuple.split(',').map(Number);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return null;
    }
    points.push({ latitude, longitude });
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && first.latitude === last.latitude && first.longitude === last.longitude) {
    points.pop();
  }
  return points.length >= 3 ? points : null;
}

// Each Polygon's outer ring becomes one plot; inner rings (holes) are
// ignored. A Placemark with a MultiGeometry of several polygons yields one
// plot per polygon, numbered after the first.
export function parseKml(raw: string): KmlParseResult {
  let root: Element | null;
  try {
    const doc = new DOMParser({ onError: onErrorStopParsing }).parseFromString(raw, 'text/xml');
    root = doc.documentElement;
  } catch {
    throw new KmlParseError('notXml');
  }
  if (!root || root.localName !== 'kml') throw new KmlParseError('notKml');

  const plots: KmlPlot[] = [];
  let skippedPlacemarks = 0;

  for (const placemark of descendantElements(root, 'Placemark')) {
    const name = childElements(placemark, 'name')[0]?.textContent?.trim() || null;
    const rings: BoundaryPoint[][] = [];
    for (const polygon of descendantElements(placemark, 'Polygon')) {
      const outer = childElements(polygon, 'outerBoundaryIs')[0];
      const coordinates = outer && descendantElements(outer, 'coordinates')[0];
      const ring = coordinates ? parseRing(coordinates.textContent ?? '') : null;
      if (ring) rings.push(ring);
    }

    if (rings.length === 0) {
      skippedPlacemarks += 1;
      continue;
    }
    rings.forEach((boundary, index) => {
      plots.push({ name: name && index > 0 ? `${name} (${index + 1})` : name, boundary });
    });
  }

  if (plots.length === 0) throw new KmlParseError('noPolygons');
  return { plots, skippedPlacemarks };
}

// Inserts every parsed polygon as a new plot. Area, perimeter and location
// are derived from the boundary by createPlot; colors cycle through the
// palette so neighbouring imported plots are easy to tell apart.
export async function importKmlPlots(plots: KmlPlot[], fallbackName: (index: number) => string): Promise<number> {
  let unnamed = 0;
  for (const [index, plot] of plots.entries()) {
    await createPlot({
      name: plot.name ?? fallbackName(++unnamed),
      boundary: plot.boundary,
      color: PLOT_COLORS[index % PLOT_COLORS.length],
    });
  }
  return plots.length;
}
