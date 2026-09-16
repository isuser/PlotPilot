import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, GeoJSONSource, Layer, Map, Marker } from '@maplibre/maplibre-react-native';

import { createPlot } from '../db/plots';
import type { BoundaryPoint } from '../db/types';
import { boundaryToLineString, boundaryToPolygon } from '../map/geo';
import { osmStyle } from '../map/osmStyle';
import { DEFAULT_PLOT_COLOR, PLOT_COLORS } from '../map/plotColors';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlotForm'>;

// Mainland Portugal centroid; used only when the map hasn't been given a
// center to start from (e.g. no existing plots to infer one from).
const DEFAULT_CENTER: [number, number] = [-8.2245, 39.3999];

export default function PlotFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const initialCenter = route.params?.initialCenter ?? DEFAULT_CENTER;

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_PLOT_COLOR);
  const [boundary, setBoundary] = useState<BoundaryPoint[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: t('plotForm.title') });
  }, [navigation, t]);

  const previewShape = useMemo(() => {
    if (boundary.length >= 3) return boundaryToPolygon(boundary);
    if (boundary.length === 2) return boundaryToLineString(boundary);
    return null;
  }, [boundary]);

  const addPoint = (longitude: number, latitude: number) => {
    setBoundary((current) => [...current, { latitude, longitude }]);
  };

  const undoLastPoint = () => {
    setBoundary((current) => current.slice(0, -1));
  };

  const clearPoints = () => {
    setBoundary([]);
  };

  const canSave = name.trim().length > 0 && boundary.length >= 3 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const plot = await createPlot({ name: name.trim(), boundary, color });
      navigation.replace('PlotDetail', { plotId: plot.id });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.mapContainer}>
        <Map
          style={styles.map}
          mapStyle={osmStyle}
          onPress={(event) => {
            const [longitude, latitude] = event.nativeEvent.lngLat;
            addPoint(longitude, latitude);
          }}
        >
          <Camera initialViewState={{ center: initialCenter, zoom: 15 }} />
          {previewShape ? (
            <GeoJSONSource id="plot-form-preview" data={previewShape}>
              {previewShape.type === 'Polygon' ? (
                <>
                  <Layer id="plot-form-fill" type="fill" paint={{ 'fill-color': color, 'fill-opacity': 0.35 }} />
                  <Layer id="plot-form-outline" type="line" paint={{ 'line-color': color, 'line-width': 2 }} />
                </>
              ) : (
                <Layer id="plot-form-line" type="line" paint={{ 'line-color': color, 'line-width': 2 }} />
              )}
            </GeoJSONSource>
          ) : null}
          {boundary.map((point, index) => (
            <Marker key={index} lngLat={[point.longitude, point.latitude]}>
              <View style={[styles.pointMarker, index === 0 && styles.firstPointMarker]} />
            </Marker>
          ))}
        </Map>
        <View style={styles.hintBanner} pointerEvents="none">
          <Text style={styles.hintText}>
            {boundary.length < 3 ? t('plotForm.tapHint') : t('plotForm.pointCount', { count: boundary.length })}
          </Text>
        </View>
        <View style={styles.mapControls}>
          <Pressable
            style={[styles.controlButton, boundary.length === 0 && styles.controlButtonDisabled]}
            onPress={undoLastPoint}
            disabled={boundary.length === 0}
          >
            <Text style={styles.controlButtonText}>{t('plotForm.undo')}</Text>
          </Pressable>
          <Pressable
            style={[styles.controlButton, boundary.length === 0 && styles.controlButtonDisabled]}
            onPress={clearPoints}
            disabled={boundary.length === 0}
          >
            <Text style={styles.controlButtonText}>{t('plotForm.clear')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t('plotForm.name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('plotForm.namePlaceholder')}
          autoCapitalize="words"
        />

        <Text style={styles.label}>{t('plotForm.color')}</Text>
        <View style={styles.swatchRow}>
          {PLOT_COLORS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setColor(option)}
              style={[
                styles.swatch,
                { backgroundColor: option },
                option === color && styles.swatchSelected,
              ]}
              accessibilityLabel={option}
            />
          ))}
        </View>

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>{t('plotForm.save')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  pointMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  firstPointMarker: { backgroundColor: '#2E7D32' },
  hintBanner: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: '#333',
    overflow: 'hidden',
  },
  mapControls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 8,
  },
  controlButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  controlButtonDisabled: { opacity: 0.4 },
  controlButtonText: { fontWeight: '600', color: '#333' },
  form: { padding: 16 },
  label: { fontSize: 13, color: '#666', marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: '#111' },
  saveButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
