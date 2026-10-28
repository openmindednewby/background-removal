import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = '.e2e-build';

export default async function globalSetup(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  await build({
    entryPoints: { harness: 'e2e/harness.ts', worker: 'src/worker.ts' },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    outdir: OUT_DIR,
    logLevel: 'error',
  });
  writeFileSync(`${OUT_DIR}/index.html`, '<!doctype html><html><head><title>bgr</title></head><body><script type="module" src="/harness.js"></script></body></html>');
}
