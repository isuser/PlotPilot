import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { listAllActivities } from '../db/activities';
import type { ActivityWithPlot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';
import { DEFAULT_PLOT_COLOR } from '../map/plotColors';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

export default function TimelineScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
    row: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
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
    plotName: { fontSize: 16, fontWeight: '600', flexShrink: 1, color: colors.textPrimary },
    date: { fontSize: 13, color: colors.textSecondary, marginLeft: 8 },
    activityType: { fontSize: 14, color: colors.accentText, fontWeight: '600', marginTop: 2 },
    notes: { fontSize: 14, marginTop: 4, color: colors.textPrimary },
  });
}
