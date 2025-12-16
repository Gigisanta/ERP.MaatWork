import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    ignores: ['.next/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Web specific overrides
      'react-hooks/exhaustive-deps': 'off', // Keep existing preference
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Barrel exports forbidden in web app - breaks tree-shaking.',
        },
      ],
    },
  },
];
