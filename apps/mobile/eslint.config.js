// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const a11y = require('./eslint-a11y');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*'] },
  {
    files: ['src/**/*.tsx'],
    plugins: { a11y },
    rules: { 'a11y/pressable-has-role': 'error', 'a11y/image-has-label': 'error' },
  },
]);
