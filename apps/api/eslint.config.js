import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['src/routes/**/*.ts'],
    rules: {
      // Backend specific overrides
      // Allow barrel exports in routes for organization
      'no-restricted-syntax': 'off',
    },
  },
];
