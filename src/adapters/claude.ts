import fs from 'fs-extra';
import path from 'path';
import { ClientAdapter } from './types.js';
import { claudeConfigPath } from '../utils/paths.js';
import { mergeMcpServers } from '../safety/merge.js';
import { createBackup, findLatestBackup, restoreBackup } from '../safety/backup.js';
import { renderDiff } from '../safety/diff.js';
import { toJsonString, writeFileAtomic } from '../utils/fsx.js';
import { WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';

const { pathExists, readFile, ensureDir } = fs;

export class ClaudeAdapter implements ClientAdapter {
  name = 'claude' as const;
  displayName = 'Claude Desktop';

  getConfigPath(): string | null {
    return claudeConfigPath();
  }

  async detect(): Promise<boolean> {
    const target = this.getConfigPath();
    if (!target) return false;
    return pathExists(target);
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    const configPath = this.getConfigPath();
    if (!configPath) {
      throw new Error('Claude Desktop config path not available on this platform');
    }

    await ensureDir(path.dirname(configPath));

    const exists = await pathExists(configPath);
    const beforeRaw = exists ? await readFile(configPath, 'utf-8') : toJsonString({});
    const beforeParsed = exists ? JSON.parse(beforeRaw) : {};
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
    if (!configPath) {
      throw new Error('Claude Desktop config path not available on this platform');
    }

    const backup = await findLatestBackup(configPath);
    if (!backup) {
      throw new Error('No Claude Desktop backups found');
    }

    await restoreBackup(configPath, backup);
    return { path: configPath, restoredFrom: backup };
  }
}
