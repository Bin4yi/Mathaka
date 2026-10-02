// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const a11y = require('eslint-plugin-react-native-a11y');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'assets/generated/*', 'jest.setup.ts'],
  },
  {
    // Accessibility rules (plugin is written for ESLint 8 but its rules run fine on 9).
    plugins: { 'react-native-a11y': a11y },
    rules: {
      ...Object.fromEntries(Object.keys(a11y.configs.all.rules).map((r) => [r, 'error'])),
      // Hints are optional for obvious actions; labels are what we require (checked in Jest too).
      'react-native-a11y/has-accessibility-hint': 'off',
    },
  },
]);
