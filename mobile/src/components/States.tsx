import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="caption" tone="muted" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({ message, onRetry, style }: ErrorStateProps) {
  return (
    <View style={[styles.errorBox, style]}>
      <AppText variant="label" tone="danger">
        Something went wrong
      </AppText>
      <AppText variant="caption" tone="muted" style={styles.errorMessage}>
        {message}
      </AppText>
      {onRetry ? (
        <Button
          label="Try again"
          variant="secondary"
          size="sm"
          onPress={onRetry}
          fullWidth={false}
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  label: {
    marginTop: spacing.sm,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
  },
  errorMessage: {
    marginTop: spacing.xs,
  },
  retry: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
});
