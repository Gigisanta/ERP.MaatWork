/**
 * Commitlint Configuration
 *
 * Valida mensajes de commit siguiendo Conventional Commits.
 *
 * Formato: <type>(<scope>): <description>
 *
 * Tipos permitidos:
 * - feat:     Nueva funcionalidad
 * - fix:      Corrección de bug
 * - docs:     Cambios en documentación
 * - style:    Formateo, sin cambio de lógica
 * - refactor: Refactorización de código
 * - perf:     Mejoras de rendimiento
 * - test:     Agregar o corregir tests
 * - build:    Cambios en build o dependencias
 * - ci:       Cambios en CI/CD
 * - chore:    Tareas de mantenimiento
 * - revert:   Revertir commit anterior
 *
 * Scopes sugeridos:
 * - api, web, analytics (apps)
 * - ui, db, types (packages)
 * - deps, config, scripts
 *
 * @example
 * feat(api): add user profile endpoint
 * fix(web): resolve login redirect loop
 * chore(deps): update dependencies
 * docs: update README with new commands
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipo siempre en minúsculas
    'type-case': [2, 'always', 'lower-case'],
    // Tipos permitidos
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    // Scope en minúsculas
    'scope-case': [2, 'always', 'lower-case'],
    // Subject no puede estar vacío
    'subject-empty': [2, 'never'],
    // Subject en minúsculas
    'subject-case': [2, 'always', ['lower-case', 'sentence-case']],
    // Sin punto al final
    'subject-full-stop': [2, 'never', '.'],
    // Longitud máxima del header
    'header-max-length': [2, 'always', 100],
    // Body puede tener líneas largas
    'body-max-line-length': [1, 'always', 200],
  },
  // Ignorar ciertos mensajes (merge commits, etc.)
  ignores: [
    (commit) => commit.includes('Merge'),
    (commit) => commit.includes('Revert'),
    (commit) => commit.startsWith('WIP'),
  ],
  helpUrl: 'https://www.conventionalcommits.org/',
};
