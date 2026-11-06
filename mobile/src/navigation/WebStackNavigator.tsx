import { createNavigatorFactory, useNavigationBuilder } from '@react-navigation/native';
import { StackRouter } from '@react-navigation/routers';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';

function WebStackNavigator(props: any) {
  const { state, descriptors, navigation, render } = useNavigationBuilder(
    StackRouter,
    props,
  );
  const route = state.routes[state.index];
  const descriptor = descriptors[route.key];
  const options = descriptor.options as Record<string, unknown>;
  const title =
    typeof options.headerTitle === 'string'
      ? options.headerTitle
      : typeof options.title === 'string'
        ? options.title
        : route.name;
  const headerStyle = options.headerStyle as ViewStyle | undefined;

  return render(
    <View style={styles.container}>
      {options.headerShown !== false ? (
        <View style={[styles.header, headerStyle]}>
          {navigation.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backLabel}>‹ Back</Text>
            </Pressable>
          ) : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.scene}>{descriptor.render()}</View>
    </View>,
  );
}

export const createWebStackNavigator =
  createNavigatorFactory(WebStackNavigator);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#0b1020',
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27304a',
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 18,
  },
  backLabel: {
    color: '#8b9cff',
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: '#f1f3fa',
    fontSize: 17,
    fontWeight: '700',
  },
  scene: {
    flex: 1,
    minHeight: 0,
  },
});
