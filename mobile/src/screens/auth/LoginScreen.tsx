import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, Field, Screen } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/types';
import type { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore(state => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // RootNavigator swaps to the authenticated stack automatically.
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'That email or password is not right.'
          : err instanceof Error
            ? err.message
            : 'Could not sign in.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Welcome back" subtitle="Sign in to your PhoneGuard account.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        placeholder="••••••••"
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />

      {error ? (
        <AppText variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <Button label="Sign in" onPress={onSubmit} loading={loading} />

      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={styles.link}
      >
        <AppText variant="caption" tone="muted" align="center">
          New here? <AppText variant="caption" tone="primary">Create an account</AppText>
        </AppText>
      </TouchableOpacity>

      <View style={styles.demo}>
        <AppText variant="tiny" tone="faint" align="center">
          Seeded demo accounts
        </AppText>
        <TouchableOpacity
          onPress={() => {
            setEmail('parent@phoneguard.dev');
            setPassword('Password123!');
          }}
        >
          <AppText variant="caption" tone="primary" align="center">
            Use parent@phoneguard.dev
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setEmail('child@phoneguard.dev');
            setPassword('Password123!');
          }}
        >
          <AppText variant="caption" tone="primary" align="center">
            Use child@phoneguard.dev
          </AppText>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    marginBottom: spacing.md,
  },
  link: {
    marginTop: spacing.lg,
  },
  demo: {
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
});
