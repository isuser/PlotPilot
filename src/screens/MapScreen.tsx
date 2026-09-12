import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { useNetworkState } from 'expo-network';

import { listPlots } from '../db/plots';
import type { Plot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { osmStyle } from '../map/osmStyle';

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

  // Undefined readings (still resolving) are treated as online so the map is
  // the default view; only a confirmed disconnect triggers the list fallback.
  const isOffline = networkState.isConnected === false || networkState.isInternetReachable === false;

  const openPlot = (plotId: number) => navigation.navigate('PlotDetail', { plotId });

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
      </View>
    );
  }

  const initialCenter = mappablePlots[0]?.coordinate ?? DEFAULT_CENTER;

  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={osmStyle}>
        <Camera initialViewState={{ center: initialCenter, zoom: mappablePlots.length ? 13 : 6 }} />
        {mappablePlots.map(({ plot, coordinate }) => (
          <Marker key={plot.id} lngLat={coordinate} onPress={() => openPlot(plot.id)}>
            <View style={styles.markerPin} />
          </Marker>
        ))}
      </Map>
      {mappablePlots.length === 0 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyOverlayText}>{t('map.noPlots')}</Text>
        </View>
      ) : null}
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
