import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import * as TOML from '@iarna/toml';

const { pathExists, readFile, writeFile, ensureDir } = fs;

export async function readJsonFile<T = any>(filePath: string, fallback: T): Promise<T> {
  if (!(await pathExists(filePath))) {
    return fallback;
  }

  const content = await readFile(filePath, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${(error as Error).message}`);
  }
}

export async function readTomlFile<T = any>(filePath: string, fallback: T): Promise<T> {
  if (!(await pathExists(filePath))) {
    return fallback;
  }

  const content = await readFile(filePath, 'utf-8');
  try {
    return TOML.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse TOML at ${filePath}: ${(error as Error).message}`);
  }
}

export async function writeFileAtomic(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tempName = `.__mcp-pack-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.tmp`;
  const tempPath = path.join(dir, tempName);

  await writeFile(tempPath, contents, 'utf-8');
  await fs.rename(tempPath, filePath);
}

export async function removeFileIfExists(filePath: string): Promise<void> {
  if (await pathExists(filePath)) {
    await fs.unlink(filePath);
  }
}

export async function listBackups(basePath: string): Promise<string[]> {
  const dir = path.dirname(basePath);
  if (!(await pathExists(dir))) {
    return [];
  }

  const basename = path.basename(basePath);
  const files = await fs.readdir(dir);
  return files
    .filter((name) => name.startsWith(`${basename}.bak-`))
    .map((name) => path.join(dir, name))
    .sort()
    .reverse();
}

export function toJsonString(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function toTomlString(value: any): string {
  return TOML.stringify(value as TOML.JsonMap);
}
