/**
 * Scripts Library - Utilidades compartidas para scripts del monorepo
 *
 * Esta librería proporciona herramientas estandarizadas para:
 * - Logging con colores y formato consistente
 * - Ejecución de comandos con retry y timeout
 * - Configuración y paths del proyecto
 * - Prompts interactivos
 * - Operaciones de git
 * - Operaciones de filesystem
 * - Spinners y barras de progreso
 *
 * @example
 * import { logger, exec, paths, confirm, git, spinner } from './lib';
 *
 * logger.info('Starting...');
 * const result = exec('pnpm build');
 * const branch = git.getCurrentBranch();
 */

// Logger
export { logger, createLogger, colors, type LogLevel } from './logger';

// Exec
export {
  exec,
  execAsync,
  execWithRetry,
  execParallel,
  execSeries,
  spawnBackground,
  spawnStream,
  commandExists,
  sleep,
  type ExecOptions,
  type ExecResult,
  type RetryOptions,
} from './exec';

// Config
export {
  PROJECT_ROOT,
  paths,
  configFiles,
  config,
  workspaces,
  getPackageInfo,
  pathExists,
  fromRoot,
  loadJson,
  getWorkspaceFromPath,
  type PackageInfo,
} from './config';

// Prompts
export { input, confirm, select, multiSelect, password, pause, wait } from './prompts';

// Git
export {
  git,
  gitAsync,
  getCurrentBranch,
  hasUncommittedChanges,
  hasStagedChanges,
  getLastCommitHash,
  getLastCommitMessage,
  getChangedFiles,
  getStagedFiles,
  getUntrackedFiles,
  isGitRepo,
  branchExists,
  getRemoteUrl,
  getRepoName,
  getTags,
  getLatestTag,
  createTag,
  stageFiles,
  commit,
  push,
  fetch,
  hasUnpushedCommits,
  getRepoInfo,
  type RepoInfo,
} from './git';

// Filesystem
export {
  readJson,
  writeJson,
  readText,
  writeText,
  exists,
  isDirectory,
  isFile,
  ensureDir,
  remove,
  copyFile,
  moveFile,
  listDir,
  findFiles,
  getFileInfo,
  getDirSize,
  formatSize,
  createFromTemplate,
  type FileInfo,
} from './fs';

// Spinner
export {
  spinner,
  withSpinner,
  progressBar,
  countdown,
  timed,
  type Spinner,
  type ProgressBar,
} from './spinner';

