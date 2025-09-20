import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

import { registry, ServerDefinition } from './registry.js';
import { multiSelectPrompt, confirmPrompt, passwordPrompt } from './utils/prompts.js';
import { readSelections, writeSelections, listProfiles, copyProfile } from './utils/selections.js';
import { installServer } from './installers/index.js';
import { ClaudeAdapter } from './adapters/claude.js';
import { CursorAdapter } from './adapters/cursor.js';
import { VSCodeAdapter } from './adapters/vscode.js';
import { WindsurfAdapter } from './adapters/windsurf.js';
import { CodexAdapter } from './adapters/codex.js';
import { ClientAdapter } from './adapters/types.js';
import { McpServerConfig, WriteConfigOptions } from './types.js';
import { selectionsDir } from './utils/paths.js';
import { checkNodeVersion, checkCommand, ensureJsonFile, ensureTomlFile, summarise } from './doctor/checks.js';
import type { DoctorCheckResult } from './doctor/checks.js';
import { renderDiff } from './safety/diff.js';
import { fetchText } from './utils/net.js';
import yaml from 'yaml';
import { hydrateProcessEnvFromFile } from './utils/secrets.js';

const DEFAULT_PROFILE = 'default';
const WORKSPACE_ROOT = process.cwd();
const DEFAULT_PACK_URL = 'https://raw.githubusercontent.com/YOUR-GITHUB-USERNAME/mcp-pack/main/pack.yaml';
const SNAPSHOT_VERSION = 1;

interface ProfileSnapshot {
  version: number;
  generatedAt: string;
  profile: string;
  servers: ServerDefinition[];
  envValues?: Record<string, string>;
  targetClients?: string[];
}

const adapters: Record<string, ClientAdapter> = {
  claude: new ClaudeAdapter(),
  cursor: new CursorAdapter(),
  vscode: new VSCodeAdapter(),
  windsurf: new WindsurfAdapter(),
  codex: new CodexAdapter(),
};

const program = new Command();
program.name('mcp-pack').description('Cross-client MCP installer and config writer').version('0.1.0');

program
  .command('select')
  .description('Select servers from pack.yaml for a profile')
  .option('--profile <name>', 'profile name', DEFAULT_PROFILE)
  .action(async (options: { profile: string }) => {
    const profile = options.profile || DEFAULT_PROFILE;
    await selectServersInteractive(profile);
  });

program
  .command('update-pack')
  .description('Fetch the latest pack.yaml from a remote source')
  .option('--url <url>', 'pack.yaml URL to download', DEFAULT_PACK_URL)
  .option('--dry-run', 'show diff without writing')
  .action(async (options: { url?: string; dryRun?: boolean }) => {
    const packPath = path.join(WORKSPACE_ROOT, 'pack.yaml');
    const remoteUrl = options.url || DEFAULT_PACK_URL;

    try {
      const [remoteContent, localContent] = await Promise.all([
        fetchText(remoteUrl),
        fs.pathExists(packPath).then((exists) => (exists ? fs.readFile(packPath, 'utf-8') : '')),
      ]);

      if (!remoteContent.trim()) {
        console.log(chalk.yellow('Remote pack.yaml appears to be empty. Aborting.'));
        return;
      }

      if (localContent.trim() === remoteContent.trim()) {
        console.log(chalk.green('Local pack.yaml already matches the remote version.'));
        return;
      }

      console.log(chalk.cyan(`Diff against ${remoteUrl}:`));
      const diff = renderDiff(localContent || '<empty>', remoteContent);
      console.log(diff || chalk.gray('No textual differences.'));

      if (options.dryRun) {
        console.log(chalk.gray('\nDry run complete. No changes written.'));
        return;
      }

      const confirmed = await confirmPrompt('Replace local pack.yaml with remote version?');
      if (!confirmed) {
        console.log(chalk.gray('Update cancelled.'));
        return;
      }

      const normalised = remoteContent.endsWith('\n') ? remoteContent : `${remoteContent}\n`;
      await fs.writeFile(packPath, normalised, 'utf-8');
      registry.invalidate();
      console.log(chalk.green('pack.yaml updated successfully.'));
    } catch (error) {
      console.error(chalk.red('Failed to update pack.yaml:'), (error as Error).message);
    }
  });

