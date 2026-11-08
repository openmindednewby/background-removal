import { readFileSync, statSync } from 'node:fs';
import { defineConfig } from 'tsup';

const shared = { splitting: false, sourcemap: true, clean: false, treeshake: true, target: 'es2020', outDir: 'dist' };
const versionOf = (file: string): string => (JSON.parse(readFileSync(file, 'utf8')) as { version: string }).version;
const buildInfo = {
  packageVersion: versionOf('package.json'),
  runtimeVersion: versionOf('node_modules/onnxruntime-web/package.json'),
  downloadBytes: statSync('models/modnet.onnx').size + statSync('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm').size,
};
const mainEntries = { index: 'src/index.ts', vite: 'src/vite.ts', assets: 'src/assets.ts', 'default-worker': 'src/defaultWorkerEntry.ts' };

export default defineConfig([
  { ...shared, entry: mainEntries, format: ['esm'], dts: { entry: mainEntries }, define: { __BG_REMOVAL_BUILD__: JSON.stringify(buildInfo) } },
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
