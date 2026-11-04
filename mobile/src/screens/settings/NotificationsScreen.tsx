import { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  AppText,
  Button,
  Card,
  EmptyState,
  ListRow,
  LoadingState,
  Screen,
} from '../../components';
import { useMarkAllRead, useNotifications } from '../../api/hooks';
import { notificationsApi } from '../../api/endpoints';
import type { AppNotification, NotificationType } from '../../api/types';
import { colors, spacing } from '../../theme';
import { formatDateKey } from '../../utils/format';

const ICONS: Record<NotificationType, string> = {
  LIMIT_REACHED: '⏳',
  FOCUS_STARTED: '🎯',
  FOCUS_ENDED: '✅',
  REWARD_REQUESTED: '🎁',
  REWARD_APPROVED: '🏆',
  REWARD_DENIED: '🚫',
  DEVICE_PAIRED: '📱',
  SYSTEM: '🔔',
};

export function NotificationsScreen() {
  const qc = useQueryClient();
  const notifications = useNotifications(false);
  const markAllRead = useMarkAllRead();

  // Refresh whenever the screen is focused so the unread badge stays honest.
  useFocusEffect(
    useCallback(() => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    }, [qc]),
  );

  async function onOpen(notification: AppNotification) {
    if (notification.readAt) return;
    try {
      await notificationsApi.markRead(notification.id);
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // Non-fatal: the list still renders, we just leave it unread.
    }
  }

  async function onMarkAll() {
    try {
      await markAllRead.mutateAsync();
    } catch (err) {
      Alert.alert(
        'Could not update',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  }

  const items = notifications.data ?? [];
  const unread = items.filter(item => !item.readAt).length;

  return (
    <Screen
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : 'You are all caught up'}
      headerRight={
        unread > 0 ? (
          <Button
            label="Mark all read"
            size="sm"
            variant="secondary"
            fullWidth={false}
            loading={markAllRead.isPending}
            onPress={() => void onMarkAll()}
          />
        ) : undefined
      }
    >
      {notifications.isLoading ? (
        <LoadingState label="Loading notifications…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Nothing here yet"
          message="Limit alerts, focus updates and reward decisions will show up here."
        />
      ) : (
        <Card>
          {items.map(item => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={`${formatDateKey(item.createdAt, 'D MMM · HH:mm')} · ${item.body}`}
              leading={ICONS[item.type] ?? '🔔'}
              leadingColor={item.readAt ? colors.surfaceAlt : colors.primarySoft}
              trailing={
                item.readAt ? undefined : <View style={styles.dot} />
              }
              onPress={() => void onOpen(item)}
            />
          ))}
        </Card>
      )}

      <AppText variant="caption" tone="faint" style={styles.footnote}>
        Push delivery requires a Firebase/APNs configuration; in-app alerts are
        always available.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  footnote: {
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