program
  .command('walkthrough')
  .description('Guided setup for first-time users')
  .option('--profile <name>', 'profile name', DEFAULT_PROFILE)
  .option('--client <ids>', 'comma separated client identifiers to focus on')
  .option('--secrets <path>', 'load environment variables from a secrets file ahead of time')
  .option('--scope <scope>', 'cursor scope to use for configuration', 'global')
  .action(async (options: { profile: string; client?: string; secrets?: string; scope?: 'global' | 'project' }) => {
    const profile = options.profile || DEFAULT_PROFILE;

    console.log(chalk.bold('MCP Pack Walkthrough'));
    await applySecrets(options.secrets);

    console.log(chalk.cyan('\nStep 1: Choose servers'));
    const selected = await selectServersInteractive(profile);
    if (selected.length === 0) {
      console.log(chalk.yellow('No selections stored. Exiting walkthrough.'));
      return;
    }

    console.log(chalk.cyan('\nStep 2: Choose clients to configure'));
    let clientIds: string[];
    if (options.client) {
      clientIds = parseClientList(options.client);
    } else {
      const detections = await detectClients();
      const choices = Object.entries(adapters).map(([id, adapter]) => ({
        name: id,
        message: detections[id]?.exists ? `${adapter.displayName} (detected)` : adapter.displayName,
      }));
      const defaults = choices.filter((choice) => detections[choice.name]?.exists).map((choice) => choice.name);
      clientIds = await multiSelectPrompt('Select clients to configure', choices, defaults);
    }

    if (clientIds.length === 0) {
      console.log(chalk.yellow('No clients selected. Exiting walkthrough.'));
      return;
    }

    const installConfirmed = await confirmPrompt(`Install selected servers for ${clientIds.length} client(s)?`, true);
    if (installConfirmed) {
      await installForClients(clientIds, profile, { assumeYes: false, verbose: false });
    }

    console.log(chalk.cyan('\nStep 3: Review and apply configuration diffs'));
    for (const clientId of clientIds) {
      const adapter = adapters[clientId];
      const scope = clientId === 'cursor' ? options.scope : undefined;

      await writeConfigFlow({
        clientId,
        profile,
        dryRun: true,
        assumeYes: true,
        scope,
      });

      const apply = await confirmPrompt(`Apply configuration for ${adapter.displayName}?`, true);
      if (apply) {
        await writeConfigFlow({
          clientId,
          profile,
          dryRun: false,
          assumeYes: false,
          scope,
          smokeTest: true,
        });
      }
    }

    console.log(chalk.cyan('\nStep 4: Run doctor checks'));
    await doctorFlow(profile, { fix: false, report: 'credentials' });

    console.log(chalk.green('\nWalkthrough complete!'));
  });

program
  .command('install')
  .description('Install selected servers for a client')
  .requiredOption('--client <name>', 'client identifier (comma separated for multiple)')
  .option('--profile <name>', 'profile name', DEFAULT_PROFILE)
  .option('-y, --yes', 'skip environment prompts')
  .option('-v, --verbose', 'show installer output')
  .option('--secrets <path>', 'load environment variables from a secrets file before prompting')
  .action(async (options: { client: string; profile: string; yes?: boolean; verbose?: boolean; secrets?: string }) => {
    const clientIds = parseClientList(options.client);
    const profile = options.profile || DEFAULT_PROFILE;

    await applySecrets(options.secrets);
    await installForClients(clientIds, profile, {
      assumeYes: Boolean(options.yes),
      verbose: Boolean(options.verbose),
    });
  });

