import { ClientId, WriteConfigOptions, WriteConfigResult, RollbackResult } from '../types.js';

export interface ClientAdapter {
  name: ClientId;
  displayName: string;
  detect(workspaceRoot: string): Promise<boolean>;
  getConfigPath(workspaceRoot: string, scope?: 'global' | 'project'): string | null;
  writeConfig(options: WriteConfigOptions): Promise<WriteConfigResult>;
  rollback(workspaceRoot: string, scope?: 'global' | 'project'): Promise<RollbackResult>;
}
