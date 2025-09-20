import chalk from 'chalk';
import { ServerDefinition } from '../registry.js';
import { installWithMcpGet } from './mcpget.js';
import { installWithNpm } from './npm.js';
import { installWithPip } from './pip.js';
import { installWithGo } from './go.js';
import { installWithDocker } from './docker.js';

export interface InstallResult {
  server: ServerDefinition;
  method: 'mcp-get' | 'runtime';
}

export async function installServer(server: ServerDefinition, verbose = false): Promise<InstallResult> {
  const viaMcp = await installWithMcpGet(server.id, verbose);
  if (viaMcp) {
    return { server, method: 'mcp-get' };
  }

  try {
    switch (server.runtime) {
      case 'npm':
        await installWithNpm(server.install, verbose);
        break;
      case 'pip':
        await installWithPip(server.install, verbose);
        break;
      case 'go':
        await installWithGo(server.install, verbose);
        break;
      case 'docker':
        await installWithDocker(server.install, verbose);
        break;
      default:
        throw new Error(`Unsupported runtime '${server.runtime}' for ${server.id}`);
    }

    return { server, method: 'runtime' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(chalk.red(`Failed to install ${server.id}: ${message}`));
  }
}
