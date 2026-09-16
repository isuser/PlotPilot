import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import ActivityFormScreen from '../screens/ActivityFormScreen';
import MapScreen from '../screens/MapScreen';
import PlotDetailScreen from '../screens/PlotDetailScreen';
import PlotFormScreen from '../screens/PlotFormScreen';
import TimelineScreen from '../screens/TimelineScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName="Map">
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={({ navigation }) => ({
          title: t('common.appName'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('Timeline')} hitSlop={8}>
              <Text style={{ color: '#2E7D32', fontWeight: '600', fontSize: 15 }}>
                {t('map.timeline')}
              </Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="PlotForm" component={PlotFormScreen} />
      <Stack.Screen
        name="PlotDetail"
        component={PlotDetailScreen}
        options={{ title: t('plotDetail.title') }}
      />
      <Stack.Screen name="ActivityForm" component={ActivityFormScreen} />
      <Stack.Screen name="Timeline" component={TimelineScreen} options={{ title: t('timeline.title') }} />
    </Stack.Navigator>
  );
}
