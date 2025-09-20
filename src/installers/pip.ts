import { execa } from 'execa';

export async function installWithPip(command: string, verbose = false): Promise<void> {
  await execa('bash', ['-lc', command], {
    stdio: verbose ? 'inherit' : 'pipe',
  });
}
