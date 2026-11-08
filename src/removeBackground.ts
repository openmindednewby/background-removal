import { hasCachedAssets } from './assetStore';
import { absoluteUrl, assetLocations } from './assetUrls';
import { buildInfo } from './buildInfo';
import { createBackgroundRemover } from './client';
import type { DownloadProgress } from './protocol';

export interface BackgroundAssetOptions {
  assetBaseUrl: string;
}

export interface RemoveBackgroundOptions extends BackgroundAssetOptions {
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  preferWebGpu?: boolean;
  createWorker?: () => Worker;
}

/** Cuts the background out of a photo on this device; the assets download on the first call, then come from the cache. */
export async function removeBackground(image: Blob, options: RemoveBackgroundOptions): Promise<Blob> {
  const { signal, onProgress, preferWebGpu, createWorker } = options;
  if (signal?.aborted === true) {
    throw new Error('background removal aborted');
  }
  const build = buildInfo();
  const { workerUrl, ...urls } = assetLocations(options.assetBaseUrl, build);
  const remover = createBackgroundRemover({
    ...urls,
    preferWebGpu,
    downloadBytes: build.downloadBytes,
    createWorker: createWorker ?? ((): Worker => new Worker(workerUrl, { type: 'module' })),
  });
  const abort = (): void => remover.dispose();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    return (await remover.removeBackground(image, { onProgress })).png;
  } finally {
    signal?.removeEventListener('abort', abort);
    remover.dispose();
  }
}

/** True when `removeBackground` will not download anything. */
export function isBackgroundRemovalDownloaded(options: BackgroundAssetOptions): Promise<boolean> {
  const { modelUrl, runtimeWasmUrl } = assetLocations(options.assetBaseUrl, buildInfo());
  return hasCachedAssets([absoluteUrl(modelUrl), absoluteUrl(runtimeWasmUrl)]).catch(() => false);
}