program
  .command('write-config')
  .description('Write MCP configuration for selected servers')
  .requiredOption('--client <name>', 'client identifier')
  .option('--profile <name>', 'profile name', DEFAULT_PROFILE)
  .option('--dry-run', 'preview changes without writing')
  .option('-y, --yes', 'skip confirmation prompts')
  .option('--scope <scope>', 'cursor scope: global or project')
  .option('--secrets <path>', 'load environment variables from a secrets file before prompting')
  .option('--smoke-test', 'perform a post-write verification pass')
  .action(async (options: { client: string; profile: string; dryRun?: boolean; yes?: boolean; scope?: 'global' | 'project'; secrets?: string; smokeTest?: boolean }) => {
    const profile = options.profile || DEFAULT_PROFILE;
    const clientId = options.client;

    await applySecrets(options.secrets);
    await writeConfigFlow({
      clientId,
      profile,
      dryRun: Boolean(options.dryRun),
      assumeYes: Boolean(options.yes),
      scope: options.scope,
      smokeTest: Boolean(options.smokeTest),
    });
  });

program
  .command('doctor')
  .description('Diagnose MCP Pack setup and offer fixes')
  .option('--fix', 'attempt to fix common issues')
  .option('--profile <name>', 'profile to check', DEFAULT_PROFILE)
  .option('--report <name>', 'produce a named report (credentials)')
  .option('--secrets <path>', 'load environment variables before checking (supports .env or JSON)')
  .action(async (options: { fix?: boolean; profile: string; report?: string; secrets?: string }) => {
    const profile = options.profile || DEFAULT_PROFILE;

    await applySecrets(options.secrets);
    await doctorFlow(profile, {
      fix: Boolean(options.fix),
      report: options.report,
    });
  });
const profileCommand = program.command('profile').description('Manage selections profiles');

profileCommand
  .command('list')
  .description('List available profiles')
  .action(async () => {
    const profiles = await listProfiles();
    if (profiles.length === 0) {
      console.log(chalk.yellow('No profiles found. Run mcp-pack select to create one.'));
      return;
    }

    console.log(chalk.cyan('Profiles:'));
    for (const profile of profiles) {
      const selections = await readSelections(profile);
      console.log(`• ${profile} (${selections.length} servers)`);
    }
  });

profileCommand
  .command('create <name>')
  .description('Create a new profile')
  .option('--copy-from <profile>', 'copy selections from existing profile')
  .action(async (name: string, options: { copyFrom?: string }) => {
    const existing = await readSelections(name);
    if (existing.length > 0) {
      console.log(chalk.red(`Profile '${name}' already exists.`));
      return;
    }

    if (options.copyFrom) {
      await copyProfile(options.copyFrom, name);
      console.log(chalk.green(`Profile '${name}' created from '${options.copyFrom}'.`));
      return;
    }

    await writeSelections(name, []);
    console.log(chalk.green(`Profile '${name}' created.`));
  });

profileCommand
  .command('export <file>')
  .description('Export a profile snapshot for sharing')
  .option('--profile <name>', 'profile name', DEFAULT_PROFILE)
  .option('--include-env', 'capture environment variable values present in this shell')
  .option('--secrets <path>', 'hydrate env vars from a secrets file before exporting')
  .action(async (file: string, options: { profile?: string; includeEnv?: boolean; secrets?: string }) => {
    const profile = options.profile || DEFAULT_PROFILE;
    const selections = await ensureSelections(profile);

    if (selections.length === 0) {
      console.log(chalk.yellow(`Profile '${profile}' has no servers to export.`));
      return;
    }

    await applySecrets(options.secrets);

    const servers: ServerDefinition[] = [];
    for (const id of selections) {
      const server = await registry.getServer(id);
      if (!server) {
        console.log(chalk.red(`Server '${id}' not found in pack.yaml. Skipping.`));
        continue;
      }
      servers.push(server);
    }

    if (servers.length === 0) {
      console.log(chalk.red('No valid servers to export.'));
      return;
    }

    const detections = await detectClients();
    const targetClients = Object.values(detections)
      .filter((entry) => entry.exists)
      .map((entry) => entry.adapter.name);

    const envValues: Record<string, string> = {};
    if (options.includeEnv) {
      for (const server of servers) {
        for (const env of server.env) {
          const value = process.env[env.name];
          if (value) {
            envValues[env.name] = value;
          }
        }
      }
    }

    const snapshot: ProfileSnapshot = {
      version: SNAPSHOT_VERSION,
      generatedAt: new Date().toISOString(),
      profile,
      servers,
    };

    if (Object.keys(envValues).length > 0) {
      snapshot.envValues = envValues;
    }
    if (targetClients.length > 0) {
      snapshot.targetClients = targetClients;
    }

    const outputPath = path.isAbsolute(file) ? file : path.join(WORKSPACE_ROOT, file);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));
    console.log(chalk.green(`Exported profile '${profile}' to ${outputPath}`));
  });

