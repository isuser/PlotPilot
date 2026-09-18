import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';

import { listActivitiesForPlot } from '../db/activities';
import { deletePlot, getPlot, updatePlot } from '../db/plots';
import { listAllTagNames, listTagsForPlot, setPlotTags } from '../db/tags';
import type { Activity, BoundaryPoint, Plot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { osmStyle } from '../map/osmStyle';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PlotDetail'>;

// Mainland Portugal centroid; used only as a starting point for the
// manual-location picker when a plot has no boundary and no location yet.
const DEFAULT_CENTER: [number, number] = [-8.2245, 39.3999];

function formatLocation(plot: Plot): string | null {
  return plot.latitude != null && plot.longitude != null
    ? `${plot.latitude.toFixed(5)}, ${plot.longitude.toFixed(5)}`
    : null;
}

export default function PlotDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { plotId } = route.params;
  const [plot, setPlot] = useState<Plot | null | undefined>(undefined);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('');
  const [soilType, setSoilType] = useState('');
  const [notes, setNotes] = useState('');
  const [manualLocation, setManualLocation] = useState<BoundaryPoint | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagInputFocused, setTagInputFocused] = useState(false);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getPlot(plotId).then((row) => {
        if (!cancelled) setPlot(row);
      });
      listActivitiesForPlot(plotId).then((rows) => {
        if (!cancelled) setActivities(rows);
      });
      listTagsForPlot(plotId).then((rows) => {
        if (!cancelled) setTags(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [plotId]),
  );

  useEffect(() => {
    listAllTagNames().then(setKnownTags);
  }, []);

  if (plot === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.rowValue}>{t('plotDetail.loading')}</Text>
      </View>
    );
  }

  if (plot === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.rowValue}>{t('plotDetail.notFound')}</Text>
      </View>
    );
  }

  const hasBoundary = (plot.boundary?.length ?? 0) >= 3;

  const startEditing = () => {
    setName(plot.name);
    setCrop(plot.crop ?? '');
    setSoilType(plot.soilType ?? '');
    setNotes(plot.notes ?? '');
    setManualLocation(
      !hasBoundary && plot.latitude != null && plot.longitude != null
        ? { latitude: plot.latitude, longitude: plot.longitude }
        : null,
    );
    setEditTags(tags);
    setTagInput('');
    setEditing(true);
  };

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setEditTags((current) =>
      current.some((tag) => tag.toLowerCase() === value.toLowerCase()) ? current : [...current, value],
    );
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setEditTags((current) => current.filter((existing) => existing !== tag));
  };

  const tagSuggestions = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    return knownTags
      .filter((candidate) => !editTags.some((tag) => tag.toLowerCase() === candidate.toLowerCase()))
      .filter((candidate) => (query ? candidate.toLowerCase().includes(query) : true))
      .slice(0, 6);
  }, [tagInput, knownTags, editTags]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const updated = await updatePlot(plot.id, {
        name: name.trim(),
        crop: crop.trim() || null,
        soilType: soilType.trim() || null,
        notes: notes.trim() || null,
        ...(hasBoundary
          ? {}
          : { latitude: manualLocation?.latitude ?? null, longitude: manualLocation?.longitude ?? null }),
      });
      await setPlotTags(plot.id, editTags);
      if (updated) setPlot(updated);
      setTags(editTags);
      setKnownTags((current) => Array.from(new Set([...current, ...editTags])).sort((a, b) => a.localeCompare(b)));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      t('plotDetail.deleteConfirmTitle'),
      t('plotDetail.deleteConfirmMessage', { name: plot.name }),
      [
        { text: t('plotDetail.cancel'), style: 'cancel' },
        {
          text: t('plotDetail.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deletePlot(plot.id);
              navigation.popToTop();
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (editing) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{t('plotDetail.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>{t('plotDetail.crop')}</Text>
          <TextInput
            style={styles.input}
            value={crop}
            onChangeText={setCrop}
            placeholder={t('plotDetail.cropPlaceholder')}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>{t('plotDetail.soilType')}</Text>
          <TextInput
            style={styles.input}
            value={soilType}
            onChangeText={setSoilType}
            placeholder={t('plotDetail.soilTypePlaceholder')}
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>{t('plotDetail.notes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('plotDetail.notesPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            multiline
          />

          <Text style={styles.label}>{t('plotDetail.tags')}</Text>
          {editTags.length > 0 ? (
            <View style={styles.tagsWrap}>
              {editTags.map((tag) => (
                <Pressable key={tag} style={styles.tagChip} onPress={() => removeTag(tag)}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <Text style={styles.tagChipRemove}>×</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            value={tagInput}
            onChangeText={setTagInput}
            onFocus={() => setTagInputFocused(true)}
            // Delayed so a tap on a suggestion row (which blurs this input first)
            // still lands before the list unmounts.
            onBlur={() => setTimeout(() => setTagInputFocused(false), 150)}
            onSubmitEditing={() => addTag(tagInput)}
            placeholder={t('plotDetail.tagsPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            returnKeyType="done"
          />
          {tagInputFocused && tagSuggestions.length > 0 ? (
            <View style={styles.suggestions}>
              {tagSuggestions.map((suggestion) => (
                <Pressable key={suggestion} style={styles.suggestionRow} onPress={() => addTag(suggestion)}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.label}>{t('plotDetail.location')}</Text>
          {hasBoundary ? (
            <Text style={styles.hintText}>{t('plotDetail.locationAutoHint')}</Text>
          ) : (
            <>
              <Text style={styles.hintText}>{t('plotDetail.locationTapHint')}</Text>
              <View style={styles.locationMapContainer}>
                <Map
                  style={styles.locationMap}
                  mapStyle={osmStyle}
                  onPress={(event) => {
                    const [longitude, latitude] = event.nativeEvent.lngLat;
                    setManualLocation({ latitude, longitude });
                  }}
                >
                  <Camera
                    initialViewState={{
                      center: manualLocation
                        ? [manualLocation.longitude, manualLocation.latitude]
                        : DEFAULT_CENTER,
                      zoom: manualLocation ? 14 : 6,
                    }}
                  />
                  {manualLocation ? (
                    <Marker lngLat={[manualLocation.longitude, manualLocation.latitude]}>
                      <View style={styles.locationMarker} />
                    </Marker>
                  ) : null}
                </Map>
              </View>
            </>
          )}

          <View style={styles.editActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setEditing(false)}
              disabled={saving || deleting}
            >
              <Text style={styles.cancelButtonText}>{t('plotDetail.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, styles.saveButtonFlex, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave || deleting}
            >
              <Text style={styles.saveButtonText}>{t('plotDetail.save')}</Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.deleteButton}
            onPress={confirmDelete}
            disabled={saving || deleting}
          >
            <Text style={styles.deleteButtonText}>{t('plotDetail.deletePlot')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const locationLabel = formatLocation(plot);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={activities}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{plot.name}</Text>
            <View style={styles.titleActions}>
              {locationLabel ? (
                <Pressable
                  style={styles.mapButton}
                  onPress={() => navigation.navigate('Map', { focusPlotId: plot.id })}
                >
                  <Text style={styles.mapButtonText}>{t('plotDetail.showOnMap')}</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.editButton} onPress={startEditing}>
                <Text style={styles.editButtonText}>{t('plotDetail.edit')}</Text>
              </Pressable>
            </View>
          </View>
          {plot.crop ? <DetailRow label={t('plotDetail.crop')} value={plot.crop} styles={styles} /> : null}
          {plot.soilType ? (
            <DetailRow label={t('plotDetail.soilType')} value={plot.soilType} styles={styles} />
          ) : null}
          {tags.length > 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('plotDetail.tags')}</Text>
              <View style={styles.tagsWrap}>
                {tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {plot.area != null ? (
            <DetailRow label={t('plotDetail.area')} value={`${plot.area.toFixed(2)} ha`} styles={styles} />
          ) : null}
          {plot.perimeter != null ? (
            <DetailRow
              label={t('plotDetail.perimeter')}
              value={`${Math.round(plot.perimeter)} m`}
              styles={styles}
            />
          ) : null}
          {locationLabel ? (
            <DetailRow label={t('plotDetail.location')} value={locationLabel} styles={styles} />
          ) : null}
          {plot.notes ? <DetailRow label={t('plotDetail.notes')} value={plot.notes} styles={styles} /> : null}

          <View style={styles.activitiesHeader}>
            <Text style={styles.sectionTitle}>{t('plotDetail.activities')}</Text>
            <Pressable
              style={styles.addButton}
              onPress={() => navigation.navigate('ActivityForm', { plotId })}
            >
              <Text style={styles.addButtonText}>{t('plotDetail.addActivity')}</Text>
            </Pressable>
          </View>
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>{t('plotDetail.noActivities')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.activityRow}
          onPress={() => navigation.navigate('ActivityForm', { plotId, activityId: item.id })}
        >
          <Text style={styles.activityType}>{item.type}</Text>
          <Text style={styles.activityDate}>{item.date}</Text>
          {item.notes ? <Text style={styles.activityNotes}>{item.notes}</Text> : null}
        </Pressable>
      )}
    />
  );
}

function DetailRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 22, fontWeight: '700', flexShrink: 1, color: colors.textPrimary },
    titleActions: { flexDirection: 'row', gap: 8 },
    editButton: {
      borderWidth: 1,
      borderColor: colors.accentText,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    editButtonText: { color: colors.accentText, fontWeight: '600' },
    mapButton: {
      borderWidth: 1,
      borderColor: colors.accentText,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    mapButtonText: { color: colors.accentText, fontWeight: '600' },
    row: { marginBottom: 12 },
    rowLabel: { fontSize: 13, color: colors.textSecondary },
    rowValue: { fontSize: 16, marginTop: 2, color: colors.textPrimary },
    activitiesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 8,
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    addButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    addButtonText: { color: colors.textOnAccent, fontWeight: '600' },
    emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 12 },
    activityRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      marginBottom: 8,
    },
    activityType: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    activityDate: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    activityNotes: { fontSize: 14, marginTop: 4, color: colors.textPrimary },
    label: { fontSize: 13, color: colors.textSecondary, marginTop: 16, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 16,
      color: colors.textPrimary,
    },
    notesInput: { minHeight: 90, textAlignVertical: 'top' },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 8 },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 6,
      paddingHorizontal: 10,
      gap: 6,
    },
    tagChipText: { fontSize: 14, color: colors.textPrimary },
    tagChipRemove: { fontSize: 14, color: colors.textSecondary, fontWeight: '700' },
    suggestions: {
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      overflow: 'hidden',
    },
    suggestionRow: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: colors.surface,
    },
    suggestionText: { fontSize: 15, color: colors.textPrimary },
    hintText: { fontSize: 13, color: colors.textSecondary },
    locationMapContainer: {
      height: 180,
      borderRadius: 8,
      overflow: 'hidden',
      marginTop: 8,
    },
    locationMap: { flex: 1 },
    locationMarker: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#2E7D32',
      borderWidth: 2,
      borderColor: '#fff',
    },
    editActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 28,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    cancelButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonFlex: { flex: 1 },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { color: colors.textOnAccent, fontSize: 16, fontWeight: '600' },
    deleteButton: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 12,
    },
    deleteButtonText: { color: colors.dangerText, fontSize: 15, fontWeight: '600' },
  });
}
