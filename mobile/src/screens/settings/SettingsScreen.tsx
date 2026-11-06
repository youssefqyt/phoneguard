import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  ListRow,
  Screen,
  SwitchRow,
} from '../../components';
import { usersApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { API_URL, APP_VERSION } from '../../config';
import type { RootStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { showAlert } from '../../utils/dialog';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const collectorEnabled = useSettingsStore(state => state.collectorEnabled);
  const setCollectorEnabled = useSettingsStore(state => state.setCollectorEnabled);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function onSaveName() {
    const name = displayName.trim();
    if (!name || name === user?.displayName) return;
    setSavingName(true);
    try {
      await usersApi.updateProfile({ displayName: name });
      await refreshProfile();
      showAlert('Saved', 'Your display name has been updated.');
    } catch (err) {
      showAlert(
        'Could not save',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setSavingName(false);
    }
  }

  async function onChangePassword() {
    if (newPassword.length < 8) {
      showAlert('Too short', 'Use at least 8 characters.');
      return;
    }
    setSavingPassword(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setShowPassword(false);
      showAlert('Password changed', 'Use your new password next time you sign in.');
    } catch (err) {
      showAlert(
        'Could not change password',
        err instanceof Error ? err.message : 'Check your current password.',
      );
    } finally {
      setSavingPassword(false);
    }
  }

  function confirmLogout() {
    showAlert('Sign out', 'You will need to sign in again to see your data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  }

  return (
    <Screen title="Settings" subtitle="Account, data and app preferences.">
      <Card>
        <View style={styles.profile}>
          <Avatar name={user?.displayName ?? 'You'} size={52} />
          <View style={styles.profileText}>
            <AppText variant="heading">{user?.displayName ?? 'Signed in'}</AppText>
            <AppText variant="caption" tone="muted">
              {user?.email}
            </AppText>
          </View>
          <Badge
            label={user?.role ?? 'USER'}
            color={colors.primary}
            background={colors.primarySoft}
          />
        </View>

        <View style={styles.balanceRow}>
          <AppText variant="caption" tone="muted">
            Reward points
          </AppText>
          <AppText variant="heading">{user?.pointsBalance ?? 0} pts</AppText>
        </View>
      </Card>

      <Card title="Profile">
        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
        />
        <Button
          label="Save name"
          variant="secondary"
          loading={savingName}
          disabled={!displayName.trim() || displayName.trim() === user?.displayName}
          onPress={() => void onSaveName()}
        />
      </Card>

      <Card
        title="Password"
        action={
          <Button
            label={showPassword ? 'Close' : 'Change'}
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => setShowPassword(value => !value)}
          />
        }
      >
        {showPassword ? (
          <View>
            <Field
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              hint="At least 8 characters"
            />
            <Button
              label="Update password"
              loading={savingPassword}
              disabled={!currentPassword || newPassword.length < 8}
              onPress={() => void onChangePassword()}
            />
          </View>
        ) : (
          <AppText variant="caption" tone="muted">
            Keep your account secure with a fresh password.
          </AppText>
        )}
      </Card>

      <Card title="Data collection">
        <SwitchRow
          label="Background usage sync"
          description={
            Platform.OS === 'web'
              ? 'Unavailable in a browser; use the Android app to collect screen-time data.'
              : 'Periodically upload screen-time data from this device'
          }
          value={collectorEnabled}
          onValueChange={value => void setCollectorEnabled(value)}
          disabled={Platform.OS === 'web'}
        />
      </Card>

      <Card title="More">
        <ListRow
          title="Permissions & sync"
          subtitle="Usage access, app blocking, manual sync"
          leading="🔐"
          onPress={() => navigation.navigate('Permissions')}
        />
        <ListRow
          title="Notifications"
          subtitle="Alerts and reward decisions"
          leading="🔔"
          onPress={() => navigation.navigate('Notifications')}
        />
      </Card>

      <Button label="Sign out" variant="danger" onPress={confirmLogout} />

      <View style={styles.about}>
        <AppText variant="caption" tone="faint">
          PhoneGuard v{APP_VERSION}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.aboutLine}>
          API: {API_URL}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  about: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  aboutLine: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
