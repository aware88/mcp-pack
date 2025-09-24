import fs from 'fs-extra';
import path from 'path';
import { homedir } from 'os';

import { ClientAdapter } from './types.js';
import { warpSnippetPath } from '../utils/paths.js';
import { createBackup, findLatestBackup, restoreBackup } from '../safety/backup.js';
import { renderDiff } from '../safety/diff.js';
import { toJsonString, writeFileAtomic, removeFileIfExists } from '../utils/fsx.js';
import { WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';

const { pathExists, readFile, ensureDir } = fs;

function warpInstallCandidates(): string[] {
  return [
    path.join(homedir(), '.warp'),
    path.join(homedir(), 'Library', 'Application Support', 'dev.warp.Warp'),
    path.join(homedir(), 'Library', 'Application Support', 'dev.warp.Warp-Stable'),
    path.join(homedir(), 'AppData', 'Roaming', 'Warp'),
  ];
}

export class WarpAdapter implements ClientAdapter {
  name = 'warp' as const;
  displayName = 'Warp';

  getConfigPath(workspaceRoot: string): string {
    return warpSnippetPath(workspaceRoot);
  }

  async detect(): Promise<boolean> {
    for (const candidate of warpInstallCandidates()) {
      if (await pathExists(candidate)) {
        return true;
      }
    }
    return false;
  }

  async writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult> {
    const outputPath = this.getConfigPath(options.workspaceRoot);
    const snippet = this.buildWarpSnippet(options);
    const afterRaw = toJsonString(snippet);

    const exists = await pathExists(outputPath);
    const beforeRaw = exists ? await readFile(outputPath, 'utf-8') : '';
    const diff = renderDiff(beforeRaw || '<empty>', afterRaw);

    if (beforeRaw.trim() === afterRaw.trim()) {
      return { path: outputPath, diff, wrote: false };
    }

    if (options.dryRun) {
      return { path: outputPath, diff, wrote: false };
    }

    await ensureDir(path.dirname(outputPath));
    const backupPath = await createBackup(outputPath);
    await writeFileAtomic(outputPath, afterRaw);

    return { path: outputPath, diff, backupPath, wrote: true };
  }

  async rollback(workspaceRoot: string): Promise<RollbackResult> {
    const outputPath = this.getConfigPath(workspaceRoot);
    const backup = await findLatestBackup(outputPath);
    if (backup) {
      await restoreBackup(outputPath, backup);
      return { path: outputPath, restoredFrom: backup };
    }

    await removeFileIfExists(outputPath);
    return { path: outputPath };
  }

  private buildWarpSnippet(options: WriteConfigOptions): Record<string, unknown> {
    const generatedAt = new Date().toISOString();
    const servers = Object.entries(options.servers).map(([name, config]) => ({
      name,
      command: config.command,
      args: config.args ?? [],
      env: config.env ?? {},
    }));

    return {
      version: 1,
      generatedAt,
      generatedBy: 'mcp-pack',
      description: 'Import into Warp Drive (Settings -> Warp Drive -> Import JSON) to register MCP servers.',
      servers,
    };
  }
}
