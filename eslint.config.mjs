import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// AI_DECISION: Simplified ESLint config to ensure stability with ESLint v9
// Justificación: Reverting to basic TS config while keeping the core requirement of 300 lines.
// Impacto: Ensures the project can still lint without Babel-related crashes.

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/next-env.d.ts',
    ],
  },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_(next|req|res)$',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    files: [
      '**/*.config.js',
      '**/*.config.mjs',
      '**/scripts/**/*.js',
      '**/scripts/**/*.mjs',
      '**/config/**/*.js',
    ],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
];
