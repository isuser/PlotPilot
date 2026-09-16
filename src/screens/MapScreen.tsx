import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type PressEventWithFeatures,
} from '@maplibre/maplibre-react-native';
import { useNetworkState } from 'expo-network';

import { listPlots } from '../db/plots';
import type { Plot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { boundaryToPolygon } from '../map/geo';
import { MapStyleToggle, type MapStyleMode } from '../map/MapStyleToggle';
import { osmStyle } from '../map/osmStyle';
import { DEFAULT_PLOT_COLOR } from '../map/plotColors';
import { satelliteStyle } from '../map/satelliteStyle';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

type MappablePlot = { plot: Plot; coordinate: [number, number] };

// Mainland Portugal centroid; only used when there are no located plots yet.
const DEFAULT_CENTER: [number, number] = [-8.2245, 39.3999];

function plotCoordinate(plot: Plot): [number, number] | null {
  if (plot.latitude != null && plot.longitude != null) {
    return [plot.longitude, plot.latitude];
  }
  const first = plot.boundary?.[0];
  return first ? [first.longitude, first.latitude] : null;
}

export default function MapScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>('street');
  const networkState = useNetworkState();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listPlots().then((rows) => {
        if (!cancelled) setPlots(rows);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const mappablePlots = useMemo<MappablePlot[]>(
    () =>
      plots
        .map((plot) => ({ plot, coordinate: plotCoordinate(plot) }))
        .filter((entry): entry is MappablePlot => entry.coordinate !== null),
    [plots],
  );

  // Plots with a boundary get a filled polygon on the map; that's already a
  // tappable, color-coded representation, so they skip the marker pin below
  // (one fewer composited view per plot — matters once there are many).
  const unboundedMappablePlots = useMemo(
    () => mappablePlots.filter(({ plot }) => (plot.boundary?.length ?? 0) < 3),
    [mappablePlots],
  );

  // All boundaries are combined into a single GeoJSON source with two layers
  // (fill + outline) using data-driven color, instead of one source/two
  // layers per plot. Many small native sources scale poorly; one big one
  // with per-feature styling is the standard MapLibre/Mapbox pattern for
  // rendering lots of features. Memoized so it's only rebuilt when the plot
  // list actually changes, not on every unrelated re-render.
  const plotsFeatureCollection = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: plots
        .filter((plot) => (plot.boundary?.length ?? 0) >= 3)
        .map((plot) => ({
          type: 'Feature',
          properties: { plotId: plot.id, color: plot.color ?? DEFAULT_PLOT_COLOR },
          geometry: boundaryToPolygon(plot.boundary!),
        })),
    }),
    [plots],
  );

  // Undefined readings (still resolving) are treated as online so the map is
  // the default view; only a confirmed disconnect triggers the list fallback.
  const isOffline = networkState.isConnected === false || networkState.isInternetReachable === false;

  const openPlot = (plotId: number) => navigation.navigate('PlotDetail', { plotId });

  const handlePlotsPress = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
    const plotId = event.nativeEvent.features[0]?.properties?.plotId;
    if (typeof plotId === 'number') openPlot(plotId);
  };

  const openNewPlot = () => {
    const center = mappablePlots[0]?.coordinate;
    navigation.navigate('PlotForm', center ? { initialCenter: center } : undefined);
  };

  if (isOffline) {
    return (
      <View style={styles.container}>
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>{t('map.offlineBanner')}</Text>
        </View>
        <FlatList
          data={plots}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('map.noPlots')}</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.listItem} onPress={() => openPlot(item.id)}>
              <Text style={styles.listItemTitle}>{item.name}</Text>
              {item.crop ? <Text style={styles.listItemSubtitle}>{item.crop}</Text> : null}
            </Pressable>
          )}
        />
        <Pressable style={styles.fab} onPress={openNewPlot}>
          <Text style={styles.fabText}>{t('map.newPlot')}</Text>
        </Pressable>
      </View>
    );
  }

  const initialCenter = mappablePlots[0]?.coordinate ?? DEFAULT_CENTER;

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={mapStyleMode === 'street' ? osmStyle : satelliteStyle}>
        <Camera initialViewState={{ center: initialCenter, zoom: mappablePlots.length ? 13 : 6 }} />
        {plotsFeatureCollection.features.length > 0 ? (
          <GeoJSONSource id="plots" data={plotsFeatureCollection} onPress={handlePlotsPress}>
            <Layer id="plots-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 }} />
            <Layer id="plots-outline" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 2 }} />
          </GeoJSONSource>
        ) : null}
        {unboundedMappablePlots.map(({ plot, coordinate }) => (
          <Marker key={plot.id} lngLat={coordinate} onPress={() => openPlot(plot.id)}>
            <View style={[styles.markerPin, { backgroundColor: plot.color ?? DEFAULT_PLOT_COLOR }]} />
          </Marker>
        ))}
      </Map>
      <MapStyleToggle
        mode={mapStyleMode}
        onToggle={() => setMapStyleMode((mode) => (mode === 'street' ? 'satellite' : 'street'))}
      />
      {mappablePlots.length === 0 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyOverlayText}>{t('map.noPlots')}</Text>
        </View>
      ) : null}
      <Pressable style={styles.fab} onPress={openNewPlot}>
        <Text style={styles.fabText}>{t('map.newPlot')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    borderWidth: 2,
    borderColor: '#fff',
  },
  offlineBanner: {
    backgroundColor: '#B45309',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: { padding: 16 },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  listItemTitle: { fontSize: 16, fontWeight: '600' },
  listItemSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 24 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#2E7D32',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyOverlay: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyOverlayText: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: '#666',
    overflow: 'hidden',
  },
});
