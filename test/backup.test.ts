import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createBackup, findLatestBackup, restoreBackup } from '../src/safety/backup';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-pack-test-'));
});

afterEach(async () => {
  await fs.remove(tempDir);
});

describe('backup helpers', () => {
  it('creates and restores backups', async () => {
    const filePath = path.join(tempDir, 'config.json');
    await fs.writeFile(filePath, JSON.stringify({ value: 1 }));

    const backupPath = await createBackup(filePath);
    expect(backupPath).toBeTruthy();
    expect(await fs.pathExists(backupPath!)).toBe(true);

    await fs.writeFile(filePath, JSON.stringify({ value: 2 }));

    const latest = await findLatestBackup(filePath);
    expect(latest).toBe(backupPath);

    await restoreBackup(filePath, backupPath!);
    const restored = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    expect(restored.value).toBe(1);
  });
});
