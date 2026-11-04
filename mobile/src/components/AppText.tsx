import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../theme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'success' | 'danger' | 'warning';

const toneColors: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  color?: string;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  align,
  color,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: color ?? toneColors[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const textStyles = StyleSheet.create({});
