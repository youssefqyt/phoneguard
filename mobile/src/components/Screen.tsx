import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Large heading rendered at the top of the screen. */
  title?: string;
  subtitle?: string;
  /** Rendered to the right of the title. */
  headerRight?: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  headerRight,
  padded = true,
  style,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="display">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" tone="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {headerRight ? <View>{headerRight}</View> : null}
    </View>
  ) : null;

  const body = (
    <>
      {header}
      {children}
    </>
  );

  if (!scroll) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.md },
          padded ? styles.padded : null,
          style,
        ]}
      >
        {body}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl * 2 },
        padded ? styles.padded : null,
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
