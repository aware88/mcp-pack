import { describe, expect, it } from 'vitest';
import { mergeMcpServers } from '../src/safety/merge';

describe('mergeMcpServers', () => {
  it('merges new servers into empty map', () => {
    const result = mergeMcpServers({}, {
      alpha: { command: 'cmd', args: ['--test'] },
    });

    expect(result).toEqual({
      alpha: { command: 'cmd', args: ['--test'] },
    });
  });

  it('overrides existing server while preserving other keys', () => {
    const result = mergeMcpServers(
      {
        alpha: { command: 'old', args: ['--old'], env: { TOKEN: 'old' } },
        beta: { command: 'keep' },
      },
      {
        alpha: { command: 'new', env: { TOKEN: 'new', EXTRA: '1' } },
      },
    );

    expect(result).toEqual({
      alpha: {
        command: 'new',
        env: { TOKEN: 'new', EXTRA: '1' },
      },
      beta: { command: 'keep' },
    });
  });
});
