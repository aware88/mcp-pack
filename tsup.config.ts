import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts'
  },
  format: ['esm'],
  dts: true,
  clean: true,
  shims: false,
  target: 'node18',
  bundle: true,
  external: [
    'fs-extra',
    'yaml', 
    'chalk',
    'ora',
    'enquirer',
    'commander',
    'execa',
    'zod'
  ],
  banner: {
    js: '#!/usr/bin/env node'
  }
});