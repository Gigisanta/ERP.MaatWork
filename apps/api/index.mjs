// Entry point for running the API during development
// Uses tsx to handle TypeScript imports
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsx = spawn('npx', ['tsx', join(__dirname, 'src/index.ts')], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

tsx.on('exit', (code) => {
  process.exit(code);
});

