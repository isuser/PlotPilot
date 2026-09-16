import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
const PLOTS_PER_PAGE = 5;

export default function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityWithPlot[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cropFilter, setCropFilter] = useState<string | null>(null);
  const [plotsPage, setPlotsPage] = useState(0);

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
        setPlotsPage(0);
      };
    }, []),
  );

  const distinctCrops = useMemo(() => {
    const crops = new Set<string>();
    for (const plot of plots) {
      if (plot.crop) crops.add(plot.crop);
    }
    return Array.from(crops).sort((a, b) => a.localeCompare(b));
  }, [plots]);

  const isSearching = query.trim().length > 0 || cropFilter !== null;

  const filteredPlots = useMemo(() => {
    if (!isSearching) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return plots.filter((plot) => {
      const matchesQuery = normalizedQuery.length === 0 || plot.name.toLowerCase().includes(normalizedQuery);
      const matchesCrop = cropFilter === null || plot.crop === cropFilter;
      return matchesQuery && matchesCrop;
    });
  }, [plots, query, cropFilter, isSearching]);

  const plotsPageCount = Math.max(1, Math.ceil(plots.length / PLOTS_PER_PAGE));
  const clampedPlotsPage = Math.min(plotsPage, plotsPageCount - 1);
  const pagedPlots = plots.slice(
    clampedPlotsPage * PLOTS_PER_PAGE,
    clampedPlotsPage * PLOTS_PER_PAGE + PLOTS_PER_PAGE,
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

  const listData: (Plot | ActivityWithPlot)[] = isSearching ? filteredPlots : recentActivities;

  return (
    <FlatList<Plot | ActivityWithPlot>
      style={styles.container}
      contentContainerStyle={styles.content}
      data={listData}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          <Text style={styles.welcome}>{t('home.welcome')}</Text>

          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('home.searchPlaceholder')}
            autoCapitalize="none"
          />

          {distinctCrops.length > 0 ? (
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, cropFilter === null && styles.chipSelected]}
                onPress={() => setCropFilter(null)}
              >
                <Text style={[styles.chipText, cropFilter === null && styles.chipTextSelected]}>
                  {t('home.allCrops')}
                </Text>
              </Pressable>
              {distinctCrops.map((crop) => (
                <Pressable
                  key={crop}
                  style={[styles.chip, cropFilter === crop && styles.chipSelected]}
                  onPress={() => setCropFilter(crop === cropFilter ? null : crop)}
                >
                  <Text style={[styles.chipText, cropFilter === crop && styles.chipTextSelected]}>
                    {crop}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!isSearching ? (
            <>
              <Pressable style={styles.summaryCard} onPress={() => navigation.navigate('Map')}>
                <Text style={styles.summaryValue}>{plots.length}</Text>
                <Text style={styles.summaryLabel}>{t('home.plotCount', { count: plots.length })}</Text>
              </Pressable>

              {plots.length === 0 ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('PlotForm', undefined)}
                >
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
                      <View
                        style={[styles.colorDot, { backgroundColor: plot.color ?? DEFAULT_PLOT_COLOR }]}
                      />
                      <Text style={styles.pickerRowText}>{plot.name}</Text>
                    </Pressable>
                  ))}
                  <Pressable style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
                    <Text style={styles.pickerCancelText}>{t('plotDetail.cancel')}</Text>
                  </Pressable>
                </View>
              ) : null}

              {plots.length > 0 ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('home.plots')}</Text>
                  </View>
                  {pagedPlots.map((plot) => (
                    <Pressable
                      key={plot.id}
                      style={styles.activityRow}
                      onPress={() => navigation.navigate('PlotDetail', { plotId: plot.id })}
                    >
                      <View
                        style={[styles.colorDot, { backgroundColor: plot.color ?? DEFAULT_PLOT_COLOR }]}
                      />
                      <View style={styles.activityRowContent}>
                        <Text style={styles.plotName}>{plot.name}</Text>
                        {plot.crop ? <Text style={styles.activityType}>{plot.crop}</Text> : null}
                      </View>
                    </Pressable>
                  ))}
                  {plotsPageCount > 1 ? (
                    <View style={styles.paginationRow}>
                      <Pressable
                        style={styles.pageButton}
                        onPress={() => setPlotsPage((page) => Math.max(0, page - 1))}
                        disabled={clampedPlotsPage === 0}
                      >
                        <Text
                          style={[styles.pageButtonText, clampedPlotsPage === 0 && styles.pageButtonTextDisabled]}
                        >
                          {t('home.prev')}
                        </Text>
                      </Pressable>
                      <Text style={styles.pageIndicator}>
                        {t('home.pageIndicator', { page: clampedPlotsPage + 1, total: plotsPageCount })}
                      </Text>
                      <Pressable
                        style={styles.pageButton}
                        onPress={() => setPlotsPage((page) => Math.min(plotsPageCount - 1, page + 1))}
                        disabled={clampedPlotsPage >= plotsPageCount - 1}
                      >
                        <Text
                          style={[
                            styles.pageButtonText,
                            clampedPlotsPage >= plotsPageCount - 1 && styles.pageButtonTextDisabled,
                          ]}
                        >
                          {t('home.next')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isSearching ? t('home.searchResults') : t('home.recentActivity')}
            </Text>
            {!isSearching ? (
              <Pressable onPress={() => navigation.navigate('Timeline')}>
                <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>
          {isSearching ? t('home.noResults') : t('timeline.noActivities')}
        </Text>
      }
      renderItem={({ item }) =>
        'plotId' in item ? (
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
        ) : (
          <Pressable
            style={styles.activityRow}
            onPress={() => navigation.navigate('PlotDetail', { plotId: item.id })}
          >
            <View style={[styles.colorDot, { backgroundColor: item.color ?? DEFAULT_PLOT_COLOR }]} />
            <View style={styles.activityRowContent}>
              <Text style={styles.plotName}>{item.name}</Text>
              {item.crop ? <Text style={styles.activityType}>{item.crop}</Text> : null}
            </View>
          </Pressable>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  welcome: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#333', fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
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
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageButton: { paddingVertical: 8, paddingHorizontal: 4 },
  pageButtonText: { color: '#2E7D32', fontWeight: '600' },
  pageButtonTextDisabled: { opacity: 0.3 },
  pageIndicator: { color: '#666', fontSize: 13 },
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
