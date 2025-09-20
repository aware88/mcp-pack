import fs from 'fs-extra';
import path from 'path';
import { ClientAdapter } from './types.js';
import { codexConfigPath } from '../utils/paths.js';
import { mergeMcpServers } from '../safety/merge.js';
import { createBackup, findLatestBackup, restoreBackup } from '../safety/backup.js';
import { renderDiff } from '../safety/diff.js';
import { toTomlString, writeFileAtomic } from '../utils/fsx.js';
import { WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';
import * as TOML from '@iarna/toml';

const { pathExists, readFile, ensureDir } = fs;

export class CodexAdapter implements ClientAdapter {
  name = 'codex' as const;
  displayName = 'OpenAI Codex CLI';

  getConfigPath(): string {
    return codexConfigPath();
  }

  async detect(): Promise<boolean> {
    const configPath = this.getConfigPath();
    return pathExists(path.dirname(configPath));
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    const configPath = this.getConfigPath();
    await ensureDir(path.dirname(configPath));

    const exists = await pathExists(configPath);
    const beforeRaw = exists ? await readFile(configPath, 'utf-8') : '';
    const beforeParsed = exists && beforeRaw.trim() ? (TOML.parse(beforeRaw) as Record<string, any>) : {};
    const currentServers = (beforeParsed.mcp_servers as Record<string, any>) ?? {};

    const mergedServers = mergeMcpServers(currentServers, options.servers);
    const afterParsed = { ...beforeParsed, mcp_servers: mergedServers };
    const afterRaw = toTomlString(afterParsed);

    if (beforeRaw.trim() === afterRaw.trim()) {
      return { path: configPath, wrote: false };
    }

    const diff = renderDiff(beforeRaw || '\n', afterRaw);

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
      throw new Error('No Codex backups found');
    }
    await restoreBackup(configPath, backup);
    return { path: configPath, restoredFrom: backup };
  }
}
