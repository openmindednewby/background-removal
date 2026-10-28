import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', worker: 'src/worker.ts' },
  format: ['esm'],
  dts: { entry: { index: 'src/index.ts' } },
  splitting: false,
  sourcemap: true,
  clean: false,
  treeshake: true,
  target: 'es2020',
  outDir: 'dist',
});
