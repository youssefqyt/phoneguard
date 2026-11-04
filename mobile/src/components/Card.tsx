import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  style?: ViewStyle;
  /** Slightly lighter surface, used for nested content. */
  variant?: 'default' | 'alt';
}

export function Card({
  children,
  title,
  subtitle,
  action,
  style,
  variant = 'default',
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'alt' ? styles.alt : null,
        style,
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="heading">{title}</AppText>
            {subtitle ? (
              <AppText variant="caption" tone="muted" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  alt: {
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});
