import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bareImports } from './bareImports';

const dist = join(__dirname, '..', 'dist');

function readDist(file: string): string {
  const path = join(dist, file);
  if (!existsSync(path)) {
    throw new Error(`${path} is missing; run npm run build first`);
  }
  return readFileSync(path, 'utf8');
}

describe('dist/worker.js', () => {
  it('with onnxruntime-web inlined, has no bare import a bundler-less host would have to resolve', async () => {
    readDist('worker.js');

    const found = await bareImports(join(dist, 'worker.js'));

    expect(found).toEqual([]);
  });
});

describe('dist/index.js', () => {
  it('after a build, carries the package version the asset URLs are built from', () => {
    const { version } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string };
    const main = readDist('index.js');

    const carried = /packageVersion["']?:\s*["']([^"']+)/.exec(main)?.[1];

    expect(carried).toBe(version);
  });

  it('with the default worker moved to its own subpath, never uses import.meta', () => {
    const main = readDist('index.js');

    const usesImportMeta = /import\.meta/.test(main);

    expect(usesImportMeta).toBe(false);
  });
});
