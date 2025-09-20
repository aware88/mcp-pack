import fs from 'fs-extra';
import path from 'path';
import { ClientAdapter } from './types.js';
import { vscodeWorkspaceConfigPath } from '../utils/paths.js';
import { mergeMcpServers } from '../safety/merge.js';
import { createBackup, findLatestBackup, restoreBackup } from '../safety/backup.js';
import { renderDiff } from '../safety/diff.js';
import { toJsonString, writeFileAtomic } from '../utils/fsx.js';
import { WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';

const { pathExists, readFile, ensureDir } = fs;

export class VSCodeAdapter implements ClientAdapter {
  name = 'vscode' as const;
  displayName = 'VS Code (workspace)';

  getConfigPath(workspaceRoot: string): string {
    return vscodeWorkspaceConfigPath(workspaceRoot);
  }

  async detect(workspaceRoot: string): Promise<boolean> {
    const configPath = this.getConfigPath(workspaceRoot);
    return pathExists(path.dirname(configPath));
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    const configPath = this.getConfigPath(options.workspaceRoot);
    await ensureDir(path.dirname(configPath));

    const exists = await pathExists(configPath);
    const beforeRaw = exists ? await readFile(configPath, 'utf-8') : toJsonString({});
    const beforeParsed = exists && beforeRaw.trim() ? JSON.parse(beforeRaw) : {};

    const merged = mergeMcpServers(beforeParsed, options.servers);
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

  async rollback(workspaceRoot: string): Promise<RollbackResult> {
    const configPath = this.getConfigPath(workspaceRoot);
    const backup = await findLatestBackup(configPath);
    if (!backup) {
      throw new Error('No VS Code config backups found');
    }
    await restoreBackup(configPath, backup);
    return { path: configPath, restoredFrom: backup };
  }
}
