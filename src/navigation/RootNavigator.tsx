import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import ActivityFormScreen from '../screens/ActivityFormScreen';
import MapScreen from '../screens/MapScreen';
import PlotDetailScreen from '../screens/PlotDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName="Map">
      <Stack.Screen name="Map" component={MapScreen} options={{ title: t('common.appName') }} />
      <Stack.Screen
        name="PlotDetail"
        component={PlotDetailScreen}
        options={{ title: t('plotDetail.title') }}
      />
      <Stack.Screen name="ActivityForm" component={ActivityFormScreen} />
    </Stack.Navigator>
  );
}
