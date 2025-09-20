import { execa } from 'execa';

export async function installWithMcpGet(serverId: string, verbose = false): Promise<boolean> {
  try {
    await execa('npx', ['@michaellatman/mcp-get@latest', 'install', serverId], {
      stdio: verbose ? 'inherit' : 'pipe',
    });
    return true;
  } catch (error) {
    return false;
  }
}
