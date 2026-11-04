import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { ProgressBar } from './ProgressBar';

export interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  /** Highlight colour for the tallest bar / today. */
  accent?: string;
  height?: number;
  unit?: string;
  /** Formats a value for the tooltip row under the chart. */
  formatValue?: (value: number) => string;
  highlightIndex?: number;
  style?: ViewStyle;
}

/**
 * A dependency-free bar chart. Values are normalised against the maximum so
 * short and tall days remain readable.
 */
export function BarChart({
  data,
  accent = colors.primary,
  height = 120,
  formatValue,
  highlightIndex,
  style,
}: BarChartProps) {
  const max = Math.max(1, ...data.map(d => d.value));
  const highlight = highlightIndex ?? data.length - 1;

  return (
    <View style={style}>
      <View style={[styles.chart, { height }]}>
        {data.map((point, index) => {
          const ratio = point.value / max;
          const isHighlight = index === highlight;
          const barHeight = Math.max(4, ratio * (height - 28));
          return (
            <View key={`${point.label}-${index}`} style={styles.column}>
              {isHighlight ? (
                <AppText variant="tiny" tone="muted" style={styles.valueLabel}>
                  {formatValue ? formatValue(point.value) : String(point.value)}
                </AppText>
              ) : (
                <View style={styles.valueLabel} />
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: isHighlight ? accent : colors.surfaceAlt,
                  },
                ]}
              />
              <AppText
                variant="tiny"
                tone={isHighlight ? 'default' : 'faint'}
                style={styles.axisLabel}
              >
                {point.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export interface CategoryBreakdownProps {
  data: Array<{ category: string; value: number; color: string }>;
  formatValue?: (value: number) => string;
  style?: ViewStyle;
}

/** Stacked bar + legend for a category breakdown. */
export function CategoryBreakdown({
  data,
  formatValue,
  style,
}: CategoryBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return (
      <View style={style}>
        <AppText variant="caption" tone="muted">
          No usage recorded yet.
        </AppText>
      </View>
    );
  }

  return (
    <View style={style}>
      <View style={styles.stack}>
        {data.map(item => (
          <View
            key={item.category}
            style={{
              flex: item.value / total,
              backgroundColor: item.color,
              height: 12,
            }}
          />
        ))}
      </View>
      <View style={styles.legend}>
        {data.slice(0, 6).map(item => (
          <View key={item.category} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <AppText variant="caption" style={styles.legendLabel}>
              {titleCase(item.category)}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatValue ? formatValue(item.value) : String(item.value)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '62%',
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  valueLabel: {
    height: 16,
    marginBottom: 2,
  },
  axisLabel: {
    marginTop: 2,
  },
  stack: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  legend: {
    marginTop: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  legendLabel: {
    flex: 1,
  },
});

export { ProgressBar };
