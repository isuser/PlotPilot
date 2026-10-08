import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildDataExport } from '../db/export';
import { listPlots } from '../db/plots';
import type { Plot } from '../db/types';
import { getLanguagePreference } from '../i18n';
import { DEFAULT_PLOT_COLOR } from '../map/plotColors';
import type { RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Export'>;

type CheckState = 'checked' | 'unchecked' | 'partial';

function Checkbox({ state, styles }: { state: CheckState; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={[styles.checkbox, state !== 'unchecked' && styles.checkboxFilled]}>
      {state === 'checked' ? <Text style={styles.checkboxMark}>✓</Text> : null}
      {state === 'partial' ? <Text style={styles.checkboxMark}>–</Text> : null}
    </View>
  );
}

export default function ExportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors, preference: themePreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [plots, setPlots] = useState<Plot[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [includeSettings, setIncludeSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Everything starts selected, matching the old export-everything behavior.
  useEffect(() => {
    let cancelled = false;
    listPlots().then((rows) => {
      if (cancelled) return;
      setPlots(rows);
      setSelectedIds(new Set(rows.map((plot) => plot.id)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const plotCount = plots?.length ?? 0;
  const selectAllState: CheckState =
    selectedIds.size === 0 ? 'unchecked' : selectedIds.size === plotCount ? 'checked' : 'partial';

  const toggleAll = () => {
    if (!plots) return;
    setSelectedIds(selectAllState === 'checked' ? new Set() : new Set(plots.map((plot) => plot.id)));
  };

  const togglePlot = (plotId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(plotId)) next.delete(plotId);
      else next.add(plotId);
      return next;
    });
  };

  const canExport = selectedIds.size > 0 && !exporting;

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await buildDataExport(
        Array.from(selectedIds),
        includeSettings ? { themePreference, languagePreference: getLanguagePreference() } : undefined,
      );
      const result = await Share.share({
        title: t('settings.exportData'),
        message: JSON.stringify(data, null, 2),
      });
      if (result.action === Share.sharedAction) navigation.goBack();
    } catch {
      Alert.alert(t('settings.exportErrorTitle'), t('settings.exportErrorMessage'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={plots ?? []}
        keyExtractor={(plot) => String(plot.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          plotCount > 0 ? (
            <Pressable style={[styles.row, styles.selectAllRow]} onPress={toggleAll}>
              <Checkbox state={selectAllState} styles={styles} />
              <Text style={styles.selectAllText}>{t('export.selectAll')}</Text>
              <Text style={styles.selectedCount}>
                {t('export.selectedCount', { count: selectedIds.size, total: plotCount })}
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          plots !== null ? <Text style={styles.emptyText}>{t('export.noPlots')}</Text> : null
        }
        renderItem={({ item: plot }) => (
          <Pressable style={styles.row} onPress={() => togglePlot(plot.id)}>
            <Checkbox state={selectedIds.has(plot.id) ? 'checked' : 'unchecked'} styles={styles} />
            <View style={[styles.colorDot, { backgroundColor: plot.color ?? DEFAULT_PLOT_COLOR }]} />
            <Text style={styles.plotName} numberOfLines={1}>
              {plot.name}
            </Text>
          </Pressable>
        )}
      />

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.settingsRow}>
          <View style={styles.settingsLabel}>
            <Text style={styles.settingsTitle}>{t('export.includeSettings')}</Text>
            <Text style={styles.settingsHint}>{t('export.includeSettingsHint')}</Text>
          </View>
          <Switch
            value={includeSettings}
            onValueChange={setIncludeSettings}
            trackColor={{ true: colors.accent, false: colors.border }}
          />
        </View>
        <Pressable
          style={[styles.exportButton, !canExport && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={!canExport}
        >
          <Text style={styles.exportButtonText}>
            {exporting ? t('settings.exporting') : t('export.exportButton', { count: selectedIds.size })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    selectAllRow: { backgroundColor: colors.surface, borderRadius: 8, borderBottomWidth: 0, marginBottom: 8 },
    selectAllText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    selectedCount: { fontSize: 13, color: colors.textSecondary },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxMark: { color: colors.textOnAccent, fontSize: 14, fontWeight: '700', lineHeight: 16 },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    plotName: { flex: 1, fontSize: 15, color: colors.textPrimary },
    emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
    footer: {
      padding: 16,
      gap: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingsLabel: { flex: 1 },
    settingsTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    settingsHint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    exportButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
    exportButtonDisabled: { opacity: 0.4 },
    exportButtonText: { color: colors.textOnAccent, fontSize: 16, fontWeight: '600' },
  });
}
