import fs from 'fs-extra';
import path from 'path';
import { listBackups } from '../utils/fsx.js';

const { pathExists, ensureDir, copyFile } = fs;

export function backupSuffix(): string {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export async function createBackup(filePath: string): Promise<string | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  await ensureDir(dir);

  const backupPath = path.join(dir, `${basename}.bak-${backupSuffix()}`);
  await copyFile(filePath, backupPath);
  return backupPath;
}

export async function restoreBackup(filePath: string, backupPath: string): Promise<void> {
  if (!(await pathExists(backupPath))) {
    throw new Error(`Backup not found: ${backupPath}`);
  }
  await ensureDir(path.dirname(filePath));
  await copyFile(backupPath, filePath);
}

export async function findLatestBackup(filePath: string): Promise<string | null> {
  const backups = await listBackups(filePath);
  return backups.length > 0 ? backups[0] : null;
}
