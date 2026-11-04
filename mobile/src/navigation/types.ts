import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Limits: undefined;
  Focus: undefined;
  Rewards: undefined;
  Family: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  AppDetail: { deviceId: string; packageName: string; appName?: string };
  RuleEditor: { deviceId?: string; householdId?: string; ruleId?: string };
  Notifications: undefined;
  Settings: undefined;
  Permissions: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
