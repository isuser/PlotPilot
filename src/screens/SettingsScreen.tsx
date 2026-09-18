import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildDataExport, type DataExport } from '../db/export';
import { ImportParseError, importDataExport, parseDataExport } from '../db/import';
import { getLanguagePreference, setLanguagePreference, supportedLanguages, type LanguagePreference } from '../i18n';
import { useTheme, type ThemePreference } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
}

function SettingsSection({ title, children, styles }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const IMPORT_ERROR_KEYS: Record<ImportParseError['code'], string> = {
  notJson: 'settings.importErrorNotJson',
  badShape: 'settings.importErrorBadShape',
  badPlots: 'settings.importErrorBadPlots',
  badActivities: 'settings.importErrorBadActivities',
};

function DataSection({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await buildDataExport();
      await Share.share({
        title: t('settings.exportData'),
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      Alert.alert(t('settings.exportErrorTitle'), t('settings.exportErrorMessage'));
    } finally {
      setExporting(false);
    }
  };

  const runImport = async (parsed: DataExport) => {
    setImporting(true);
    try {
      const result = await importDataExport(parsed);
      setImportText('');
      Alert.alert(
        t('settings.importSuccessTitle'),
        t('settings.importSuccessMessage', {
          plotsLabel: t('settings.importPlotsCount', { count: result.plotsImported }),
          activitiesLabel: t('settings.importActivitiesCount', { count: result.activitiesImported }),
        }),
      );
    } catch {
      Alert.alert(t('settings.importErrorTitle'), t('settings.importErrorGeneric'));
    } finally {
      setImporting(false);
    }
  };

  const handleImportPress = () => {
    let parsed: DataExport;
    try {
      parsed = parseDataExport(importText);
    } catch (error) {
      const code = error instanceof ImportParseError ? error.code : 'badShape';
      Alert.alert(t('settings.importErrorTitle'), t(IMPORT_ERROR_KEYS[code]));
      return;
    }

    Alert.alert(
      t('settings.importConfirmTitle'),
      t('settings.importConfirmMessage', {
        plotsLabel: t('settings.importPlotsCount', { count: parsed.plots.length }),
        activitiesLabel: t('settings.importActivitiesCount', { count: parsed.activities.length }),
      }),
      [
        { text: t('plotDetail.cancel'), style: 'cancel' },
        { text: t('settings.importConfirmButton'), onPress: () => runImport(parsed) },
      ],
    );
  };

  const canImport = importText.trim().length > 0 && !importing;

  return (
    <View style={styles.dataActions}>
      <Pressable style={styles.actionRow} onPress={handleExport} disabled={exporting}>
        <Text style={styles.actionRowText}>
          {exporting ? t('settings.exporting') : t('settings.exportData')}
        </Text>
      </Pressable>
      <TextInput
        style={styles.importInput}
        value={importText}
        onChangeText={setImportText}
        placeholder={t('settings.importPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        editable={!importing}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.actionRow} onPress={handleImportPress} disabled={!canImport}>
        <Text style={[styles.actionRowText, !canImport && styles.actionRowTextDisabled]}>
          {importing ? t('settings.importing') : t('settings.importData')}
        </Text>
      </Pressable>
    </View>
  );
}

interface SegmentedControlProps<T extends string> {
  options: T[];
  value: T;
  onChange: (option: T) => void;
  labelFor: (option: T) => string;
  styles: ReturnType<typeof createStyles>;
}

function SegmentedControl<T extends string>({ options, value, onChange, labelFor, styles }: SegmentedControlProps<T>) {
  return (
    <View style={styles.segmentedControl}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{labelFor(option)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

function AppearanceSection({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <SegmentedControl
      options={THEME_OPTIONS}
      value={preference}
      onChange={setPreference}
      labelFor={(option) => t(`settings.theme.${option}`)}
      styles={styles}
    />
  );
}

const LANGUAGE_OPTIONS: LanguagePreference[] = ['system', ...supportedLanguages];

function LanguageSection({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const [preference, setPreferenceState] = useState<LanguagePreference>(() => getLanguagePreference());

  const handleChange = (option: LanguagePreference) => {
    setLanguagePreference(option);
    setPreferenceState(option);
  };

  return (
    <SegmentedControl
      options={LANGUAGE_OPTIONS}
      value={preference}
      onChange={handleChange}
      labelFor={(option) => t(`settings.languageNames.${option}`)}
      styles={styles}
    />
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <SettingsSection title={t('settings.appearance')} styles={styles}>
        <AppearanceSection styles={styles} />
      </SettingsSection>
      <SettingsSection title={t('settings.language')} styles={styles}>
        <LanguageSection styles={styles} />
      </SettingsSection>
      <SettingsSection title={t('settings.data')} styles={styles}>
        <DataSection styles={styles} />
      </SettingsSection>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    row: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 12,
    },
    dataActions: { gap: 12 },
    actionRow: {},
    actionRowText: { fontSize: 15, color: colors.accentText, fontWeight: '600' },
    actionRowTextDisabled: { opacity: 0.4 },
    importInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top',
      color: colors.textPrimary,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.border,
      borderRadius: 6,
      padding: 3,
    },
    segment: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
    },
    segmentSelected: {
      backgroundColor: colors.background,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    segmentText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    segmentTextSelected: { color: colors.accentText, fontWeight: '600' },
  });
}
