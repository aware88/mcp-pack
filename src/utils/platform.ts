export const isMac = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';
export const isLinux = process.platform === 'linux';

export function describePlatform(): string {
  if (isMac) return 'macOS';
  if (isWindows) return 'Windows';
  if (isLinux) return 'Linux';
  return process.platform;
}
