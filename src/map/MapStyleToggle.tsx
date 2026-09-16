import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export type MapStyleMode = 'street' | 'satellite';

interface Props {
  mode: MapStyleMode;
  onToggle: () => void;
}

export function MapStyleToggle({ mode, onToggle }: Props) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.button} onPress={onToggle}>
      <Text style={styles.text}>{mode === 'street' ? t('map.showSatellite') : t('map.showStreet')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  text: { fontWeight: '600', color: '#333', fontSize: 14 },
});
