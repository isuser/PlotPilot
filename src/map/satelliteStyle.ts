import type { StyleSpecification } from '@maplibre/maplibre-react-native';

/**
 * Esri World Imagery raster tiles — free, no API key required. Note the tile
 * path is z/y/x (ArcGIS's "level/row/col"), not the usual z/x/y.
 * See https://enterprise.arcgis.com/en/server/latest/publish-services/windows/communicating-with-arcgis-rest-services.htm
 * Revisit with a licensed provider before production traffic, same as osmStyle.
 */
export const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics, and the GIS User Community',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'satellite',
      type: 'raster',
      source: 'satellite',
    },
  ],
};
