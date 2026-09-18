import { Pressable, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import ActivityFormScreen from '../screens/ActivityFormScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import PlotDetailScreen from '../screens/PlotDetailScreen';
import PlotFormScreen from '../screens/PlotFormScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TimelineScreen from '../screens/TimelineScreen';
import type { RootStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: t('common.appName'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
              <Text style={{ color: colors.accentText, fontWeight: '600', fontSize: 15 }}>
                {t('settings.title')}
              </Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="Map"
        component={MapScreen}
        options={({ navigation }) => ({
          title: t('map.title'),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('Timeline')} hitSlop={8}>
              <Text style={{ color: colors.accentText, fontWeight: '600', fontSize: 15 }}>
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
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings.title') }} />
    </Stack.Navigator>
  );
}
