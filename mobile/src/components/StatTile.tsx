import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  style?: ViewStyle;
}

const toneColor = {
  default: colors.text,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
} as const;

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  style,
}: StatTileProps) {
  return (
    <View style={[styles.tile, style]}>
      <AppText variant="tiny" tone="faint" style={styles.label}>
        {label.toUpperCase()}
      </AppText>
      <AppText variant="title" color={toneColor[tone]} style={styles.value}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function StatRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export interface BadgeProps {
  label: string;
  color?: string;
  background?: string;
}

export function Badge({ label, color = colors.primary, background }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: background ?? 'rgba(255,255,255,0.06)' },
      ]}
    >
      <AppText variant="tiny" color={color}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      {icon ? (
        <AppText variant="display" tone="faint" style={styles.emptyIcon}>
          {icon}
        </AppText>
      ) : null}
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText
          variant="body"
          tone="muted"
          align="center"
          style={styles.emptyMessage}
        >
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {
    marginBottom: spacing.xs,
  },
  value: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyMessage: {
    marginTop: spacing.sm,
  },
  emptyAction: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
