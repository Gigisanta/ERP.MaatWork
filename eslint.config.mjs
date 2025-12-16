import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// AI_DECISION: Root ESLint config for consistency
// Justificación: Centralize linting rules to ensure code quality across the monorepo.
// Impacto: Affects all packages/apps.

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/.turbo/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_(next|req|res)$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];




