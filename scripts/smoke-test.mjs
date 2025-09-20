import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function runCommand(args, env, label) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/cli.mjs', ...args], {
      cwd: ROOT,
      env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-pack-smoke-'));
  const cleanup = async () => {
    await fs.remove(tempHome).catch(() => {});
  };

  const packPath = path.join(ROOT, 'pack.yaml');
  const packContent = await fs.readFile(packPath, 'utf-8');
  const packDoc = yaml.parse(packContent);
  const firstServer = packDoc?.servers?.[0]?.id;
  if (!firstServer) {
    throw new Error('pack.yaml does not contain any servers.');
  }

  const selectionsDir = path.join(tempHome, '.mcp-pack', 'selections');
  await fs.ensureDir(selectionsDir);
  await fs.writeJson(path.join(selectionsDir, 'default.json'), [firstServer]);

  const secretsPath = path.join(tempHome, 'secrets.env');
  await fs.writeFile(secretsPath, 'EXAMPLE_TOKEN=dummy-value\n');

  const env = {
    ...process.env,
    HOME: tempHome,
    USERPROFILE: tempHome,
  };

  console.log('> Smoke test: write-config dry run');
  await runCommand(['write-config', '--client', 'claude', '--dry-run', '--profile', 'default'], env, 'write-config --dry-run');

  console.log('> Smoke test: doctor report');
  await runCommand(
    ['doctor', '--profile', 'default', '--report', 'credentials', '--secrets', secretsPath],
    env,
    'doctor --report credentials',
  );

  const snapshotPath = path.join(tempHome, 'snapshot.json');
  console.log('> Smoke test: profile export');
  await runCommand(
    ['profile', 'export', snapshotPath, '--profile', 'default', '--include-env', '--secrets', secretsPath],
    env,
    'profile export',
  );

  console.log('> Smoke test: profile import');
  await runCommand(
    ['profile', 'import', snapshotPath, '--profile', 'smoke', '--extend-pack', '--force'],
    env,
    'profile import',
  );

  await cleanup();
  console.log('\nSmoke test completed successfully.');
}

main().catch((error) => {
  console.error('\nSmoke test failed:', error.message);
  process.exit(1);
});
