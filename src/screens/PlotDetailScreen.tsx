import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listActivitiesForPlot } from '../db/activities';
import { getPlot } from '../db/plots';
import type { Activity, Plot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlotDetail'>;

// Minimal placeholder; the full view/edit experience is PLO-7.
export default function PlotDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { plotId } = route.params;
  const [plot, setPlot] = useState<Plot | null | undefined>(undefined);
  const [activities, setActivities] = useState<Activity[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getPlot(plotId).then((row) => {
        if (!cancelled) setPlot(row);
      });
      listActivitiesForPlot(plotId).then((rows) => {
        if (!cancelled) setActivities(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [plotId]),
  );

  if (plot === undefined) {
    return (
      <View style={styles.container}>
        <Text>{t('plotDetail.loading')}</Text>
      </View>
    );
  }

  if (plot === null) {
    return (
      <View style={styles.container}>
        <Text>{t('plotDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={activities}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>{plot.name}</Text>
          {plot.crop ? <DetailRow label={t('plotDetail.crop')} value={plot.crop} /> : null}
          {plot.soilType ? <DetailRow label={t('plotDetail.soilType')} value={plot.soilType} /> : null}
          {plot.area != null ? <DetailRow label={t('plotDetail.area')} value={String(plot.area)} /> : null}
          {plot.perimeter != null ? (
            <DetailRow label={t('plotDetail.perimeter')} value={String(plot.perimeter)} />
          ) : null}
          {plot.notes ? <DetailRow label={t('plotDetail.notes')} value={plot.notes} /> : null}

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  row: { marginBottom: 12 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 16, marginTop: 2 },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  addButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 12 },
  activityRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  activityType: { fontSize: 16, fontWeight: '600' },
  activityDate: { fontSize: 13, color: '#666', marginTop: 2 },
  activityNotes: { fontSize: 14, marginTop: 4 },
});
