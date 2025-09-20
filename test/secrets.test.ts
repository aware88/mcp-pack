import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadSecretsFile, hydrateProcessEnvFromFile } from '../src/utils/secrets.js';

describe('secrets loader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-pack-secrets-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('parses .env format', async () => {
    const file = path.join(tempDir, '.env');
    await fs.writeFile(file, 'API_KEY=123\n# comment\nTOKEN="abc"\n');

    const secrets = await loadSecretsFile(file);
    expect(secrets).toEqual({ API_KEY: '123', TOKEN: 'abc' });
  });

  it('parses JSON format', async () => {
    const file = path.join(tempDir, 'secrets.json');
    await fs.writeJson(file, { API_KEY: '123', nested: { skip: true }, NUMBER: 7 });

    const secrets = await loadSecretsFile(file);
    expect(secrets).toEqual({ API_KEY: '123' });
  });

  it('hydrates process.env without overwriting existing keys', async () => {
    const file = path.join(tempDir, '.env');
    await fs.writeFile(file, 'EXISTING=should-stay\nNEW_KEY=value\n');
    const originalExisting = process.env.EXISTING;
    const originalNew = process.env.NEW_KEY;
    process.env.EXISTING = 'original';
    delete process.env.NEW_KEY;

    const secrets = await hydrateProcessEnvFromFile(file);
    expect(secrets).toEqual({ EXISTING: 'should-stay', NEW_KEY: 'value' });
    expect(process.env.EXISTING).toBe('original');
    expect(process.env.NEW_KEY).toBe('value');

    if (originalExisting !== undefined) {
      process.env.EXISTING = originalExisting;
    } else {
      delete process.env.EXISTING;
    }
    if (originalNew !== undefined) {
      process.env.NEW_KEY = originalNew;
    } else {
      delete process.env.NEW_KEY;
    }
  });
});
