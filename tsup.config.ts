import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', worker: 'src/worker.ts', vite: 'src/vite.ts' },
  format: ['esm'],
  dts: { entry: { index: 'src/index.ts', vite: 'src/vite.ts' } },
  splitting: false,
  sourcemap: true,
  clean: false,
  treeshake: true,
  target: 'es2020',
  outDir: 'dist',
});
