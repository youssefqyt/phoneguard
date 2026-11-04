module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // The codebase uses `void somePromise` deliberately to mark
    // fire-and-forget async calls, so the rule gets in the way.
    'no-void': 'off',
    // Inline styles are used for a handful of genuinely dynamic values
    // (chart bar heights, computed colours) where a StyleSheet adds nothing.
    'react-native/no-inline-styles': 'off',
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
    'eslint-comments/no-unused-disable': 'off',
  },
};
