/**
 * Config - Carga y gestión de configuración centralizada
 *
 * Proporciona acceso a configuración del proyecto, paths,
 * y variables de entorno.
 *
 * @example
 * import { config, paths } from './lib/config';
 *
 * console.log(paths.root);        // /path/to/project
 * console.log(paths.apps.api);    // /path/to/project/apps/api
 * console.log(config.isCI);       // true/false
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

// Obtener directorio del script actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

/** Raíz del proyecto (2 niveles arriba de scripts/lib/) */
export const PROJECT_ROOT = resolve(__dirname, '../..');

/** Paths del proyecto */
export const paths = {
  root: PROJECT_ROOT,
  scripts: join(PROJECT_ROOT, 'scripts'),
  apps: {
    api: join(PROJECT_ROOT, 'apps/api'),
    web: join(PROJECT_ROOT, 'apps/web'),
    analytics: join(PROJECT_ROOT, 'apps/analytics-service'),
  },
  packages: {
    db: join(PROJECT_ROOT, 'packages/db'),
    ui: join(PROJECT_ROOT, 'packages/ui'),
    types: join(PROJECT_ROOT, 'packages/types'),
  },
  docs: join(PROJECT_ROOT, 'docs'),
  templates: join(PROJECT_ROOT, '.templates'),
  nodeModules: join(PROJECT_ROOT, 'node_modules'),
  turbo: join(PROJECT_ROOT, '.turbo'),
} as const;

/** Archivos de configuración importantes */
export const configFiles = {
  packageJson: join(PROJECT_ROOT, 'package.json'),
  turboJson: join(PROJECT_ROOT, 'turbo.json'),
  tsconfigBase: join(PROJECT_ROOT, 'tsconfig.base.json'),
  eslintConfig: join(PROJECT_ROOT, 'eslint.config.mjs'),
  envExample: join(paths.apps.api, 'config-example.env'),
  envLocal: join(paths.apps.api, '.env'),
} as const;

/** Información del proyecto desde package.json */
export interface PackageInfo {
  name: string;
  version: string;
  packageManager: string;
  engines: {
    node: string;
  };
}

let cachedPackageInfo: PackageInfo | null = null;

export function getPackageInfo(): PackageInfo {
  if (cachedPackageInfo) {
    return cachedPackageInfo;
  }

  try {
    const content = readFileSync(configFiles.packageJson, 'utf-8');
    const pkg = JSON.parse(content);
    cachedPackageInfo = {
      name: pkg.name ?? 'maatwork',
      version: pkg.version ?? '0.0.0',
      packageManager: pkg.packageManager ?? 'pnpm@9.10.0',
      engines: {
        node: pkg.engines?.node ?? '>=22.0.0',
      },
    };
    return cachedPackageInfo;
  } catch {
    return {
      name: 'maatwork',
      version: '0.0.0',
      packageManager: 'pnpm@9.10.0',
      engines: { node: '>=22.0.0' },
    };
  }
}

/** Configuración de entorno */
export const config = {
  /** Está en CI? */
  get isCI(): boolean {
    return process.env.CI === 'true';
  },

  /** Está en modo debug? */
  get isDebug(): boolean {
    return process.env.DEBUG === 'true';
  },

  /** Está en modo verbose? */
  get isVerbose(): boolean {
    return process.env.VERBOSE === 'true';
  },

  /** Sistema operativo */
  get isWindows(): boolean {
    return process.platform === 'win32';
  },

  get isMac(): boolean {
    return process.platform === 'darwin';
  },

  get isLinux(): boolean {
    return process.platform === 'linux';
  },

  /** Versión de Node */
  get nodeVersion(): string {
    return process.version;
  },

  /** Versión mayor de Node */
  get nodeMajorVersion(): number {
    return parseInt(process.version.slice(1).split('.')[0], 10);
  },

  /** Puerto del analytics service */
  get analyticsPort(): number {
    return parseInt(process.env.ANALYTICS_PORT ?? '3002', 10);
  },

  /** Puerto de la API */
  get apiPort(): number {
    return parseInt(process.env.API_PORT ?? '3001', 10);
  },

  /** Puerto del frontend */
  get webPort(): number {
    return parseInt(process.env.WEB_PORT ?? '3000', 10);
  },
} as const;

/** Workspaces del monorepo */
export const workspaces = [
  { name: '@maatwork/api', path: paths.apps.api, type: 'app' },
  { name: '@maatwork/web', path: paths.apps.web, type: 'app' },
  { name: '@maatwork/analytics-service', path: paths.apps.analytics, type: 'app' },
  { name: '@maatwork/db', path: paths.packages.db, type: 'package' },
  { name: '@maatwork/ui', path: paths.packages.ui, type: 'package' },
  { name: '@maatwork/types', path: paths.packages.types, type: 'package' },
] as const;

/**
 * Verifica si un path existe
 */
export function pathExists(path: string): boolean {
  return existsSync(path);
}

/**
 * Resuelve un path relativo al root del proyecto
 */
export function fromRoot(...segments: string[]): string {
  return join(PROJECT_ROOT, ...segments);
}

/**
 * Carga un archivo JSON
 */
export function loadJson<T = unknown>(path: string): T | null {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Obtiene el workspace de un path
 */
export function getWorkspaceFromPath(filePath: string): (typeof workspaces)[number] | null {
  const absolutePath = resolve(filePath);
  return workspaces.find((ws) => absolutePath.startsWith(ws.path)) ?? null;
}
