export interface BgRemovalUrls {
  modelUrl: string;
  runtimeBaseUrl: string;
}

export interface AssetVersions {
  packageVersion: string;
  runtimeVersion: string;
}

export interface AssetLocations extends BgRemovalUrls {
  runtimeWasmUrl: string;
  workerUrl: string;
}

export const MODEL = 'modnet.onnx';
export const WORKER = 'worker.js';
export const RUNTIME_WASM = 'ort-wasm-simd-threaded.jsep.wasm';
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

/** Same-origin URL of the bundled worker, for hosts that start it by URL (Metro web). */
export function bgRemovalWorkerUrl(pkgVersion: string, basePath: string = DEFAULT_BASE_PATH): string {
  return `${folder(basePath)}${pkgVersion}/${WORKER}`;
}

/** Every asset URL under a path or full URL holding what `bg-removal-assets` copied. */
export function assetLocations(assetBaseUrl: string, versions: AssetVersions): AssetLocations {
  const origin = /^https?:\/\/[^/]+/.exec(assetBaseUrl)?.[0] ?? '';
  const basePath = assetBaseUrl.slice(origin.length);
  const urls = bgRemovalUrls(versions.packageVersion, versions.runtimeVersion, basePath);
  return {
    modelUrl: `${origin}${urls.modelUrl}`,
    runtimeBaseUrl: `${origin}${urls.runtimeBaseUrl}`,
    runtimeWasmUrl: `${origin}${urls.runtimeBaseUrl}${RUNTIME_WASM}`,
    workerUrl: `${origin}${bgRemovalWorkerUrl(versions.packageVersion, basePath)}`,
  };
}

export function absoluteUrl(url: string): string {
  return new URL(url, globalThis.location?.href).href;
}
