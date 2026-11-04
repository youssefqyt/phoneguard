import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

export interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, style, ...rest }: FieldProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" style={styles.helper}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="faint" style={styles.helper}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.danger,
  },
  helper: {
    marginTop: spacing.xs,
  },
});
