// AI_DECISION: Agregar lint rules para prevenir console.log en runtime
// Justificación: Prevenir logs no estructurados en producción
// Impacto: Fuerza uso de logger estructurado (lib/logger.ts)

export default [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-console': [
        'warn',
        {
          allow: ['error'], // Solo permitir console.error para casos críticos
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Barrel exports forbidden - breaks tree-shaking. Use specific exports instead.',
        },
      ],
    },
  },
  {
    // Tests: permitir any, console y vars sin uso para fixtures/mocks
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  {
    // Debug/diagnóstico: permitir console
    files: [
      'lib/debug-console/**/*',
      'lib/logger.ts',
      'public/debug-helper.js',
      'app/teams/page.tsx',
      'lib/utils/csv-export.test.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
];
