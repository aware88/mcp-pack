import fs from 'fs-extra';
import { selectionFile, selectionsDir } from './paths.js';

const { ensureDir, pathExists, readFile, writeFile } = fs;

export async function readSelections(profile: string): Promise<string[]> {
  const filePath = selectionFile(profile);
  if (!(await pathExists(filePath))) {
    return [];
  }

  const content = await readFile(filePath, 'utf-8');
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed as string[];
    }
    if (Array.isArray((parsed as any).servers)) {
      return (parsed as any).servers as string[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function writeSelections(profile: string, servers: string[]): Promise<void> {
  const dir = selectionsDir();
  await ensureDir(dir);
  const filePath = selectionFile(profile);
  await writeFile(filePath, JSON.stringify(servers, null, 2) + '\n', 'utf-8');
}

export async function listProfiles(): Promise<string[]> {
  const dir = selectionsDir();
  if (!(await pathExists(dir))) {
    return [];
  }

  const files = await fs.readdir(dir);
  return files
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''));
}

export async function copyProfile(source: string, target: string): Promise<void> {
  const selections = await readSelections(source);
  await writeSelections(target, selections);
}
