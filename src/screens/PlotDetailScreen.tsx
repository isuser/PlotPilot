import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getPlot } from '../db/plots';
import type { Plot } from '../db/types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlotDetail'>;

// Minimal placeholder; the full view/edit experience is PLO-7.
export default function PlotDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const [plot, setPlot] = useState<Plot | null | undefined>(undefined);

  useEffect(() => {
    getPlot(route.params.plotId).then(setPlot);
  }, [route.params.plotId]);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{plot.name}</Text>
      {plot.crop ? <DetailRow label={t('plotDetail.crop')} value={plot.crop} /> : null}
      {plot.soilType ? <DetailRow label={t('plotDetail.soilType')} value={plot.soilType} /> : null}
      {plot.area != null ? <DetailRow label={t('plotDetail.area')} value={String(plot.area)} /> : null}
      {plot.perimeter != null ? (
        <DetailRow label={t('plotDetail.perimeter')} value={String(plot.perimeter)} />
      ) : null}
      {plot.notes ? <DetailRow label={t('plotDetail.notes')} value={plot.notes} /> : null}
    </ScrollView>
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
});
