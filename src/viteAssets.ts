import { join } from 'node:path';
import { bgRemovalUrls, bgRemovalWorkerUrl, DEFAULT_BASE_PATH, MODEL, WORKER } from './assetUrls';

export { bgRemovalUrls, bgRemovalWorkerUrl, DEFAULT_BASE_PATH } from './assetUrls';
export type { BgRemovalUrls } from './assetUrls';

export interface BgRemovalSource {
  pkgDir: string;
  ortDir: string;
  pkgVersion: string;
  ortVersion: string;
}

export interface AssetCopy {
  from: string;
  to: string;
}

const RUNTIME_FILE = /^ort-wasm-simd-threaded\.jsep\.(wasm|mjs)$/;
const EXTERN_WASM_ENTRY = 'ort.min.mjs';

/** Files copied into the build: the model plus the jsep runtime pair the worker loads. */
export function bgRemovalCopies(source: BgRemovalSource, ortListing: readonly string[], basePath: string = DEFAULT_BASE_PATH): AssetCopy[] {
  const urls = bgRemovalUrls(source.pkgVersion, source.ortVersion, basePath);
  const runtime = ortListing.filter((f) => RUNTIME_FILE.test(f)).map((f) => ({ from: join(source.ortDir, f), to: `${urls.runtimeBaseUrl.slice(1)}${f}` }));
  return [{ from: join(source.pkgDir, 'models', MODEL), to: urls.modelUrl.slice(1) }, ...runtime];
}

/** The onnxruntime entry that loads its wasm from wasmPaths, so no bundler copies a second wasm into assets/. */
export function externWasmEntry(ortDir: string): string {
  return join(ortDir, EXTERN_WASM_ENTRY);
}

/** The bundled worker copied next to the model, so a host without a bundler can start it. */
export function bgRemovalWorkerCopy(source: BgRemovalSource, basePath: string = DEFAULT_BASE_PATH): AssetCopy {
  return { from: join(source.pkgDir, 'dist', WORKER), to: bgRemovalWorkerUrl(source.pkgVersion, basePath).slice(1) };
}
