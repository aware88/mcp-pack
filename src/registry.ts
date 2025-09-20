import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

export interface ServerEnvVar {
  name: string;
  help?: string;
}

export type RuntimeType = 'npm' | 'pip' | 'go' | 'docker';

export interface ServerDefinition {
  id: string;
  runtime: RuntimeType;
  install: string;
  env: ServerEnvVar[];
  tags?: string[];
}

interface PackFile {
  servers: ServerDefinition[];
}

export class Registry {
  private cache: Map<string, ServerDefinition> | null = null;

  async load(): Promise<Map<string, ServerDefinition>> {
    if (this.cache) {
      return this.cache;
    }

    const packPath = await this.resolvePackPath();
    const content = await fs.readFile(packPath, 'utf-8');
    const data = yaml.parse(content) as PackFile;

    if (!data?.servers || !Array.isArray(data.servers)) {
      throw new Error('pack.yaml missing "servers" array');
    }

    this.cache = new Map(data.servers.map((server) => [server.id, server]));
    return this.cache;
  }

  async getServer(id: string): Promise<ServerDefinition | null> {
    const registry = await this.load();
    return registry.get(id) ?? null;
  }

  async listServers(): Promise<ServerDefinition[]> {
    const registry = await this.load();
    return Array.from(registry.values());
  }

  invalidate(): void {
    this.cache = null;
  }

  private async resolvePackPath(): Promise<string> {
    const cwdCandidate = path.resolve(process.cwd(), 'pack.yaml');
    if (await fs.pathExists(cwdCandidate)) {
      return cwdCandidate;
    }

    const here = path.dirname(fileURLToPath(import.meta.url));
    const packageRootCandidate = path.resolve(here, '..', 'pack.yaml');
    if (await fs.pathExists(packageRootCandidate)) {
      return packageRootCandidate;
    }

    const distSiblingCandidate = path.resolve(here, 'pack.yaml');
    if (await fs.pathExists(distSiblingCandidate)) {
      return distSiblingCandidate;
    }

    throw new Error('Unable to locate pack.yaml');
  }
}

export const registry = new Registry();
