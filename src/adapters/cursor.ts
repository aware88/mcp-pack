import fs from 'fs-extra';
import path from 'path';
import { ClientAdapter } from './types.js';
import { cursorGlobalConfigPath, cursorProjectConfigPath } from '../utils/paths.js';
import { mergeMcpServers } from '../safety/merge.js';
import { createBackup, findLatestBackup, restoreBackup } from '../safety/backup.js';
import { renderDiff } from '../safety/diff.js';
import { toJsonString, writeFileAtomic } from '../utils/fsx.js';
import { WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';

const { pathExists, readFile, ensureDir } = fs;

export class CursorAdapter implements ClientAdapter {
  name = 'cursor' as const;
  displayName = 'Cursor';

  getConfigPath(workspaceRoot: string, scope: 'global' | 'project' = 'global'): string {
    return scope === 'project' ? cursorProjectConfigPath(workspaceRoot) : cursorGlobalConfigPath();
  }

  async detect(workspaceRoot: string): Promise<boolean> {
    const globalPath = this.getConfigPath(workspaceRoot, 'global');
    const projectPath = this.getConfigPath(workspaceRoot, 'project');
    return (await pathExists(path.dirname(globalPath))) || (await pathExists(path.dirname(projectPath)));
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    const scope = options.scope ?? 'global';
    const configPath = this.getConfigPath(options.workspaceRoot, scope);

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

  async rollback(workspaceRoot: string, scope: 'global' | 'project' = 'global'): Promise<RollbackResult> {
    const configPath = this.getConfigPath(workspaceRoot, scope);
    const backup = await findLatestBackup(configPath);
    if (!backup) {
      throw new Error('No Cursor backups found');
    }
    await restoreBackup(configPath, backup);
    return { path: configPath, restoredFrom: backup };
  }
}
