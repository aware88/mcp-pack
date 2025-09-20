import fs from 'fs-extra';
import path from 'path';
import { ClientAdapter } from './types.js';
import { windsurfConfigPath } from '../utils/paths.js';
import { mergeMcpServers } from '../safety/merge.js';
import { createBackup, findLatestBackup, restoreBackup } from '../safety/backup.js';
import { renderDiff } from '../safety/diff.js';
import { toJsonString, writeFileAtomic } from '../utils/fsx.js';
import { WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';

const { pathExists, readFile, ensureDir } = fs;

export class WindsurfAdapter implements ClientAdapter {
  name = 'windsurf' as const;
  displayName = 'Windsurf';

  getConfigPath(): string {
    return windsurfConfigPath();
  }

  async detect(): Promise<boolean> {
    const configPath = this.getConfigPath();
    return pathExists(path.dirname(configPath));
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    const configPath = this.getConfigPath();
    await ensureDir(path.dirname(configPath));

    const exists = await pathExists(configPath);
    const beforeRaw = exists ? await readFile(configPath, 'utf-8') : toJsonString({});
    const beforeParsed = exists && beforeRaw.trim() ? JSON.parse(beforeRaw) : {};
    const currentServers = beforeParsed.mcpServers ?? {};

    const merged = {
      ...beforeParsed,
      mcpServers: mergeMcpServers(currentServers, options.servers),
    };

    const afterRaw = toJsonString(merged);

    if (beforeRaw.trim() === afterRaw.trim()) {
      return { path: configPath, wrote: false };
    }

    const diff = renderDiff(beforeRaw, afterRaw);

    if (options.dryRun) {
      return { path: configPath, diff, wrote: false };
    }

    const backupPath = await createBackup(configPath);
    await writeFileAtomic(configPath, afterRaw);

    return { path: configPath, diff, backupPath, wrote: true };
  }

  async rollback(): Promise<RollbackResult> {
    const configPath = this.getConfigPath();
    const backup = await findLatestBackup(configPath);
    if (!backup) {
      throw new Error('No Windsurf backups found');
    }
    await restoreBackup(configPath, backup);
    return { path: configPath, restoredFrom: backup };
  }
}
