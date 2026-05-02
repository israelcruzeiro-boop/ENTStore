import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(repoRoot, '..', 'StorePage_back');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!existsSync(backendRoot)) {
  console.error(`Backend StorePage_back not found at: ${backendRoot}`);
  console.error('Clone or place StorePage_back next to StorePage, then run npm run dev:all again.');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

const start = (name, cwd, args) => {
  const child = spawn(npmCommand, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env },
  });

  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error(`${name} stopped${signal ? ` by ${signal}` : ` with code ${code ?? 0}`}.`);
    stopChildren();
    process.exit(code ?? 1);
  });

  return child;
};

const stopChildren = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
};

process.on('SIGINT', () => {
  shuttingDown = true;
  stopChildren();
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  stopChildren();
});

start('backend', backendRoot, ['run', 'dev']);
start('frontend', repoRoot, ['run', 'dev:frontend']);
