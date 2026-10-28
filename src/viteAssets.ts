import { join } from 'node:path';

export interface BgRemovalUrls {
  modelUrl: string;
  runtimeBaseUrl: string;
}

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
const MODEL = 'modnet.onnx';
const EXTERN_WASM_ENTRY = 'ort.min.mjs';

export const DEFAULT_BASE_PATH = '/bg-removal/';

function folder(basePath: string): string {
  const trimmed = basePath.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '/' : `/${trimmed}/`;
}

/** Same-origin URLs of the model and onnxruntime files; the versions in the path make them cacheable forever. */
export function bgRemovalUrls(pkgVersion: string, ortVersion: string, basePath: string = DEFAULT_BASE_PATH): BgRemovalUrls {
  const base = folder(basePath);
  return { modelUrl: `${base}${pkgVersion}/${MODEL}`, runtimeBaseUrl: `${base}ort/${ortVersion}/` };
}

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
