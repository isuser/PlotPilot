import type { StyleSpecification } from '@maplibre/maplibre-react-native';

/**
 * Minimal MapLibre style wrapping the OSM raster tile layer.
 * See https://operations.osmfoundation.org/policies/tiles/ for usage limits;
 * revisit with a dedicated tile provider before production traffic.
 */
export const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};
