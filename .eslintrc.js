// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2020 },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:node/recommended-module',
  ],
  rules: {
    'no-console': 'off',
    // Already taken care by TypeScript.
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'import/no-named-as-default-member': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
  },
}
