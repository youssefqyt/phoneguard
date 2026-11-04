import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface PermissionCardProps {
  title: string;
  description: string;
  granted: boolean;
  actionLabel?: string;
  onRequest?: () => void;
  /** Shown when the platform cannot support this at all. */
  unavailableReason?: string;
}

export function PermissionCard({
  title,
  description,
  granted,
  actionLabel = 'Open settings',
  onRequest,
  unavailableReason,
}: PermissionCardProps) {
  const unavailable = !!unavailableReason;

  return (
    <View
      style={[
        styles.card,
        granted ? styles.granted : unavailable ? styles.unavailable : styles.pending,
      ]}
    >
      <View style={styles.header}>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <View
          style={[
            styles.pill,
            granted
              ? { backgroundColor: colors.successSoft }
              : unavailable
                ? { backgroundColor: 'rgba(255,255,255,0.06)' }
                : { backgroundColor: colors.warningSoft },
          ]}
        >
          <AppText
            variant="tiny"
            color={
              granted ? colors.success : unavailable ? colors.textFaint : colors.warning
            }
          >
            {granted ? 'GRANTED' : unavailable ? 'UNAVAILABLE' : 'NEEDED'}
          </AppText>
        </View>
      </View>

      <AppText variant="caption" tone="muted" style={styles.description}>
        {unavailableReason ?? description}
      </AppText>

      {!granted && !unavailable && onRequest ? (
        <Button
          label={actionLabel}
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={onRequest}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  granted: {
    backgroundColor: colors.surface,
    borderColor: colors.success,
  },
  pending: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
  },
  unavailable: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    marginRight: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  description: {
    lineHeight: 18,
  },
  action: {
    marginTop: spacing.md,
  },
});
