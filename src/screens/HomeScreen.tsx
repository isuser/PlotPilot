import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listAllActivities } from '../db/activities';
import { listPlots } from '../db/plots';
import type { ActivityWithPlot, Plot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { DEFAULT_PLOT_COLOR } from '../map/plotColors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const RECENT_ACTIVITY_LIMIT = 5;

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityWithPlot[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listPlots().then((rows) => {
        if (!cancelled) setPlots(rows);
      });
      listAllActivities().then((rows) => {
        if (!cancelled) setRecentActivities(rows.slice(0, RECENT_ACTIVITY_LIMIT));
      });
      return () => {
        cancelled = true;
        setPickerOpen(false);
      };
    }, []),
  );

  const startLoggingActivity = () => {
    if (plots.length === 1) {
      navigation.navigate('ActivityForm', { plotId: plots[0].id });
      return;
    }
    setPickerOpen(true);
  };

  const pickPlotForActivity = (plotId: number) => {
    setPickerOpen(false);
    navigation.navigate('ActivityForm', { plotId });
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={recentActivities}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <Text style={styles.welcome}>{t('home.welcome')}</Text>

          <Pressable style={styles.summaryCard} onPress={() => navigation.navigate('Map')}>
            <Text style={styles.summaryValue}>{plots.length}</Text>
            <Text style={styles.summaryLabel}>{t('home.plotCount', { count: plots.length })}</Text>
          </Pressable>

          {plots.length === 0 ? (
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('PlotForm', undefined)}>
              <Text style={styles.primaryButtonText}>{t('home.addFirstPlot')}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryButton} onPress={startLoggingActivity}>
              <Text style={styles.primaryButtonText}>{t('home.logActivity')}</Text>
            </Pressable>
          )}

          {pickerOpen ? (
            <View style={styles.picker}>
              <Text style={styles.pickerTitle}>{t('home.selectPlot')}</Text>
              {plots.map((plot) => (
                <Pressable
                  key={plot.id}
                  style={styles.pickerRow}
                  onPress={() => pickPlotForActivity(plot.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: plot.color ?? DEFAULT_PLOT_COLOR }]} />
                  <Text style={styles.pickerRowText}>{plot.name}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
                <Text style={styles.pickerCancelText}>{t('plotDetail.cancel')}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
            <Pressable onPress={() => navigation.navigate('Timeline')}>
              <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
            </Pressable>
          </View>
        </>
      }
      ListEmptyComponent={<Text style={styles.emptyText}>{t('timeline.noActivities')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.activityRow}
          onPress={() => navigation.navigate('PlotDetail', { plotId: item.plotId })}
        >
          <View style={[styles.colorDot, { backgroundColor: item.plotColor ?? DEFAULT_PLOT_COLOR }]} />
          <View style={styles.activityRowContent}>
            <View style={styles.activityRowHeader}>
              <Text style={styles.plotName}>{item.plotName}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={styles.activityType}>{item.type}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  welcome: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  summaryCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#2E7D32' },
  summaryLabel: { fontSize: 14, color: '#666', marginTop: 2 },
  primaryButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  picker: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  pickerTitle: { fontSize: 13, color: '#666', marginBottom: 6, marginLeft: 4 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  pickerRowText: { fontSize: 16 },
  pickerCancel: { paddingVertical: 10, paddingHorizontal: 8, alignSelf: 'flex-end' },
  pickerCancelText: { color: '#666', fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  viewAllText: { color: '#2E7D32', fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 12 },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 10,
  },
  activityRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  activityRowContent: { flex: 1 },
  activityRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plotName: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  date: { fontSize: 13, color: '#666', marginLeft: 8 },
  activityType: { fontSize: 14, color: '#2E7D32', fontWeight: '600', marginTop: 2 },
});
