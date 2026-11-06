import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, AppText, Button, Card } from '../../components';
import type { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: '📊', title: 'See where the time goes', body: 'Daily and weekly screen time, per app and per category.' },
  { icon: '⏳', title: 'Set limits that stick', body: 'Per-app allowances, blocklists, school hours and bedtime.' },
  { icon: '🎯', title: 'Focus together', body: 'Timed deep-work sessions that block distractions.' },
  { icon: '🏆', title: 'Reward good habits', body: 'Earn points, unlock screen time, celebrate progress.' },
];

export function WelcomeScreen({ navigation }: Props) {
  const isWide = useWindowDimensions().width >= 760;

  return (
    <Screen scroll title={undefined} contentStyle={styles.content}>
      <View style={[styles.hero, isWide && styles.heroWide]}>
        <View style={[styles.heroCopy, isWide && styles.heroCopyWide]}>
          <AppText variant="tiny" tone="primary" style={styles.brand}>
            PHONEGUARD
          </AppText>
          <AppText
            variant="display"
            accessibilityRole="header"
            style={styles.title}
          >
            Healthier screen time, together.
          </AppText>
          <AppText variant="body" tone="muted" style={styles.subtitle}>
            Track usage, set fair limits and turn focus into a habit — for you
            and the people you care for.
          </AppText>
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.heroArt, isWide && styles.heroArtWide]}
        >
          <View style={styles.orbit}>
            <View style={styles.orbitInner}>
              <View style={styles.guardMark}>
                <AppText variant="title" style={styles.guardCheck}>
                  ✓
                </AppText>
              </View>
            </View>
          </View>
          <View style={[styles.artCopy, isWide && styles.artCopyWide]}>
            <AppText
              variant="label"
              align={isWide ? 'center' : undefined}
              style={styles.artTitle}
            >
              A little more balance
            </AppText>
            <AppText
              variant="caption"
              tone="muted"
              align={isWide ? 'center' : undefined}
            >
              Built together, one day at a time.
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.features}>
        {FEATURES.map(feature => (
          <Card key={feature.title} style={styles.featureCard}>
            <View style={styles.featureRow}>
              <AppText variant="title" style={styles.featureIcon}>
                {feature.icon}
              </AppText>
              <View style={styles.featureText}>
                <AppText variant="label">{feature.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {feature.body}
                </AppText>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label="Create an account"
          onPress={() => navigation.navigate('Register')}
          style={styles.actionButton}
        />
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => navigation.navigate('Login')}
        />
      </View>

      <AppText variant="caption" tone="faint" align="center" style={styles.legal}>
        PhoneGuard is designed for consensual use — on your own devices, or a
        child's device with their knowledge.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  heroWide: {
    minHeight: 290,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroCopy: {
    flex: 1,
  },
  heroCopyWide: {
    maxWidth: 510,
    paddingRight: spacing.xl,
  },
  brand: {
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.md,
  },
  subtitle: {
    lineHeight: 22,
  },
  heroArt: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  heroArtWide: {
    width: 280,
    height: 236,
    flexDirection: 'column',
    flexShrink: 0,
    marginTop: 0,
    marginLeft: 'auto',
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  orbit: {
    width: 106,
    height: 106,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 53,
    borderWidth: 1,
    borderColor: '#46537C',
  },
  orbitInner: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  guardMark: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
  },
  guardCheck: {
    color: colors.text,
  },
  artCopy: {
    marginLeft: spacing.md,
  },
  artCopyWide: {
    marginLeft: 0,
    marginTop: spacing.sm,
  },
  artTitle: {
    marginBottom: spacing.xs,
  },
  features: {
    marginBottom: spacing.lg,
  },
  featureCard: {
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: spacing.md,
  },
  featureText: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  legal: {
    marginTop: spacing.xl,
    lineHeight: 16,
    color: colors.textFaint,
  },
});
