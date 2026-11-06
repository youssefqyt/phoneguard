import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  ListRow,
  Screen,
} from '../../components';
import {
  useHouseholds,
  usePairDevice,
  useRegisterDevice,
  useRevokeDevice,
} from '../../api/hooks';
import { useDeviceSelection } from '../../hooks/useDeviceSelection';
import { householdsApi } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { APP_VERSION } from '../../config';
import { colors, radii, spacing } from '../../theme';
import { formatDateKey } from '../../utils/format';
import { showAlert } from '../../utils/dialog';

const ROLE_TONE: Record<string, 'primary' | 'success' | 'warning' | 'muted'> = {
  OWNER: 'primary',
  PARENT: 'success',
  CHILD: 'warning',
  VIEWER: 'muted',
};

export function FamilyScreen() {
  const user = useAuthStore(state => state.user);
  const isGuardian = user?.role === 'PARENT' || user?.role === 'ADMIN';

  const households = useHouseholds();
  const { devices } = useDeviceSelection();
  const registerDevice = useRegisterDevice();
  const pairDevice = usePairDevice();
  const revokeDevice = useRevokeDevice();

  const [showRegister, setShowRegister] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [codeToPair, setCodeToPair] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const household = households.data?.[0] ?? null;

  async function onRegisterDevice() {
    const name = deviceName.trim();
    if (!name) {
      showAlert('Name required', 'Give the device a name so you can tell it apart.');
      return;
    }
    try {
      const device = await registerDevice.mutateAsync({
        name,
        platform: Platform.OS === 'web' ? 'WEB' : Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        appVersion: APP_VERSION,
      });
      setPairingCode(device.pairingCode);
      setDeviceName('');
      setShowRegister(false);
    } catch (err) {
      showAlert(
        'Could not register',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  async function onPair() {
    const code = codeToPair.trim().toUpperCase();
    if (!code) return;
    try {
      await pairDevice.mutateAsync({ code, householdId: household?.id });
      setCodeToPair('');
      showAlert('Device paired', 'It will now receive limits and schedules.');
    } catch (err) {
      showAlert(
        'Pairing failed',
        err instanceof Error ? err.message : 'Check the code and try again.',
      );
    }
  }

  async function onCreateInvite() {
    if (!household) {
      showAlert('No household', 'Create a household first.');
      return;
    }
    try {
      const invite = await householdsApi.createInvite(household.id, {
        role: 'CHILD',
        expiresInDays: 7,
      });
      setInviteCode(invite.code);
    } catch (err) {
      showAlert(
        'Could not create invite',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  function confirmRevoke(deviceId: string, name: string) {
    showAlert('Revoke device', `${name} will stop syncing immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: () => revokeDevice.mutate(deviceId),
      },
    ]);
  }

  return (
    <Screen title="Family" subtitle="People, devices and pairing.">
      <Card
        title={household?.name ?? 'No household'}
        subtitle={
          household
            ? `${household.members?.length ?? 0} member(s)`
            : 'Create a household to manage devices together'
        }
      >
        {households.isLoading ? (
          <AppText variant="caption" tone="muted">
            Loading…
          </AppText>
        ) : !household ? (
          <EmptyState
            title="No household yet"
            message="Households group devices, rules and rewards for one family."
          />
        ) : (
          (household.members ?? []).map(member => (
            <ListRow
              key={member.id}
              title={member.user?.displayName ?? member.userId}
              subtitle={member.user?.email}
              leading={undefined}
              trailing={
                <Badge
                  label={member.role}
                  color={
                    ROLE_TONE[member.role] === 'primary'
                      ? colors.primary
                      : ROLE_TONE[member.role] === 'success'
                        ? colors.success
                        : ROLE_TONE[member.role] === 'warning'
                          ? colors.warning
                          : colors.textFaint
                  }
                />
              }
            />
          ))
        )}
      </Card>

      <Card title="Devices" subtitle={`${devices.length} registered`}>
        {devices.length === 0 ? (
          <AppText variant="caption" tone="muted">
            No devices yet.
          </AppText>
        ) : (
          devices.map(device => (
            <View key={device.id} style={styles.deviceRow}>
              <View style={styles.deviceText}>
                <AppText variant="body">{device.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {device.platform}
                  {device.status === 'PAIRED' ? '' : ` · ${device.status}`}
                  {device.lastSeenAt
                    ? ` · seen ${formatDateKey(device.lastSeenAt, 'D MMM HH:mm')}`
                    : ''}
                </AppText>
              </View>
              {isGuardian ? (
                <Button
                  label="Revoke"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => confirmRevoke(device.id, device.name)}
                />
              ) : null}
            </View>
          ))
        )}

        {pairingCode ? (
          <View style={styles.codeBox}>
            <AppText variant="tiny" tone="faint">
              PAIRING CODE
            </AppText>
            <AppText variant="display" style={styles.code}>
              {pairingCode}
            </AppText>
            <AppText variant="caption" tone="muted">
              Enter this on the guardian's device to link it.
            </AppText>
          </View>
        ) : null}

        {isGuardian ? (
          <View style={styles.deviceActions}>
            <Button
              label={showRegister ? 'Close' : 'Register a device'}
              size="sm"
              variant="secondary"
              fullWidth={false}
              onPress={() => setShowRegister(v => !v)}
            />
          </View>
        ) : null}

        {showRegister ? (
          <View style={styles.form}>
            <Field
              label="Device name"
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Sam's Pixel 8"
            />
            <Button
              label="Generate pairing code"
              onPress={() => void onRegisterDevice()}
              loading={registerDevice.isPending}
            />
          </View>
        ) : null}
      </Card>

      {isGuardian ? (
        <Card title="Pair a device">
          <Field
            label="Pairing code"
            value={codeToPair}
            onChangeText={setCodeToPair}
            placeholder="K7QM4XPT"
            autoCapitalize="characters"
          />
          <Button
            label="Pair device"
            variant="secondary"
            onPress={() => void onPair()}
            loading={pairDevice.isPending}
          />
        </Card>
      ) : null}

      {isGuardian ? (
        <Card title="Invite a member">
          <AppText variant="caption" tone="muted" style={styles.inviteHelp}>
            Share this code so someone can join the household as a child.
          </AppText>
          {inviteCode ? (
            <View style={styles.codeBox}>
              <AppText variant="tiny" tone="faint">
                INVITE CODE
              </AppText>
              <AppText variant="title" style={styles.code}>
                {inviteCode}
              </AppText>
            </View>
          ) : null}
          <Button
            label="Create invite code"
            variant="secondary"
            onPress={() => void onCreateInvite()}
          />
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Avatar name={user?.displayName ?? 'You'} />
        <View style={styles.footerText}>
          <AppText variant="body">{user?.displayName}</AppText>
          <AppText variant="caption" tone="muted">
            {user?.email} · {user?.role}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  deviceText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  deviceActions: {
    marginTop: spacing.md,
  },
  codeBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  code: {
    letterSpacing: 3,
    marginVertical: spacing.xs,
  },
  form: {
    marginTop: spacing.md,
  },
  inviteHelp: {
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerText: {
    marginLeft: spacing.md,
  },
});
