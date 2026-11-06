import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  Field,
  ListRow,
  LoadingState,
  Screen,
  Segmented,
  StatRow,
  StatTile,
} from '../../components';
import {
  useCreateReward,
  useDecideRedemption,
  useGrantPoints,
  useHouseholds,
  usePoints,
  useRedemptions,
  useRedeemReward,
  useRewards,
} from '../../api/hooks';
import { useAuthStore } from '../../store/authStore';
import type { Redemption, Reward, RewardType } from '../../api/types';
import { colors, spacing } from '../../theme';
import { showAlert } from '../../utils/dialog';
import { formatDateKey, formatMinutes } from '../../utils/format';

const REWARD_ICONS: Record<RewardType, string> = {
  SCREEN_TIME: '⏱️',
  APP_UNLOCK: '🔓',
  PRIVILEGE: '🎁',
};

const STATUS_TONE: Record<Redemption['status'], 'success' | 'warning' | 'danger' | 'muted'> = {
  REQUESTED: 'warning',
  APPROVED: 'success',
  FULFILLED: 'success',
  DENIED: 'danger',
  EXPIRED: 'muted',
};

export function RewardsScreen() {
  const user = useAuthStore(state => state.user);
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const isGuardian = user?.role === 'PARENT' || user?.role === 'ADMIN';

  const rewards = useRewards();
  const points = usePoints();
  const redemptions = useRedemptions(false);
  const households = useHouseholds();
  const redeem = useRedeemReward();
  const decide = useDecideRedemption();
  const createReward = useCreateReward();
  const grantPoints = useGrantPoints();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('100');
  const [minutes, setMinutes] = useState('30');
  const [type, setType] = useState<RewardType>('SCREEN_TIME');

  const [awardTo, setAwardTo] = useState<string | null>(null);
  const [awardAmount, setAwardAmount] = useState('25');
  const [awardReason, setAwardReason] = useState('');

  const balance = user?.pointsBalance ?? 0;

  /** Household members a guardian can award points to. */
  const members = useMemo(
    () =>
      (households.data?.[0]?.members ?? []).filter(
        member => member.status === 'ACTIVE' && member.user,
      ),
    [households.data],
  );

  const pending = useMemo(
    () => (redemptions.data?.items ?? []).filter(r => r.status === 'REQUESTED'),
    [redemptions.data],
  );

  async function onRedeem(reward: Reward) {
    if (balance < reward.pointCost) {
      showAlert(
        'Not enough points',
        `You need ${reward.pointCost - balance} more points for this reward.`,
      );
      return;
    }
    try {
      await redeem.mutateAsync({ id: reward.id });
      await refreshProfile();
      showAlert('Request sent', 'A guardian will review it shortly.');
    } catch (err) {
      showAlert(
        'Could not redeem',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  async function onDecide(redemption: Redemption, approve: boolean) {
    try {
      await decide.mutateAsync({ id: redemption.id, approve });
      await refreshProfile();
    } catch (err) {
      showAlert(
        'Could not update',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  async function onCreate() {
    const pointCost = parseInt(cost, 10);
    if (!title.trim() || Number.isNaN(pointCost) || pointCost <= 0) {
      showAlert('Check the form', 'A title and a positive point cost are required.');
      return;
    }
    try {
      await createReward.mutateAsync({
        title: title.trim(),
        type,
        pointCost,
        valueMinutes: parseInt(minutes, 10) || 0,
      });
      setTitle('');
      setShowForm(false);
    } catch (err) {
      showAlert(
        'Could not create',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  async function onAward() {
    const amount = parseInt(awardAmount, 10);
    if (!Number.isInteger(amount) || amount === 0) {
      showAlert('Check the amount', 'Enter a non-zero number of points.');
      return;
    }
    if (awardReason.trim().length < 2) {
      showAlert('Add a reason', 'A short reason keeps the ledger meaningful.');
      return;
    }
    try {
      await grantPoints.mutateAsync({
        points: amount,
        reason: awardReason.trim(),
        targetUserId: awardTo ?? undefined,
      });
      setAwardReason('');
      showAlert('Points awarded', `${amount > 0 ? '+' : ''}${amount} points logged.`);
    } catch (err) {
      showAlert(
        'Could not award points',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  return (
    <Screen title="Rewards" subtitle="Earn points, spend them on perks.">
      <Card style={styles.balanceCard}>
        <AppText variant="tiny" tone="faint">
          YOUR BALANCE
        </AppText>
        <AppText variant="display" style={styles.balance}>
          {balance} pts
        </AppText>
        <AppText variant="caption" tone="muted">
          {points.data?.meta.total ?? 0} ledger entries
        </AppText>
      </Card>

      {isGuardian ? (
        <Card title="Award points" subtitle="For chores, homework or good choices">
          {members.length > 0 ? (
            <View style={styles.memberPicker}>
              <Button
                label="Myself"
                size="sm"
                fullWidth={false}
                variant={awardTo === null ? 'primary' : 'secondary'}
                onPress={() => setAwardTo(null)}
              />
              {members.map(member => (
                <Button
                  key={member.id}
                  label={member.user?.displayName ?? 'Member'}
                  size="sm"
                  fullWidth={false}
                  variant={awardTo === member.userId ? 'primary' : 'secondary'}
                  onPress={() => setAwardTo(member.userId)}
                />
              ))}
            </View>
          ) : null}
          <Field
            label="Points"
            value={awardAmount}
            onChangeText={setAwardAmount}
            keyboardType="number-pad"
            hint="Use a negative number to deduct"
          />
          <Field
            label="Reason"
            value={awardReason}
            onChangeText={setAwardReason}
            placeholder="Finished homework without reminders"
          />
          <Button
            label="Award points"
            variant="secondary"
            loading={grantPoints.isPending}
            onPress={() => void onAward()}
          />
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card
          title="Waiting for approval"
          subtitle={isGuardian ? 'Approve or deny requests' : 'Pending guardian review'}
        >
          {pending.map(redemption => (
            <View key={redemption.id} style={styles.pendingRow}>
              <View style={styles.pendingText}>
                <AppText variant="body">
                  {redemption.reward?.title ?? 'Reward'}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {redemption.pointCost} pts
                  {redemption.user ? ` · ${redemption.user.displayName}` : ''}
                </AppText>
              </View>
              {isGuardian ? (
                <View style={styles.decideActions}>
                  <Button
                    label="Deny"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => void onDecide(redemption, false)}
                  />
                  <Button
                    label="Approve"
                    size="sm"
                    fullWidth={false}
                    onPress={() => void onDecide(redemption, true)}
                  />
                </View>
              ) : (
                <AppText variant="tiny" tone="warning">
                  PENDING
                </AppText>
              )}
            </View>
          ))}
        </Card>
      ) : null}

      <Card
        title="Catalogue"
        subtitle={isGuardian ? 'Create and manage rewards' : 'Tap to redeem'}
        action={
          isGuardian ? (
            <Button
              label={showForm ? 'Close' : 'New'}
              size="sm"
              variant="secondary"
              fullWidth={false}
              onPress={() => setShowForm(v => !v)}
            />
          ) : undefined
        }
      >
        {showForm && isGuardian ? (
          <View style={styles.form}>
            <Field
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="1 hour extra screen time"
            />
            <Segmented<RewardType>
              value={type}
              onChange={setType}
              options={[
                { value: 'SCREEN_TIME', label: 'Screen time' },
                { value: 'APP_UNLOCK', label: 'Unlock' },
                { value: 'PRIVILEGE', label: 'Privilege' },
              ]}
            />
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Field
                  label="Point cost"
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.formField}>
                <Field
                  label="Minutes"
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Button
              label="Create reward"
              onPress={() => void onCreate()}
              loading={createReward.isPending}
            />
          </View>
        ) : null}

        {rewards.isLoading ? (
          <LoadingState />
        ) : (rewards.data ?? []).length === 0 ? (
          <AppText variant="caption" tone="muted">
            No rewards yet.
          </AppText>
        ) : (
          (rewards.data ?? []).map(reward => {
            const affordable = balance >= reward.pointCost;
            return (
              <ListRow
                key={reward.id}
                title={reward.title}
                subtitle={
                  reward.valueMinutes > 0
                    ? `${reward.pointCost} pts · ${formatMinutes(reward.valueMinutes)}`
                    : `${reward.pointCost} pts`
                }
                leading={REWARD_ICONS[reward.type]}
                leadingColor={affordable ? colors.successSoft : colors.surfaceAlt}
                trailing={
                  <Button
                    label={affordable ? 'Redeem' : 'Locked'}
                    size="sm"
                    fullWidth={false}
                    variant={affordable ? 'primary' : 'secondary'}
                    disabled={!affordable || redeem.isPending}
                    onPress={() => void onRedeem(reward)}
                  />
                }
              />
            );
          })
        )}
      </Card>

      <Card title="History">
        {(redemptions.data?.items ?? []).length === 0 ? (
          <EmptyState title="Nothing yet" message="Redeemed rewards will show up here." />
        ) : (
          (redemptions.data?.items ?? []).slice(0, 10).map(redemption => (
            <ListRow
              key={redemption.id}
              title={redemption.reward?.title ?? 'Reward'}
              subtitle={`${formatDateKey(redemption.createdAt, 'D MMM · HH:mm')} · ${
                redemption.pointCost
              } pts`}
              leading="🎫"
              leadingColor={colors.surfaceAlt}
              trailing={
                <AppText
                  variant="tiny"
                  tone={STATUS_TONE[redemption.status] === 'muted' ? 'faint' : STATUS_TONE[redemption.status]}
                >
                  {redemption.status}
                </AppText>
              }
            />
          ))
        )}
      </Card>

      <StatRow>
        <StatTile label="Rewards" value={String(rewards.data?.length ?? 0)} />
        <StatTile label="Pending" value={String(pending.length)} tone="warning" />
      </StatRow>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    paddingVertical: spacing.xl,
  },
  balance: {
    marginVertical: spacing.xs,
  },
  memberPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pendingText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  decideActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  form: {
    marginBottom: spacing.lg,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  formField: {
    flex: 1,
  },
});
