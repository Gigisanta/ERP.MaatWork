// AI_DECISION: Configuración ESLint consistente con web app
// Justificación: Mantener reglas de linting uniformes across monorepo
// Impacto: Prevención de console.log, any types, y patrones inconsistentes

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.js'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': [
        'warn',
        {
          allow: ['error'], // Solo permitir console.error para casos críticos
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_(next|req|res)$', // Common Express params
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Note: Barrel exports are allowed in backend API code for convenience
    },
  },
  {
    // Tests: permitir any, console y vars sin uso para fixtures/mocks
    files: ['**/*.test.ts', '**/*.spec.ts', 'src/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  {
    // Scripts y herramientas: permitir console para logging informativo
    files: ['src/scripts/**/*.ts', 'src/add-*.ts', 'src/verify-*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Config files: permitir console.warn con justificación AI_DECISION
    files: ['src/config/**/*.ts'],
    rules: {
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
    },
  },
];
