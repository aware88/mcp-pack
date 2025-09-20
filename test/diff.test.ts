import { describe, expect, it } from 'vitest';

import { renderDiff } from '../src/safety/diff.js';

describe('renderDiff', () => {
  it('formats added and unchanged lines', () => {
    const before = 'alpha\n';
    const after = 'alpha\nbeta\n';

    const output = renderDiff(before, after);

    expect(output).toContain('+ beta');
    expect(output).toContain('  alpha');
  });

  it('formats removed lines', () => {
    const before = 'alpha\nbeta\n';
    const after = 'alpha\n';

    const output = renderDiff(before, after);
    expect(output).toContain('- beta');
  });
});
