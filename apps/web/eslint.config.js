// AI_DECISION: Agregar lint rules para prevenir console.log en runtime
// Justificación: Prevenir logs no estructurados en producción
// Impacto: Fuerza uso de logger estructurado (lib/logger.ts)

export default [
  {
    ignores: ['.next/**', 'node_modules/**']
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-console': ['error', { 
        allow: ['error'] // Solo permitir console.error para casos críticos
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        caughtErrorsIgnorePattern: '^_',
        vars: 'all',
        args: 'after-used'
      }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'Barrel exports forbidden - breaks tree-shaking. Use specific exports instead.'
        }
      ]
    }
  }
];

