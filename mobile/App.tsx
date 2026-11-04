/**
 * PhoneGuard — application root.
 *
 * Boots the persisted session and local settings before the navigator mounts,
 * wires up React Query, and clears cached server data on sign-out.
 *
 * @format
 */

import { useEffect, useState, type ReactNode } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LoadingState } from './src/components';
import { useAuthStore } from './src/store/authStore';
import { useSettingsStore } from './src/store/settingsStore';
import { colors } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

function Bootstrap({ children }: { children: ReactNode }) {
  const status = useAuthStore(state => state.status);
  const bootstrap = useAuthStore(state => state.bootstrap);
  const hydrate = useSettingsStore(state => state.hydrate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.all([bootstrap(), hydrate()]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrap, hydrate]);

  // Drop any cached server data once the session ends.
  useEffect(() => {
    if (status === 'unauthenticated') {
      queryClient.clear();
    }
  }, [status]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <LoadingState label="Starting PhoneGuard…" />
      </View>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <Bootstrap>
          <RootNavigator />
        </Bootstrap>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