profileCommand
  .command('import <file>')
  .description('Import a profile snapshot and selections')
  .option('--profile <name>', 'profile name', DEFAULT_PROFILE)
  .option('--extend-pack', 'append snapshot servers missing from pack.yaml')
  .option('--force', 'overwrite existing selections without confirmation')
  .action(async (file: string, options: { profile?: string; extendPack?: boolean; force?: boolean }) => {
    const profile = options.profile || DEFAULT_PROFILE;
    const snapshotPath = path.isAbsolute(file) ? file : path.join(WORKSPACE_ROOT, file);

    if (!(await fs.pathExists(snapshotPath))) {
      console.log(chalk.red(`Snapshot not found at ${snapshotPath}`));
      return;
    }

    const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf-8')) as ProfileSnapshot;
    if (snapshot.version !== SNAPSHOT_VERSION) {
      console.log(chalk.yellow(`Snapshot version ${snapshot.version} may not be fully compatible with CLI version ${SNAPSHOT_VERSION}.`));
    }

    const serverIds = snapshot.servers.map((server) => server.id);
    if (serverIds.length === 0) {
      console.log(chalk.red('Snapshot contains no servers.'));
      return;
    }

    const existing = await readSelections(profile);
    if (existing.length > 0 && !options.force) {
      const confirmed = await confirmPrompt(`Profile '${profile}' already has selections. Overwrite with snapshot?`, false);
      if (!confirmed) {
        console.log(chalk.gray('Import cancelled.'));
        return;
      }
    }

    const packPath = path.join(WORKSPACE_ROOT, 'pack.yaml');
    const packDoc = ((await fs.pathExists(packPath))
      ? ((yaml.parse(await fs.readFile(packPath, 'utf-8')) as { servers?: ServerDefinition[] }) ?? { servers: [] })
      : { servers: [] });
    packDoc.servers = packDoc.servers ?? [];
    const existingIds = new Set((packDoc.servers as ServerDefinition[]).map((server) => server.id));

    const missingServers = snapshot.servers.filter((server) => !existingIds.has(server.id));
    if (missingServers.length > 0 && !options.extendPack) {
      console.log(chalk.yellow(`The following servers are missing from pack.yaml: ${missingServers.map((server) => server.id).join(', ')}.`));
      console.log(chalk.gray('Re-run with --extend-pack to append them automatically.'));
      return;
    }

    if (missingServers.length > 0) {
      for (const server of missingServers) {
        (packDoc.servers as ServerDefinition[]).push(server);
      }
      const newContent = yaml.stringify(packDoc) ?? '';
      await fs.writeFile(packPath, newContent.endsWith('\n') ? newContent : `${newContent}\n`);
      registry.invalidate();
      console.log(chalk.green('pack.yaml updated with servers from snapshot.'));
    }

    await writeSelections(profile, serverIds);
    console.log(chalk.green(`Imported snapshot into profile '${profile}'.`));

    if (snapshot.envValues && Object.keys(snapshot.envValues).length > 0) {
      console.log(chalk.cyan('Snapshot includes environment values for reference:'));
      for (const [name, value] of Object.entries(snapshot.envValues)) {
        console.log(`• ${name}=${value}`);
      }
    }

    if (snapshot.targetClients && snapshot.targetClients.length > 0) {
      console.log(chalk.gray(`Snapshot was created on a machine with: ${snapshot.targetClients.join(', ')}`));
    }
  });

