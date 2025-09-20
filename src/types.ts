export type ClientId = 'claude' | 'vscode' | 'cursor' | 'windsurf' | 'codex';

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface WriteConfigOptions {
  servers: Record<string, McpServerConfig>;
  dryRun?: boolean;
  assumeYes?: boolean;
  workspaceRoot: string;
  scope?: 'global' | 'project';
}

export interface WriteConfigResult {
  path: string;
  diff?: string;
  backupPath?: string | null;
  wrote: boolean;
}

export interface RollbackResult {
  path: string;
  restoredFrom?: string;
}
