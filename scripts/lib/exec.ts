/**
 * Exec - Utilidad para ejecución de comandos
 *
 * Proporciona wrappers para child_process con retry, timeout,
 * y manejo de errores consistente.
 *
 * @example
 * import { exec, execAsync, execWithRetry } from './lib/exec';
 *
 * // Síncrono
 * const result = exec('pnpm build');
 *
 * // Asíncrono
 * const { stdout } = await execAsync('pnpm test');
 *
 * // Con retry
 * await execWithRetry('npm publish', { retries: 3 });
 */

import { execSync, exec as execCb, spawn, type SpawnOptions } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execPromise = promisify(execCb);

export interface ExecOptions {
  /** Directorio de trabajo */
  cwd?: string;
  /** Variables de entorno adicionales */
  env?: Record<string, string>;
  /** Timeout en milisegundos */
  timeout?: number;
  /** Mostrar output en consola */
  stdio?: 'inherit' | 'pipe' | 'ignore';
  /** Silenciar errores (no lanzar excepciones) */
  silent?: boolean;
  /** Shell a usar */
  shell?: boolean | string;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: Error;
}

export interface RetryOptions extends ExecOptions {
  /** Número de reintentos */
  retries?: number;
  /** Delay entre reintentos en ms */
  retryDelay?: number;
  /** Factor de backoff exponencial */
  backoffFactor?: number;
}

/**
 * Ejecuta un comando de forma síncrona
 */
export function exec(command: string, options: ExecOptions = {}): ExecResult {
  const {
    cwd = process.cwd(),
    env = {},
    timeout,
    stdio = 'pipe',
    silent = false,
    shell = true,
  } = options;

  try {
    const stdout = execSync(command, {
      cwd,
      env: { ...process.env, ...env },
      timeout,
      stdio,
      encoding: 'utf-8',
      shell,
    });

    return {
      success: true,
      stdout: typeof stdout === 'string' ? stdout.trim() : '',
      stderr: '',
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };

    if (!silent) {
      logger.error(`Command failed: ${command}`, error);
    }

    return {
      success: false,
      stdout: execError.stdout?.toString().trim() ?? '',
      stderr: execError.stderr?.toString().trim() ?? '',
      exitCode: execError.status ?? 1,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Ejecuta un comando de forma asíncrona
 */
export async function execAsync(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  const { cwd = process.cwd(), env = {}, timeout, silent = false } = options;

  try {
    const { stdout, stderr } = await execPromise(command, {
      cwd,
      env: { ...process.env, ...env },
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };

    if (!silent) {
      logger.error(`Command failed: ${command}`, error);
    }

    return {
      success: false,
      stdout: execError.stdout?.toString().trim() ?? '',
      stderr: execError.stderr?.toString().trim() ?? '',
      exitCode: execError.code ?? 1,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Ejecuta un comando con reintentos automáticos
 */
export async function execWithRetry(command: string, options: RetryOptions = {}): Promise<ExecResult> {
  const { retries = 3, retryDelay = 1000, backoffFactor = 2, ...execOptions } = options;

  let lastResult: ExecResult | null = null;
  let delay = retryDelay;

  for (let attempt = 1; attempt <= retries; attempt++) {
    lastResult = await execAsync(command, { ...execOptions, silent: true });

    if (lastResult.success) {
      return lastResult;
    }

    if (attempt < retries) {
      logger.warn(`Command failed (attempt ${attempt}/${retries}), retrying in ${delay}ms...`);
      await sleep(delay);
      delay *= backoffFactor;
    }
  }

  if (!options.silent && lastResult) {
    logger.error(`Command failed after ${retries} attempts: ${command}`, lastResult.error);
  }

  return lastResult!;
}

/**
 * Ejecuta un comando como proceso en background
 */
export function spawnBackground(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): ReturnType<typeof spawn> {
  const defaultOptions: SpawnOptions = {
    cwd: process.cwd(),
    env: { ...process.env },
    detached: true,
    stdio: 'ignore',
    ...options,
  };

  const child = spawn(command, args, defaultOptions);
  child.unref();

  return child;
}

/**
 * Ejecuta un comando y retorna un stream
 */
export function spawnStream(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): ReturnType<typeof spawn> {
  const defaultOptions: SpawnOptions = {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: 'inherit',
    shell: true,
    ...options,
  };

  return spawn(command, args, defaultOptions);
}

/**
 * Ejecuta múltiples comandos en paralelo
 */
export async function execParallel(
  commands: Array<{ command: string; options?: ExecOptions }>
): Promise<ExecResult[]> {
  return Promise.all(commands.map(({ command, options }) => execAsync(command, options)));
}

/**
 * Ejecuta múltiples comandos en serie
 */
export async function execSeries(
  commands: Array<{ command: string; options?: ExecOptions }>,
  stopOnError = true
): Promise<ExecResult[]> {
  const results: ExecResult[] = [];

  for (const { command, options } of commands) {
    const result = await execAsync(command, options);
    results.push(result);

    if (!result.success && stopOnError) {
      break;
    }
  }

  return results;
}

/**
 * Verifica si un comando existe en el PATH
 */
export function commandExists(command: string): boolean {
  const isWindows = process.platform === 'win32';
  const checkCommand = isWindows ? `where ${command}` : `command -v ${command}`;

  const result = exec(checkCommand, { silent: true, stdio: 'pipe' });
  return result.success;
}

/**
 * Helper para sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { sleep };

