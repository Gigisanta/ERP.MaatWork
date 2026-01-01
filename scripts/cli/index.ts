#!/usr/bin/env tsx
/**
 * MAATWORK CLI - Herramienta unificada de desarrollo
 *
 * Punto de entrada principal para todos los comandos de desarrollo.
 *
 * @example
 * pnpm mw dev              # Iniciar desarrollo
 * pnpm mw gen component    # Generar componente
 * pnpm mw db migrate       # Ejecutar migraciones
 * pnpm mw health           # Verificar salud del proyecto
 * pnpm mw test             # Ejecutar tests
 */

import { Command } from 'commander';
import { logger, getPackageInfo, colors } from '../lib/index';

// Importar comandos
import { devCommand } from './commands/dev';
import { dbCommand } from './commands/db';
import { testCommand } from './commands/test';
import { healthCommand } from './commands/health';
import { genCommand } from './commands/gen';
import { cleanCommand } from './commands/clean';
import { auditCommand } from './commands/audit';
import { releaseCommand } from './commands/release';
import { metricsCommand } from './commands/metrics';

const packageInfo = getPackageInfo();

const program = new Command();

program
  .name('mw')
  .description(colors.primary('MAATWORK CLI - Herramientas de desarrollo'))
  .version(packageInfo.version, '-v, --version', 'Mostrar versión')
  .helpOption('-h, --help', 'Mostrar ayuda')
  .addHelpText('after', `
${colors.muted('Ejemplos:')}
  ${colors.primary('$')} pnpm mw dev              Iniciar entorno de desarrollo
  ${colors.primary('$')} pnpm mw gen component    Generar un nuevo componente
  ${colors.primary('$')} pnpm mw db migrate       Ejecutar migraciones de BD
  ${colors.primary('$')} pnpm mw health           Verificar salud del proyecto
  ${colors.primary('$')} pnpm mw test             Ejecutar tests

${colors.muted('Más información:')}
  Documentación: ${colors.underline('docs/CLI.md')}
`);

// Registrar comandos
program.addCommand(devCommand);
program.addCommand(dbCommand);
program.addCommand(testCommand);
program.addCommand(healthCommand);
program.addCommand(genCommand);
program.addCommand(cleanCommand);
program.addCommand(auditCommand);
program.addCommand(releaseCommand);
program.addCommand(metricsCommand);

// Manejar comandos desconocidos
program.on('command:*', () => {
  logger.error(`Comando desconocido: ${program.args.join(' ')}`);
  logger.info('Usa --help para ver los comandos disponibles');
  process.exit(1);
});

// Parsear argumentos
program.parse(process.argv);

// Si no hay argumentos, mostrar ayuda
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