program
  .command('rollback')
  .description('Rollback client configuration to the latest backup')
  .requiredOption('--client <name>', 'client identifier')
  .option('--scope <scope>', 'cursor scope: global or project')
  .action(async (options: { client: string; scope?: 'global' | 'project' }) => {
    const adapter = adapters[options.client];
    if (!adapter) {
      console.error(chalk.red(`Unknown client '${options.client}'.`));
      return;
    }

    try {
      const result = await adapter.rollback(WORKSPACE_ROOT, options.scope);
      console.log(chalk.green(`Restored ${result.path} from ${result.restoredFrom}`));
    } catch (error) {
      console.error(chalk.red((error as Error).message));
    }
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});

function parseClientList(input: string): string[] {
  const parts = input.split(',').map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (!adapters[part]) {
      throw new Error(`Unsupported client '${part}'. Available: ${Object.keys(adapters).join(', ')}`);
    }
  }
  return parts;
}

async function ensureSelections(profile: string): Promise<string[]> {
  const selections = await readSelections(profile);
  if (selections.length === 0) {
    return [];
  }
  return selections;
}

type EnvInput = Record<string, string>;

async function promptForEnv(servers: ServerDefinition[], assumeYes: boolean): Promise<Record<string, EnvInput>> {
  const envByServer: Record<string, EnvInput> = {};

  for (const server of servers) {
    const envVars: EnvInput = {};
    for (const env of server.env) {
      const existing = process.env[env.name];
      if (existing) {
        envVars[env.name] = existing;
        continue;
      }

      if (assumeYes) {
        envVars[env.name] = `<SET_${env.name}>`;
        continue;
      }

      if (env.help) {
        console.log(chalk.gray(env.help));
      }

      const value = await passwordPrompt(`Enter ${env.name} for ${server.id}`);
      envVars[env.name] = value;
    }

    if (Object.keys(envVars).length > 0) {
      envByServer[server.id] = envVars;
    }
  }

  return envByServer;
}

function buildServerConfigs(servers: ServerDefinition[], envInputs: Record<string, EnvInput>): Record<string, McpServerConfig> {
  const configs: Record<string, McpServerConfig> = {};
  for (const server of servers) {
    const env = envInputs[server.id];
    const config: McpServerConfig = {
      command: 'npx',
      args: ['-y', server.id],
    };
    if (env && Object.keys(env).length > 0) {
      config.env = env;
    }
    configs[server.id] = config;
  }
  return configs;
}

async function selectServersInteractive(profile: string): Promise<string[]> {
  const servers = await registry.listServers();
  const existing = await readSelections(profile);

  const choices = servers.map((server) => ({
    name: server.id,
    message: `${server.id} (${server.runtime})`,
    hint: server.tags?.join(', '),
  }));

  if (choices.length === 0) {
    console.log(chalk.yellow('No servers found in pack.yaml.'));
    return existing;
  }

  const selected = await multiSelectPrompt('Select servers to include', choices, existing);
  await writeSelections(profile, selected);

  console.log(chalk.green(`Saved ${selected.length} server(s) to profile '${profile}'.`));
  console.log(chalk.gray(`Selections stored at ${selectionsDir()}`));
  return selected;
}

interface InstallFlowOptions {
  assumeYes: boolean;
  verbose: boolean;
}

