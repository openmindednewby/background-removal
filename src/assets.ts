import { copyFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bgRemovalCopies, bgRemovalUrls, bgRemovalWorkerCopy, bgRemovalWorkerUrl, DEFAULT_BASE_PATH } from './viteAssets';
import type { AssetCopy, BgRemovalSource, BgRemovalUrls } from './viteAssets';

export { bgRemovalCopies, bgRemovalUrls, bgRemovalWorkerCopy, bgRemovalWorkerUrl, DEFAULT_BASE_PATH } from './viteAssets';
export type { AssetCopy, BgRemovalSource, BgRemovalUrls } from './viteAssets';

export interface BgRemovalAssetUrls extends BgRemovalUrls {
  workerUrl: string;
}

const versionOf = (dir: string): string => (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version: string }).version;

/** Where the installed package and onnxruntime-web live, with their versions. */
export function installedSource(): BgRemovalSource {
  const pkgDir = fileURLToPath(new URL('..', import.meta.url));
  const ortDir = dirname(createRequire(import.meta.url).resolve('onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm'));
  return { pkgDir, ortDir, pkgVersion: versionOf(pkgDir), ortVersion: versionOf(dirname(ortDir)) };
}

/** Same-origin URLs of the model, runtime and bundled worker for the installed versions. */
export function installedAssetUrls(basePath: string = DEFAULT_BASE_PATH): BgRemovalAssetUrls {
  const source = installedSource();
  return { ...bgRemovalUrls(source.pkgVersion, source.ortVersion, basePath), workerUrl: bgRemovalWorkerUrl(source.pkgVersion, basePath) };
}

/** Every file a bundler-less host serves: the model, the jsep runtime pair and the bundled worker. */
export function installedAssetCopies(basePath: string = DEFAULT_BASE_PATH): AssetCopy[] {
  const source = installedSource();
  return [...bgRemovalCopies(source, readdirSync(source.ortDir), basePath), bgRemovalWorkerCopy(source, basePath)];
}

/** Copies the model, runtime and worker into a static folder (Expo `public/`) and returns what it copied. */
export function copyBgRemovalAssets(outDir: string, basePath: string = DEFAULT_BASE_PATH): AssetCopy[] {
  const copies = installedAssetCopies(basePath);
  for (const c of copies) {
    const target = join(outDir, c.to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(c.from, target);
  }
  return copies;
}
