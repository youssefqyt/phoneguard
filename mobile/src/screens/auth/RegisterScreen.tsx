import { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppText, Button, Field, Screen, Segmented } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { ApiError } from '../../api/types';
import type { AuthStackParamList } from '../../navigation/types';
import { spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type AccountKind = 'ADULT' | 'PARENT' | 'CHILD';

export function RegisterScreen({ navigation }: Props) {
  const register = useAuthStore(state => state.register);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kind, setKind] = useState<AccountKind>('PARENT');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (displayName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must be 8+ characters and include a letter and a number.');
      return;
    }

    setLoading(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: kind,
      });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'An account with that email already exists.'
          : err instanceof Error
            ? err.message
            : 'Could not create your account.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Create account"
      subtitle="Your role decides what you can manage."
    >
      <Segmented<AccountKind>
        value={kind}
        onChange={setKind}
        options={[
          { value: 'PARENT', label: 'Parent' },
          { value: 'ADULT', label: 'Just me' },
          { value: 'CHILD', label: 'Child' },
        ]}
      />

      <Field
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Alex Morgan"
        autoCapitalize="words"
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
        hint="Use at least 8 characters, including a letter and a number."
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />

      {error ? (
        <AppText variant="caption" tone="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <Button label="Create account" onPress={onSubmit} loading={loading} />

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.link}
      >
        <AppText variant="caption" tone="muted" align="center">
          Already have an account?{' '}
          <AppText variant="caption" tone="primary">Sign in</AppText>
        </AppText>
      </TouchableOpacity>
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
});
