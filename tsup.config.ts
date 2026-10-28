import { defineConfig } from 'tsup';

const shared = { splitting: false, sourcemap: true, clean: false, treeshake: true, target: 'es2020', outDir: 'dist' };
const mainEntries = { index: 'src/index.ts', vite: 'src/vite.ts', assets: 'src/assets.ts', 'default-worker': 'src/defaultWorkerEntry.ts' };

export default defineConfig([
  { ...shared, entry: mainEntries, format: ['esm'], dts: { entry: mainEntries } },
  {
    ...shared,
    entry: { worker: 'src/worker.ts' },
    format: ['esm'],
    platform: 'browser',
    noExternal: [/^onnxruntime-web/],
    esbuildOptions: (options): void => {
      options.conditions = ['onnxruntime-web-use-extern-wasm'];
    },
  },
  { ...shared, entry: { cli: 'src/cli.ts' }, format: ['esm'], platform: 'node', banner: { js: '#!/usr/bin/env node' } },
]);
