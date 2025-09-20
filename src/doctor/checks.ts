import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import chalk from 'chalk';
import * as TOML from '@iarna/toml';

type TomlSerializable = Parameters<typeof TOML.stringify>[0];

export type CheckStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheckResult {
  name: string;
  status: CheckStatus;
  message: string;
  fixApplied?: boolean;
  fixAvailable?: boolean;
}

export async function checkNodeVersion(minMajor = 18): Promise<DoctorCheckResult> {
  try {
    const { stdout } = await execa('node', ['--version']);
    const version = stdout.replace(/^v/, '');
    const major = Number(version.split('.')[0]);

    if (major >= minMajor) {
      return { name: 'Node.js', status: 'ok', message: `Node.js ${version}` };
    }

    return {
      name: 'Node.js',
      status: 'fail',
      message: `Node.js ${version} detected. Install >= ${minMajor}.`,
    };
  } catch {
    return { name: 'Node.js', status: 'fail', message: 'Node.js not found on PATH' };
  }
}

export async function checkCommand(command: string, label: string): Promise<DoctorCheckResult> {
  try {
    await execa(command, ['--version']);
    return { name: label, status: 'ok', message: `${command} available` };
  } catch {
    return { name: label, status: 'warn', message: `${command} not found`, fixAvailable: false };
  }
}

export async function ensureJsonFile(
  filePath: string,
  createSkeleton: () => Record<string, unknown>,
  applyFix: boolean,
): Promise<DoctorCheckResult> {
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    if (applyFix) {
      const skeleton = createSkeleton();
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, JSON.stringify(skeleton, null, 2) + '\n');
      return { name: filePath, status: 'ok', message: 'Created missing config', fixApplied: true };
    }

    return { name: filePath, status: 'warn', message: 'Missing config file', fixAvailable: true };
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    JSON.parse(content);
    return { name: filePath, status: 'ok', message: 'Valid JSON' };
  } catch (error) {
    return { name: filePath, status: 'fail', message: `Invalid JSON (${(error as Error).message})` };
  }
}

export async function ensureTomlFile(
  filePath: string,
  createSkeleton: () => Record<string, unknown>,
  applyFix: boolean,
): Promise<DoctorCheckResult> {
  const exists = await fs.pathExists(filePath);

  if (!exists) {
    if (applyFix) {
      const skeleton = createSkeleton() as TomlSerializable;
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, TOML.stringify(skeleton) + '\n');
      return { name: filePath, status: 'ok', message: 'Created missing config', fixApplied: true };
    }

    return { name: filePath, status: 'warn', message: 'Missing config file', fixAvailable: true };
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    TOML.parse(content);
    return { name: filePath, status: 'ok', message: 'Valid TOML' };
  } catch (error) {
    return { name: filePath, status: 'fail', message: `Invalid TOML (${(error as Error).message})` };
  }
}

export function summarise(results: DoctorCheckResult[]): string {
  const ok = results.filter((r) => r.status === 'ok').length;
  const warn = results.filter((r) => r.status === 'warn').length;
  const fail = results.filter((r) => r.status === 'fail').length;

  return [
    chalk.green(`OK ${ok}`),
    chalk.yellow(`Warn ${warn}`),
    chalk.red(`Fail ${fail}`),
  ].join(chalk.gray(' | '));
}
