/**
 * Git - Utilidades para operaciones con Git
 *
 * Proporciona funciones helper para operaciones comunes de git.
 *
 * @example
 * import { git, getCurrentBranch, hasUncommittedChanges } from './lib/git';
 *
 * const branch = getCurrentBranch();
 * const isDirty = hasUncommittedChanges();
 */

import { exec, execAsync, type ExecResult } from './exec';
import { paths } from './config';

/**
 * Ejecuta un comando git
 */
export function git(command: string, options: { silent?: boolean; cwd?: string } = {}): ExecResult {
  return exec(`git ${command}`, {
    cwd: options.cwd ?? paths.root,
    silent: options.silent,
    stdio: 'pipe',
  });
}

/**
 * Ejecuta un comando git de forma asíncrona
 */
export async function gitAsync(
  command: string,
  options: { silent?: boolean; cwd?: string } = {}
): Promise<ExecResult> {
  return execAsync(`git ${command}`, {
    cwd: options.cwd ?? paths.root,
    silent: options.silent,
  });
}

/**
 * Obtiene la rama actual
 */
export function getCurrentBranch(): string | null {
  const result = git('rev-parse --abbrev-ref HEAD', { silent: true });
  return result.success ? result.stdout : null;
}

/**
 * Verifica si hay cambios sin commitear
 */
export function hasUncommittedChanges(): boolean {
  const result = git('status --porcelain', { silent: true });
  return result.success && result.stdout.length > 0;
}

/**
 * Verifica si hay cambios staged
 */
export function hasStagedChanges(): boolean {
  const result = git('diff --cached --name-only', { silent: true });
  return result.success && result.stdout.length > 0;
}

/**
 * Obtiene el hash del último commit
 */
export function getLastCommitHash(short = true): string | null {
  const flag = short ? '--short' : '';
  const result = git(`rev-parse ${flag} HEAD`, { silent: true });
  return result.success ? result.stdout : null;
}

/**
 * Obtiene el mensaje del último commit
 */
export function getLastCommitMessage(): string | null {
  const result = git('log -1 --pretty=%B', { silent: true });
  return result.success ? result.stdout.trim() : null;
}

/**
 * Obtiene la lista de archivos modificados desde un commit
 */
export function getChangedFiles(since = 'HEAD~1'): string[] {
  const result = git(`diff --name-only ${since}`, { silent: true });
  if (!result.success) return [];
  return result.stdout.split('\n').filter(Boolean);
}

/**
 * Obtiene la lista de archivos staged
 */
export function getStagedFiles(): string[] {
  const result = git('diff --cached --name-only', { silent: true });
  if (!result.success) return [];
  return result.stdout.split('\n').filter(Boolean);
}

/**
 * Obtiene la lista de archivos sin trackear
 */
export function getUntrackedFiles(): string[] {
  const result = git('ls-files --others --exclude-standard', { silent: true });
  if (!result.success) return [];
  return result.stdout.split('\n').filter(Boolean);
}

/**
 * Verifica si estamos en un repositorio git
 */
export function isGitRepo(): boolean {
  const result = git('rev-parse --is-inside-work-tree', { silent: true });
  return result.success && result.stdout === 'true';
}

/**
 * Verifica si la rama existe (local o remota)
 */
export function branchExists(branch: string, remote = false): boolean {
  const ref = remote ? `refs/remotes/origin/${branch}` : `refs/heads/${branch}`;
  const result = git(`show-ref --verify --quiet ${ref}`, { silent: true });
  return result.success;
}

/**
 * Obtiene la URL del remote origin
 */
export function getRemoteUrl(): string | null {
  const result = git('config --get remote.origin.url', { silent: true });
  return result.success ? result.stdout : null;
}

/**
 * Obtiene el nombre del repositorio desde la URL del remote
 */
export function getRepoName(): string | null {
  const url = getRemoteUrl();
  if (!url) return null;

  // Soporta tanto SSH como HTTPS
  const match = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

/**
 * Obtiene todos los tags
 */
export function getTags(): string[] {
  const result = git('tag --list', { silent: true });
  if (!result.success) return [];
  return result.stdout.split('\n').filter(Boolean);
}

/**
 * Obtiene el último tag
 */
export function getLatestTag(): string | null {
  const result = git('describe --tags --abbrev=0', { silent: true });
  return result.success ? result.stdout : null;
}

/**
 * Crea un nuevo tag
 */
export function createTag(tag: string, message?: string): boolean {
  const cmd = message ? `tag -a ${tag} -m "${message}"` : `tag ${tag}`;
  const result = git(cmd);
  return result.success;
}

/**
 * Stage archivos
 */
export function stageFiles(files: string | string[]): boolean {
  const fileList = Array.isArray(files) ? files.join(' ') : files;
  const result = git(`add ${fileList}`);
  return result.success;
}

/**
 * Commit con mensaje
 */
export function commit(message: string): boolean {
  const result = git(`commit -m "${message.replace(/"/g, '\\"')}"`);
  return result.success;
}

/**
 * Push al remote
 */
export async function push(remote = 'origin', branch?: string): Promise<boolean> {
  const branchArg = branch ?? (getCurrentBranch() || 'main');
  const result = await gitAsync(`push ${remote} ${branchArg}`);
  return result.success;
}

/**
 * Fetch desde remote
 */
export async function fetch(remote = 'origin', prune = true): Promise<boolean> {
  const pruneFlag = prune ? '--prune' : '';
  const result = await gitAsync(`fetch ${remote} ${pruneFlag}`);
  return result.success;
}

/**
 * Verifica si hay commits pendientes de push
 */
export function hasUnpushedCommits(): boolean {
  const result = git('log @{u}..HEAD --oneline', { silent: true });
  return result.success && result.stdout.length > 0;
}

/**
 * Información del repositorio
 */
export interface RepoInfo {
  isRepo: boolean;
  branch: string | null;
  lastCommit: string | null;
  lastTag: string | null;
  remoteUrl: string | null;
  isDirty: boolean;
  hasUnpushed: boolean;
}

export function getRepoInfo(): RepoInfo {
  return {
    isRepo: isGitRepo(),
    branch: getCurrentBranch(),
    lastCommit: getLastCommitHash(),
    lastTag: getLatestTag(),
    remoteUrl: getRemoteUrl(),
    isDirty: hasUncommittedChanges(),
    hasUnpushed: hasUnpushedCommits(),
  };
}
