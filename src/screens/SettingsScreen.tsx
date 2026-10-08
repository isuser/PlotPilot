import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import type { DataExport } from '../db/export';
import { ImportParseError, importDataExport, parseDataExport } from '../db/import';
import { KmlParseError, importKmlPlots, parseKml, type KmlParseResult } from '../db/kml';
import { getLanguagePreference, setLanguagePreference, supportedLanguages, type LanguagePreference } from '../i18n';
import type { RootStackParamList } from '../navigation/types';
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

function ExportSection({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable style={styles.actionRow} onPress={() => navigation.navigate('Export')}>
      <Text style={styles.actionRowText}>{t('settings.exportData')}</Text>
    </Pressable>
  );
}

const KML_ERROR_KEYS: Record<KmlParseError['code'], string> = {
  notXml: 'settings.kmlErrorNotXml',
  notKml: 'settings.kmlErrorNotKml',
  noPolygons: 'settings.kmlErrorNoPolygons',
};

function KmlImportRow({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  const runImport = async (parsed: KmlParseResult) => {
    setImporting(true);
    try {
      const count = await importKmlPlots(parsed.plots, (index) => t('settings.kmlDefaultPlotName', { index }));
      Alert.alert(
        t('settings.importSuccessTitle'),
        t('settings.kmlSuccessMessage', { plotsLabel: t('settings.importPlotsCount', { count }) }),
      );
    } catch {
      Alert.alert(t('settings.importErrorTitle'), t('settings.importErrorGeneric'));
    } finally {
      setImporting(false);
    }
  };

  // Any file type is allowed: iOS doesn't reliably map the KML MIME type,
  // so filtering would grey out valid files. The parser rejects non-KML.
  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || result.assets.length === 0) return;

    let parsed: KmlParseResult;
    try {
      parsed = parseKml(await new File(result.assets[0].uri).text());
    } catch (error) {
      const key = error instanceof KmlParseError ? KML_ERROR_KEYS[error.code] : 'settings.kmlErrorNotXml';
      Alert.alert(t('settings.importErrorTitle'), t(key));
      return;
    }

    const summary = t('settings.kmlConfirmMessage', {
      plotsLabel: t('settings.importPlotsCount', { count: parsed.plots.length }),
    });
    const skipped =
      parsed.skippedPlacemarks > 0 ? t('settings.kmlSkipped', { count: parsed.skippedPlacemarks }) : null;
    Alert.alert(t('settings.importConfirmTitle'), skipped ? `${summary}\n\n${skipped}` : summary, [
      { text: t('plotDetail.cancel'), style: 'cancel' },
      { text: t('settings.importConfirmButton'), onPress: () => runImport(parsed) },
    ]);
  };

  return (
    <Pressable style={styles.actionRow} onPress={handlePick} disabled={importing}>
      <Text style={[styles.actionRowText, importing && styles.actionRowTextDisabled]}>
        {importing ? t('settings.importing') : t('settings.importKml')}
      </Text>
      <Text style={styles.actionRowHint}>{t('settings.importKmlHint')}</Text>
    </Pressable>
  );
}

interface ImportSectionProps {
  styles: ReturnType<typeof createStyles>;
  onLanguageChange: (preference: LanguagePreference) => void;
}

function ImportSection({ styles, onLanguageChange }: ImportSectionProps) {
  const { t } = useTranslation();
  const { colors, setPreference: setThemePreference } = useTheme();
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const runImport = async (parsed: DataExport) => {
    setImporting(true);
    try {
      const result = await importDataExport(parsed);
      if (parsed.settings?.themePreference) setThemePreference(parsed.settings.themePreference);
      if (parsed.settings?.languagePreference) onLanguageChange(parsed.settings.languagePreference);
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

    const summary = t('settings.importConfirmMessage', {
      plotsLabel: t('settings.importPlotsCount', { count: parsed.plots.length }),
      activitiesLabel: t('settings.importActivitiesCount', { count: parsed.activities.length }),
    });
    Alert.alert(
      t('settings.importConfirmTitle'),
      parsed.settings ? `${summary}\n\n${t('settings.importConfirmSettings')}` : summary,
      [
        { text: t('plotDetail.cancel'), style: 'cancel' },
        { text: t('settings.importConfirmButton'), onPress: () => runImport(parsed) },
      ],
    );
  };

  const canImport = importText.trim().length > 0 && !importing;

  return (
    <View style={styles.importActions}>
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
      <View style={styles.divider} />
      <KmlImportRow styles={styles} />
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

interface LanguageSectionProps {
  styles: ReturnType<typeof createStyles>;
  preference: LanguagePreference;
  onChange: (preference: LanguagePreference) => void;
}

function LanguageSection({ styles, preference, onChange }: LanguageSectionProps) {
  const { t } = useTranslation();

  return (
    <SegmentedControl
      options={LANGUAGE_OPTIONS}
      value={preference}
      onChange={onChange}
      labelFor={(option) => t(`settings.languageNames.${option}`)}
      styles={styles}
    />
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Lives here (not in LanguageSection) so an import that carries settings
  // can update the selected language too.
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>(() =>
    getLanguagePreference(),
  );

  const handleLanguageChange = (option: LanguagePreference) => {
    setLanguagePreference(option);
    setLanguagePreferenceState(option);
  };

  return (
    <View style={styles.container}>
      <SettingsSection title={t('settings.appearance')} styles={styles}>
        <AppearanceSection styles={styles} />
      </SettingsSection>
      <SettingsSection title={t('settings.language')} styles={styles}>
        <LanguageSection styles={styles} preference={languagePreference} onChange={handleLanguageChange} />
      </SettingsSection>
      <SettingsSection title={t('settings.export')} styles={styles}>
        <ExportSection styles={styles} />
      </SettingsSection>
      <SettingsSection title={t('settings.import')} styles={styles}>
        <ImportSection styles={styles} onLanguageChange={handleLanguageChange} />
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
    importActions: { gap: 12 },
    actionRow: {},
    actionRowText: { fontSize: 15, color: colors.accentText, fontWeight: '600' },
    actionRowTextDisabled: { opacity: 0.4 },
    actionRowHint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
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
