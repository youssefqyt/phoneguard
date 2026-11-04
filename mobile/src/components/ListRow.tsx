import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { initials as toInitials } from '../utils/format';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Emoji or short text shown in the leading tile. */
  leading?: string;
  /** Colour of the leading tile background. */
  leadingColor?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ListRow({
  title,
  subtitle,
  leading,
  leadingColor = colors.surfaceAlt,
  trailing,
  onPress,
  style,
}: ListRowProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.row,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {leading ? (
        <View style={[styles.leading, { backgroundColor: leadingColor }]}>
          <AppText variant="body">{leading}</AppText>
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </Container>
  );
}

export interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export function Avatar({ name, size = 40, color = colors.primary }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <AppText variant="label" color="#FFFFFF">
        {toInitials(name)}
      </AppText>
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  text: {
    flex: 1,
    marginRight: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
