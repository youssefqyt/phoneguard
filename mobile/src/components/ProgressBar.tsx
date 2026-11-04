import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii } from '../theme';
import { AppText } from './AppText';

export interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  /** Renders a subtle label to the right. */
  label?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  color = colors.primary,
  trackColor = colors.surfaceAlt,
  height = 8,
  label,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.track, { backgroundColor: trackColor, height }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: color, width: `${clamped * 100}%`, height },
          ]}
        />
      </View>
      {label ? (
        <AppText variant="caption" tone="muted" style={styles.label}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.pill,
  },
  label: {
    marginLeft: 10,
    minWidth: 44,
    textAlign: 'right',
  },
});
