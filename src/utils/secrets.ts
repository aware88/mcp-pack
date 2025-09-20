import fs from 'fs-extra';
import path from 'path';

export async function loadSecretsFile(secretsPath: string): Promise<Record<string, string>> {
  const resolved = path.isAbsolute(secretsPath) ? secretsPath : path.resolve(process.cwd(), secretsPath);
  const exists = await fs.pathExists(resolved);
  if (!exists) {
    throw new Error(`Secrets file not found at ${resolved}`);
  }

  const content = await fs.readFile(resolved, 'utf-8');
  if (secretsPath.endsWith('.json')) {
    const data = JSON.parse(content) as Record<string, unknown>;
    const entries = Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
    return Object.fromEntries(entries);
  }

  const lines = content.split(/\r?\n/);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key) {
      result[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

export async function hydrateProcessEnvFromFile(secretsPath: string): Promise<Record<string, string>> {
  const secrets = await loadSecretsFile(secretsPath);
  for (const [key, value] of Object.entries(secrets)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return secrets;
}
