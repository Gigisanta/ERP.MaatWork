/**
 * Prompts - Utilidades para interacción con el usuario
 *
 * Proporciona prompts interactivos consistentes para scripts CLI.
 *
 * @example
 * import { confirm, select, input } from './lib/prompts';
 *
 * const proceed = await confirm('Continue?');
 * const option = await select('Choose:', ['a', 'b', 'c']);
 * const name = await input('Enter name:');
 */

import { createInterface } from 'readline';
import { colors } from './logger';

/**
 * Crea una interfaz readline
 */
function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Pregunta simple con respuesta de texto
 */
export async function input(question: string, defaultValue?: string): Promise<string> {
  const rl = createReadlineInterface();
  const defaultHint = defaultValue ? colors.muted(` (${defaultValue})`) : '';

  return new Promise((resolve) => {
    rl.question(`${colors.primary('?')} ${question}${defaultHint} `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Confirmación sí/no
 */
export async function confirm(question: string, defaultValue = false): Promise<boolean> {
  const rl = createReadlineInterface();
  const hint = defaultValue ? colors.muted(' (Y/n)') : colors.muted(' (y/N)');

  return new Promise((resolve) => {
    rl.question(`${colors.primary('?')} ${question}${hint} `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();

      if (normalized === '') {
        resolve(defaultValue);
      } else {
        resolve(normalized === 'y' || normalized === 'yes' || normalized === 'si');
      }
    });
  });
}

/**
 * Selección de una opción de una lista
 */
export async function select<T extends string>(
  question: string,
  options: T[],
  defaultIndex = 0
): Promise<T> {
  const rl = createReadlineInterface();

  console.log(`\n${colors.primary('?')} ${question}\n`);

  options.forEach((option, index) => {
    const prefix = index === defaultIndex ? colors.primary('❯') : ' ';
    const label = index === defaultIndex ? colors.primary(option) : option;
    console.log(`  ${prefix} ${index + 1}. ${label}`);
  });

  return new Promise((resolve) => {
    rl.question(`\n${colors.muted('Enter number (1-' + options.length + ')')} `, (answer) => {
      rl.close();

      const index = parseInt(answer.trim(), 10) - 1;
      if (isNaN(index) || index < 0 || index >= options.length) {
        resolve(options[defaultIndex]);
      } else {
        resolve(options[index]);
      }
    });
  });
}

/**
 * Selección múltiple
 */
export async function multiSelect<T extends string>(
  question: string,
  options: T[],
  defaultSelected: T[] = []
): Promise<T[]> {
  const rl = createReadlineInterface();

  console.log(`\n${colors.primary('?')} ${question}`);
  console.log(colors.muted('  (Enter comma-separated numbers, e.g., 1,3,4)\n'));

  options.forEach((option, index) => {
    const isSelected = defaultSelected.includes(option);
    const checkbox = isSelected ? colors.success('☑') : '☐';
    console.log(`  ${checkbox} ${index + 1}. ${option}`);
  });

  return new Promise((resolve) => {
    rl.question(`\n${colors.muted('Selection:')} `, (answer) => {
      rl.close();

      if (!answer.trim()) {
        resolve(defaultSelected);
        return;
      }

      const indices = answer
        .split(',')
        .map((s) => parseInt(s.trim(), 10) - 1)
        .filter((i) => !isNaN(i) && i >= 0 && i < options.length);

      resolve(indices.map((i) => options[i]));
    });
  });
}

/**
 * Entrada de contraseña (oculta input)
 */
export async function password(question: string): Promise<string> {
  const rl = createReadlineInterface();

  // Ocultar input (solo funciona en terminales que soportan muting)
  if (process.stdin.isTTY) {
    process.stdout.write(`${colors.primary('?')} ${question} `);

    return new Promise((resolve) => {
      let input = '';

      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (char: string) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          console.log('');
          rl.close();
          resolve(input);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit(0);
        } else if (char === '\u007F') {
          // Backspace
          input = input.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(`${colors.primary('?')} ${question} ${'*'.repeat(input.length)}`);
        } else {
          input += char;
          process.stdout.write('*');
        }
      };

      process.stdin.on('data', onData);
    });
  }

  // Fallback para terminales sin soporte
  return input(question);
}

/**
 * Pausa hasta que el usuario presione Enter
 */
export async function pause(message = 'Press Enter to continue...'): Promise<void> {
  const rl = createReadlineInterface();

  return new Promise((resolve) => {
    rl.question(colors.muted(message), () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Espera con mensaje
 */
export async function wait(ms: number, message?: string): Promise<void> {
  if (message) {
    console.log(colors.muted(message));
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

