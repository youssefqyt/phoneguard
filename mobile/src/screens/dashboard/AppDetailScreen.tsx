import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AppText,
  Button,
  Card,
  ListRow,
  ProgressBar,
  Screen,
  StatRow,
  StatTile,
} from '../../components';
import { useUsageApps } from '../../api/hooks';
import type { RootStackParamList } from '../../navigation/types';
import { categoryColor, spacing } from '../../theme';
import { formatDuration, packageToName, todayKey } from '../../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'AppDetail'>;

export function AppDetailScreen({ route, navigation }: Props) {
  const { deviceId, packageName, appName } = route.params;
  const query = useUsageApps(deviceId, todayKey());

  const app = useMemo(
    () => query.data?.apps.find(a => a.packageName === packageName),
    [query.data, packageName],
  );

  const title = app?.appName ?? appName ?? packageToName(packageName);

  return (
    <Screen title={title} subtitle={packageName}>
      <Card>
        <AppText variant="tiny" tone="faint">
          TIME TODAY
        </AppText>
        <AppText variant="display" style={styles.value}>
          {formatDuration(app?.totalSeconds ?? 0)}
        </AppText>
        <View style={styles.categoryRow}>
          <View
            style={[
              styles.categoryDot,
              { backgroundColor: categoryColor(app?.category) },
            ]}
          />
          <AppText variant="caption" tone="muted">
            {app?.category ?? 'Uncategorised'}
          </AppText>
        </View>
        <ProgressBar
          value={(app?.totalSeconds ?? 0) / (60 * 60)}
          color={categoryColor(app?.category)}
          style={styles.bar}
          label="of 1h"
        />
      </Card>

      <StatRow>
        <StatTile label="Launches" value={String(app?.launches ?? 0)} />
        <StatTile
          label="Avg / launch"
          value={formatDuration(
            app && app.launches > 0 ? app.totalSeconds / app.launches : 0,
          )}
        />
      </StatRow>

      <Card title="Actions">
        <ListRow
          title="Limit this app"
          subtitle="Set a daily allowance and block it when it runs out"
          leading="⏳"
          onPress={() =>
            navigation.navigate('RuleEditor', {
              deviceId,
            })
          }
        />
        <ListRow
          title="Block this app entirely"
          subtitle="Add it to the device blocklist"
          leading="🚫"
          onPress={() =>
            navigation.navigate('RuleEditor', {
              deviceId,
            })
          }
        />
      </Card>

      <Button
        label="Done"
        variant="secondary"
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: {
    marginTop: spacing.xs,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  bar: {
    marginTop: spacing.lg,
  },
});
