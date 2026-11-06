import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from '@react-navigation/native';
import { createWebStackNavigator } from './WebStackNavigator';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { AppDetailScreen } from '../screens/dashboard/AppDetailScreen';
import { RuleEditorScreen } from '../screens/limits/RuleEditorScreen';
import { NotificationsScreen } from '../screens/settings/NotificationsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { PermissionsScreen } from '../screens/settings/PermissionsScreen';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

const Stack = createWebStackNavigator();

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.danger,
  },
};

export function RootNavigator() {
  const status = useAuthStore(state => state.status);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {status === 'authenticated' ? (
          <>
            <Stack.Screen
              name="Tabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AppDetail"
              component={AppDetailScreen}
              options={{ title: 'App detail' }}
            />
            <Stack.Screen
              name="RuleEditor"
              component={RuleEditorScreen}
              options={{ title: 'New rule', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: 'Notifications' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="Permissions"
              component={PermissionsScreen}
              options={{ title: 'Permissions' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Tabs"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
