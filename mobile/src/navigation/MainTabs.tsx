import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { LimitsScreen } from '../screens/limits/LimitsScreen';
import { FocusScreen } from '../screens/focus/FocusScreen';
import { RewardsScreen } from '../screens/rewards/RewardsScreen';
import { FamilyScreen } from '../screens/family/FamilyScreen';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, string> = {
  Dashboard: '📊',
  Limits: '⏳',
  Focus: '🎯',
  Rewards: '🏆',
  Family: '👨‍👩‍👧',
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: typography.tiny.fontSize, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Limits" component={LimitsScreen} />
      <Tab.Screen name="Focus" component={FocusScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
    </Tab.Navigator>
  );
}