async function installForClients(clientIds: string[], profile: string, options: InstallFlowOptions): Promise<void> {
  const selected = await ensureSelections(profile);
  if (selected.length === 0) {
    console.log(chalk.yellow(`Profile '${profile}' has no servers. Run 'mcp-pack select --profile ${profile}'.`));
    return;
  }

  const servers = await Promise.all(selected.map(async (id) => {
    const server = await registry.getServer(id);
    if (!server) {
      throw new Error(`Server '${id}' not found in pack.yaml`);
    }
    return server;
  }));

  for (const adapter of clientIds.map((id) => adapters[id])) {
    console.log(chalk.cyan(`\nInstalling for ${adapter.displayName}...`));
    for (const server of servers) {
      const spinner = ora(`Installing ${server.id}`).start();
      try {
        await installServer(server, options.verbose);
        spinner.succeed(`Installed ${server.id}`);
      } catch (error) {
        spinner.fail(`Failed to install ${server.id}`);
        console.error(chalk.red((error as Error).message));
      }
    }
  }

  if (!options.assumeYes) {
    const sessionEnv = await promptForEnv(servers, false);
    for (const values of Object.values(sessionEnv)) {
      for (const [key, value] of Object.entries(values)) {
        process.env[key] = value;
      }
    }
  }

  console.log(chalk.green('\nInstall step completed. Run write-config to apply config updates.'));
}

interface WriteConfigFlowParams {
  clientId: string;
  profile: string;
  dryRun: boolean;
  assumeYes: boolean;
  scope?: 'global' | 'project';
  smokeTest?: boolean;
}

async function writeConfigFlow(params: WriteConfigFlowParams): Promise<void> {
  const { clientId, profile, dryRun, assumeYes, scope, smokeTest } = params;
  const adapter = adapters[clientId];

  if (!adapter) {
    console.error(chalk.red(`Unknown client '${clientId}'.`));
    return;
  }

  const selected = await ensureSelections(profile);
  if (selected.length === 0) {
    console.log(chalk.yellow(`Profile '${profile}' has no servers. Run 'mcp-pack select --profile ${profile}'.`));
    return;
  }

  const runtimeServers = await Promise.all(selected.map(async (id) => {
    const server = await registry.getServer(id);
    if (!server) {
      throw new Error(`Server '${id}' not found in pack.yaml`);
    }
    return server;
  }));

  const envInputs = await promptForEnv(runtimeServers, assumeYes || dryRun);
  const serverConfigs = buildServerConfigs(runtimeServers, envInputs);

  const writeOptions: WriteConfigOptions = {
    servers: serverConfigs,
    dryRun,
    assumeYes,
    workspaceRoot: WORKSPACE_ROOT,
    scope,
  };

  const preview = await adapter.writeConfig({ ...writeOptions, dryRun: true });

  if (!preview.diff) {
    console.log(chalk.gray('No configuration changes required.'));
    return;
  }

  console.log(chalk.cyan(`\nDiff for ${adapter.displayName}:`));
  console.log(preview.diff);

  if (dryRun) {
    console.log(chalk.gray('\nDry run complete. Use without --dry-run to apply.'));
    return;
  }

  let confirmed = assumeYes;
  if (!assumeYes) {
    confirmed = await confirmPrompt('Apply these changes?');
  }

  if (!confirmed) {
    console.log(chalk.gray('Config write cancelled.'));
    return;
  }

  const result = await adapter.writeConfig({ ...writeOptions, dryRun: false });
  if (result.wrote) {
    console.log(chalk.green(`Updated ${result.path}`));
    if (result.backupPath) {
      console.log(chalk.gray(`Backup: ${result.backupPath}`));
    }

    if (smokeTest) {
      await runSmokeTest(adapter, writeOptions);
    }
  } else {
    console.log(chalk.gray('No changes written.'));
  }
}

