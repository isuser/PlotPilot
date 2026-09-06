import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import './src/i18n';
import { getDatabase } from './src/db';

export default function App() {
  const { t } = useTranslation();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDatabase().then(() => setDbReady(true));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName')}</Text>
      <Text>{t('home.welcome')}</Text>
      <Text style={styles.status}>
        {dbReady ? 'Database ready' : 'Loading database...'}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  status: {
    marginTop: 16,
    color: '#666',
  },
});
