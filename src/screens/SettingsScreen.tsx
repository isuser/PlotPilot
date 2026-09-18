import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildDataExport } from '../db/export';
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

function PlaceholderRow({ label, styles }: { label: string; styles: ReturnType<typeof createStyles> }) {
  return <Text style={styles.rowText}>{label}</Text>;
}

function DataSection({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

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

  return (
    <Pressable style={styles.actionRow} onPress={handleExport} disabled={exporting}>
      <Text style={styles.actionRowText}>
        {exporting ? t('settings.exporting') : t('settings.exportData')}
      </Text>
    </Pressable>
  );
}

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

function AppearanceSection({ styles }: { styles: ReturnType<typeof createStyles> }) {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();

  return (
    <View style={styles.segmentedControl}>
      {THEME_OPTIONS.map((option) => {
        const selected = option === preference;
        return (
          <Pressable
            key={option}
            onPress={() => setPreference(option)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {t(`settings.theme.${option}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
        <PlaceholderRow label={t('settings.comingSoon')} styles={styles} />
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
    rowText: { fontSize: 15, color: colors.textSecondary },
    actionRow: {},
    actionRowText: { fontSize: 15, color: colors.accentText, fontWeight: '600' },
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
