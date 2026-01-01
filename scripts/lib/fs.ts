/**
 * FS - Utilidades de filesystem
 *
 * Proporciona funciones helper para operaciones comunes de archivos y directorios.
 *
 * @example
 * import { readJson, writeJson, ensureDir, findFiles } from './lib/fs';
 *
 * const pkg = readJson('package.json');
 * await ensureDir('dist');
 * const tsFiles = findFiles('src', '*.ts');
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  copyFileSync,
  renameSync,
} from 'fs';
import { join, dirname, basename, extname, relative, resolve } from 'path';
import { paths } from './config';

/**
 * Lee un archivo JSON
 */
export function readJson<T = unknown>(path: string): T | null {
  try {
    const absolutePath = resolve(paths.root, path);
    const content = readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Escribe un archivo JSON
 */
export function writeJson(path: string, data: unknown, indent = 2): boolean {
  try {
    const absolutePath = resolve(paths.root, path);
    ensureDir(dirname(absolutePath));
    writeFileSync(absolutePath, JSON.stringify(data, null, indent) + '\n', 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Lee un archivo de texto
 */
export function readText(path: string): string | null {
  try {
    const absolutePath = resolve(paths.root, path);
    return readFileSync(absolutePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Escribe un archivo de texto
 */
export function writeText(path: string, content: string): boolean {
  try {
    const absolutePath = resolve(paths.root, path);
    ensureDir(dirname(absolutePath));
    writeFileSync(absolutePath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si un path existe
 */
export function exists(path: string): boolean {
  const absolutePath = resolve(paths.root, path);
  return existsSync(absolutePath);
}

/**
 * Verifica si es un directorio
 */
export function isDirectory(path: string): boolean {
  try {
    const absolutePath = resolve(paths.root, path);
    return statSync(absolutePath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Verifica si es un archivo
 */
export function isFile(path: string): boolean {
  try {
    const absolutePath = resolve(paths.root, path);
    return statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Asegura que un directorio existe (lo crea si no)
 */
export function ensureDir(path: string): boolean {
  try {
    const absolutePath = resolve(paths.root, path);
    if (!existsSync(absolutePath)) {
      mkdirSync(absolutePath, { recursive: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Elimina un archivo o directorio
 */
export function remove(path: string, recursive = true): boolean {
  try {
    const absolutePath = resolve(paths.root, path);
    if (existsSync(absolutePath)) {
      rmSync(absolutePath, { recursive, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Copia un archivo
 */
export function copyFile(src: string, dest: string): boolean {
  try {
    const absoluteSrc = resolve(paths.root, src);
    const absoluteDest = resolve(paths.root, dest);
    ensureDir(dirname(absoluteDest));
    copyFileSync(absoluteSrc, absoluteDest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mueve/renombra un archivo
 */
export function moveFile(src: string, dest: string): boolean {
  try {
    const absoluteSrc = resolve(paths.root, src);
    const absoluteDest = resolve(paths.root, dest);
    ensureDir(dirname(absoluteDest));
    renameSync(absoluteSrc, absoluteDest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lista archivos en un directorio
 */
export function listDir(path: string, options: { recursive?: boolean; filesOnly?: boolean } = {}): string[] {
  const { recursive = false, filesOnly = false } = options;
  const absolutePath = resolve(paths.root, path);

  if (!existsSync(absolutePath) || !isDirectory(path)) {
    return [];
  }

  const results: string[] = [];

  function walkDir(currentPath: string): void {
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(absolutePath, fullPath);

      if (entry.isDirectory()) {
        if (!filesOnly) {
          results.push(relativePath);
        }
        if (recursive) {
          walkDir(fullPath);
        }
      } else {
        results.push(relativePath);
      }
    }
  }

  walkDir(absolutePath);
  return results;
}

/**
 * Busca archivos que coincidan con un patrón
 */
export function findFiles(
  dir: string,
  pattern: string | RegExp,
  options: { recursive?: boolean; ignore?: string[] } = {}
): string[] {
  const { recursive = true, ignore = ['node_modules', 'dist', '.next', '.turbo', 'coverage'] } = options;

  const files = listDir(dir, { recursive, filesOnly: true });
  const regex = typeof pattern === 'string' ? new RegExp(pattern.replace(/\*/g, '.*')) : pattern;

  return files.filter((file) => {
    // Verificar si está en una ruta ignorada
    const shouldIgnore = ignore.some((ignorePath) => file.includes(ignorePath));
    if (shouldIgnore) return false;

    return regex.test(basename(file));
  });
}

/**
 * Obtiene información de un archivo
 */
export interface FileInfo {
  name: string;
  path: string;
  ext: string;
  size: number;
  isDirectory: boolean;
  modifiedAt: Date;
  createdAt: Date;
}

export function getFileInfo(path: string): FileInfo | null {
  try {
    const absolutePath = resolve(paths.root, path);
    const stats = statSync(absolutePath);

    return {
      name: basename(absolutePath),
      path: absolutePath,
      ext: extname(absolutePath),
      size: stats.size,
      isDirectory: stats.isDirectory(),
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  } catch {
    return null;
  }
}

/**
 * Calcula el tamaño de un directorio
 */
export function getDirSize(path: string): number {
  const absolutePath = resolve(paths.root, path);

  if (!existsSync(absolutePath)) {
    return 0;
  }

  let totalSize = 0;

  function walkDir(currentPath: string): void {
    const entries = readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else {
        totalSize += statSync(fullPath).size;
      }
    }
  }

  walkDir(absolutePath);
  return totalSize;
}

/**
 * Formatea un tamaño en bytes a formato legible
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Crea un archivo desde un template
 */
export function createFromTemplate(
  templatePath: string,
  destPath: string,
  replacements: Record<string, string>
): boolean {
  const template = readText(templatePath);
  if (!template) return false;

  let content = template;
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return writeText(destPath, content);
}

