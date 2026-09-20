import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export async function fileHash(file, algorithm = 'sha256') {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export const sha256 = file => fileHash(file);

/** @returns {Promise<void>} */
export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
      shell: false
    });
    child.on('error', reject);
    child.on('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${command} exited with code ${code}`)));
  });
}

const execFileAsync = promisify(execFile);

/** Run a command and return trimmed stdout while preserving the caller's env. */
export async function runOutput(command, args, options = {}) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    windowsHide: true
  });
  return stdout.trim();
}

export function requireFile(file, hint = '') {
  if (!existsSync(file)) throw new Error(`Missing ${file}${hint ? ` (${hint})` : ''}`);
  return file;
}
