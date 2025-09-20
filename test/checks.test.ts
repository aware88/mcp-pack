import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ensureJsonFile, ensureTomlFile } from '../src/doctor/checks.js';

describe('doctor ensure file helpers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-pack-checks-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('warns about missing JSON file without applyFix', async () => {
    const target = path.join(tempDir, 'config.json');
    const result = await ensureJsonFile(target, () => ({ foo: 'bar' }), false);

    expect(result.status).toBe('warn');
    expect(result.fixAvailable).toBe(true);
    expect(await fs.pathExists(target)).toBe(false);
  });

  it('creates JSON skeleton when applyFix is true', async () => {
    const target = path.join(tempDir, 'config.json');
    const result = await ensureJsonFile(target, () => ({ foo: 'bar' }), true);

    expect(result.status).toBe('ok');
    expect(result.fixApplied).toBe(true);
    const content = await fs.readFile(target, 'utf-8');
    expect(JSON.parse(content)).toEqual({ foo: 'bar' });
  });

  it('validates existing TOML file', async () => {
    const target = path.join(tempDir, 'config.toml');
    await fs.ensureFile(target);
    await fs.writeFile(target, 'foo = "bar"\n');

    const result = await ensureTomlFile(target, () => ({ foo: 'baz' }), false);
    expect(result.status).toBe('ok');
  });

  it('creates TOML skeleton when applyFix is true', async () => {
    const target = path.join(tempDir, 'config.toml');
    const result = await ensureTomlFile(target, () => ({ foo: 'bar' }), true);

    expect(result.status).toBe('ok');
    const content = await fs.readFile(target, 'utf-8');
    expect(content.trim()).toBe('foo = "bar"');
  });
});