async function doctorFlow(profile: string, options: { fix: boolean; report?: string }): Promise<void> {
  const results: DoctorCheckResult[] = [];

  results.push(await checkNodeVersion());
  results.push(await checkCommand('npx', 'npx'));

  const detections = await detectClients();

  for (const entry of Object.values(detections)) {
    const { adapter, path: configPath } = entry;

    if (!configPath) {
      results.push({ name: adapter.displayName, status: 'warn', message: 'Not available on this platform' });
      continue;
    }

    if (adapter.name === 'codex') {
      results.push(await ensureTomlFile(configPath, () => ({ mcp_servers: {} }), options.fix));
    } else {
      results.push(await ensureJsonFile(configPath, () => ({ mcpServers: {} }), options.fix));
    }
  }

  const detectedClients = Object.values(detections)
    .filter((entry) => entry.exists)
    .map((entry) => entry.adapter.displayName);

  if (detectedClients.length > 0) {
    console.log(chalk.cyan(`Detected clients: ${detectedClients.join(', ')}`));
  } else {
    console.log(chalk.yellow('No supported clients detected on this machine.'));
  }

  const servers = await ensureSelections(profile);
  const envMissing: string[] = [];
  const envCatalog: { name: string; server: string; help?: string }[] = [];

  for (const serverId of servers) {
    const server = await registry.getServer(serverId);
    if (!server) continue;
    for (const env of server.env) {
      envCatalog.push({ name: env.name, server: server.id, help: env.help });
      if (!process.env[env.name]) {
        envMissing.push(`${env.name} (${server.id})`);
      }
    }
  }

  if (envMissing.length > 0) {
    results.push({
      name: 'Environment variables',
      status: 'warn',
      message: `Missing values: ${envMissing.join(', ')}`,
    });
  } else {
    results.push({ name: 'Environment variables', status: 'ok', message: 'All required variables set in current shell' });
  }

  console.log('\n' + chalk.bold('Doctor Summary'));
  for (const result of results) {
    const icon = result.status === 'ok' ? chalk.green('✔') : result.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✖');
    console.log(`${icon} ${result.name}: ${result.message}`);
  }

  console.log('\n' + summarise(results));

  if (options.report === 'credentials') {
    const grouped = new Map<string, { servers: Set<string>; help?: string }>();
    for (const entry of envCatalog) {
      if (!grouped.has(entry.name)) {
        grouped.set(entry.name, { servers: new Set(), help: entry.help });
      }
      grouped.get(entry.name)!.servers.add(entry.server);
    }

    console.log('\n' + chalk.bold('Credentials checklist'));
    if (grouped.size === 0) {
      console.log(chalk.gray('No environment variables required for current selections.'));
      return;
    }

    for (const [name, detail] of grouped.entries()) {
      const serversList = Array.from(detail.servers).join(', ');
      const helpText = detail.help ? ` – ${detail.help}` : '';
      const status = process.env[name] ? chalk.green('READY') : chalk.yellow('MISSING');
      console.log(`${status} ${name}: ${serversList}${helpText}`);
    }
  }
}

async function applySecrets(secretsPath?: string): Promise<void> {
  if (!secretsPath) {
    return;
  }

  try {
    const secrets = await hydrateProcessEnvFromFile(secretsPath);
    const count = Object.keys(secrets).length;
    console.log(chalk.gray(`Loaded ${count} secret${count === 1 ? '' : 's'} from ${secretsPath}`));
  } catch (error) {
    console.log(chalk.red('Failed to load secrets file:'), (error as Error).message);
  }
}

async function runSmokeTest(adapter: ClientAdapter, options: WriteConfigOptions): Promise<void> {
  try {
    const verification = await adapter.writeConfig({ ...options, dryRun: true });
    if (verification.diff && verification.diff.trim().length > 0) {
      console.log(chalk.yellow('Smoke test found additional changes:'));
      console.log(verification.diff);
    } else {
      console.log(chalk.green('Smoke test passed: no additional changes required.'));
    }
  } catch (error) {
    console.log(chalk.red('Smoke test failed:'), (error as Error).message);
  }
}

interface ClientDetection {
  adapter: ClientAdapter;
  path: string | null;
  exists: boolean;
}

async function detectClients(): Promise<Record<string, ClientDetection>> {
  const detections: Record<string, ClientDetection> = {};
  for (const [id, adapter] of Object.entries(adapters)) {
    const configPath = adapter.getConfigPath(WORKSPACE_ROOT, adapter.name === 'cursor' ? 'global' : undefined) ?? null;
    let exists = false;
    if (configPath) {
      exists = await fs.pathExists(configPath);
    }
    detections[id] = { adapter, path: configPath, exists };
  }
  return detections;
}
