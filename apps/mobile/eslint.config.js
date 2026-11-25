// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'dist-web/*', 'android/*', 'ios/*', '.expo/*'] },
  {
    rules: {
      // Apostrophes in <Text> are rendered literally in React Native; this web-HTML rule doesn't apply.
      'react/no-unescaped-entities': 'off',
      // TypeScript already verifies namespace members (false positives on expo-notifications enums).
      'import/namespace': 'off',
      // Prop→state syncing on mount (route params, loaded records) is intentional; keep visible as warnings.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
