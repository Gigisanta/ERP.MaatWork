/**
 * Spinner - Indicadores de progreso para operaciones largas
 *
 * Proporciona spinners animados para feedback visual durante operaciones.
 *
 * @example
 * import { spinner, withSpinner } from './lib/spinner';
 *
 * // Manual
 * const spin = spinner('Loading...');
 * spin.start();
 * await doSomething();
 * spin.succeed('Done!');
 *
 * // Automático
 * await withSpinner('Loading...', async () => {
 *   await doSomething();
 * });
 */

import { colors } from './logger';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80;

export interface Spinner {
  start(): void;
  stop(): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  warn(text?: string): void;
  text(newText: string): void;
  isSpinning: boolean;
}

/**
 * Crea un spinner
 */
export function spinner(text: string): Spinner {
  let frameIndex = 0;
  let intervalId: NodeJS.Timeout | null = null;
  let currentText = text;
  let isSpinning = false;

  const isTTY = process.stdout.isTTY;
  const isCI = process.env.CI === 'true';

  function clearLine(): void {
    if (isTTY && !isCI) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }

  function render(): void {
    if (!isTTY || isCI) return;

    clearLine();
    const frame = colors.primary(SPINNER_FRAMES[frameIndex]);
    process.stdout.write(`${frame} ${currentText}`);
    frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
  }

  return {
    get isSpinning() {
      return isSpinning;
    },

    start() {
      if (isSpinning) return;
      isSpinning = true;

      if (!isTTY || isCI) {
        console.log(`⏳ ${currentText}`);
        return;
      }

      // Ocultar cursor
      process.stdout.write('\x1B[?25l');
      render();
      intervalId = setInterval(render, SPINNER_INTERVAL);
    },

    stop() {
      if (!isSpinning) return;
      isSpinning = false;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      clearLine();

      // Mostrar cursor
      if (isTTY && !isCI) {
        process.stdout.write('\x1B[?25h');
      }
    },

    succeed(newText?: string) {
      this.stop();
      const finalText = newText ?? currentText;
      console.log(`${colors.success('✅')} ${finalText}`);
    },

    fail(newText?: string) {
      this.stop();
      const finalText = newText ?? currentText;
      console.log(`${colors.error('❌')} ${finalText}`);
    },

    warn(newText?: string) {
      this.stop();
      const finalText = newText ?? currentText;
      console.log(`${colors.warning('⚠️')} ${finalText}`);
    },

    text(newText: string) {
      currentText = newText;
      if (!isTTY || isCI) {
        console.log(`   ${newText}`);
      }
    },
  };
}

/**
 * Ejecuta una función con un spinner automático
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  options: { successText?: string; failText?: string } = {}
): Promise<T> {
  const spin = spinner(text);
  spin.start();

  try {
    const result = await fn();
    spin.succeed(options.successText);
    return result;
  } catch (error) {
    spin.fail(options.failText);
    throw error;
  }
}

/**
 * Barra de progreso simple
 */
export interface ProgressBar {
  update(current: number, total?: number): void;
  increment(): void;
  done(): void;
}

export function progressBar(total: number, text = 'Progress'): ProgressBar {
  let current = 0;
  const isTTY = process.stdout.isTTY;
  const isCI = process.env.CI === 'true';
  const width = 30;

  function render(): void {
    if (!isTTY || isCI) return;

    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${text} ${bar} ${percentage}% (${current}/${total})`);
  }

  return {
    update(newCurrent: number, newTotal?: number) {
      current = newCurrent;
      if (newTotal !== undefined) {
        // @ts-expect-error - Allow reassignment for flexibility
        total = newTotal;
      }
      render();
    },

    increment() {
      current++;
      render();
    },

    done() {
      if (isTTY && !isCI) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
      console.log(`${colors.success('✅')} ${text} completed (${total}/${total})`);
    },
  };
}

/**
 * Muestra un countdown
 */
export async function countdown(seconds: number, message = 'Starting in'): Promise<void> {
  const isTTY = process.stdout.isTTY;
  const isCI = process.env.CI === 'true';

  for (let i = seconds; i > 0; i--) {
    if (isTTY && !isCI) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${message} ${colors.primary(String(i))}...`);
    } else if (i === seconds) {
      console.log(`${message} ${seconds} seconds...`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (isTTY && !isCI) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }
}

/**
 * Wrapper para mostrar tiempo de ejecución
 */
export async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  console.log(`⏱️  ${label}...`);

  try {
    const result = await fn();
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`${colors.success('✅')} ${label} ${colors.muted(`(${duration}s)`)}`);
    return result;
  } catch (error) {
    const duration = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`${colors.error('❌')} ${label} failed ${colors.muted(`(${duration}s)`)}`);
    throw error;
  }
}
