import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listAllActivities } from '../db/activities';
import type { ActivityWithPlot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { DEFAULT_PLOT_COLOR } from '../map/plotColors';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

export default function TimelineScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityWithPlot[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listAllActivities().then((rows) => {
        if (!cancelled) setActivities(rows);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={activities}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={<Text style={styles.emptyText}>{t('timeline.noActivities')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate('PlotDetail', { plotId: item.plotId })}
        >
          <View style={[styles.colorDot, { backgroundColor: item.plotColor ?? DEFAULT_PLOT_COLOR }]} />
          <View style={styles.rowContent}>
            <View style={styles.rowHeader}>
              <Text style={styles.plotName}>{item.plotName}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={styles.activityType}>{item.type}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 24 },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 10,
  },
  rowContent: { flex: 1 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plotName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  date: { fontSize: 13, color: '#666', marginLeft: 8 },
  activityType: { fontSize: 14, color: '#2E7D32', fontWeight: '600', marginTop: 2 },
  notes: { fontSize: 14, marginTop: 4 },
});
