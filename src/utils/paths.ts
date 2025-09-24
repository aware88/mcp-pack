import path from 'path';
import { homedir } from 'os';
import { isMac, isWindows } from './platform.js';

export function claudeConfigPath(): string | null {
  if (isMac) {
    return path.join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  if (isWindows) {
    const appData = process.env.APPDATA;
    if (!appData) return null;
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }
  return null;
}

export function vscodeWorkspaceConfigPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.vscode', 'mcp.json');
}

export function cursorGlobalConfigPath(): string {
  return path.join(homedir(), '.cursor', 'mcp.json');
}

export function cursorProjectConfigPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.cursor', 'mcp.json');
}

export function windsurfConfigPath(): string {
  return path.join(homedir(), '.codeium', 'windsurf', 'mcp_config.json');
}

export function warpSnippetPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.mcp-pack', 'warp', 'warp-drive-export.json');
}

export function codexConfigPath(): string {
  return path.join(homedir(), '.codex', 'config.toml');
}

export function selectionsDir(): string {
  return path.join(homedir(), '.mcp-pack', 'selections');
}

export function selectionFile(profile: string): string {
  return path.join(selectionsDir(), `${profile}.json`);
}
