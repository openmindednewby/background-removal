const ASSET_CACHE_NAME = 'dloizides-bg-removal-v1';
const STALL_LIMIT_MS = 30_000;

export type BytesListener = (count: number) => void;

async function openAssetCache(): Promise<Cache | undefined> {
  if (typeof caches === 'undefined') {
    return undefined;
  }
  try {
    return await caches.open(ASSET_CACHE_NAME);
  } catch {
    return undefined;
  }
}

function concat(chunks: readonly Uint8Array[], size: number): Uint8Array<ArrayBuffer> {
  const whole = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    whole.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return whole;
}

async function readAll(response: Response, onChunk: () => void, onBytes: BytesListener): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (reader === undefined) {
    throw new Error(`download failed: empty body ${response.url}`);
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    chunks.push(next.value);
    size += next.value.byteLength;
    onChunk();
    onBytes(next.value.byteLength);
  }
  return concat(chunks, size);
}

function assertAsset(response: Response, url: string): void {
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${url}`);
  }
  if ((response.headers.get('content-type') ?? '').startsWith('text/html')) {
    throw new Error(`download failed: got a web page instead of ${url}`);
  }
}

async function download(url: string, onBytes: BytesListener): Promise<Uint8Array<ArrayBuffer>> {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), STALL_LIMIT_MS);
  const rearm = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), STALL_LIMIT_MS);
  };
  try {
    const response = await fetch(url, { signal: controller.signal });
    assertAsset(response, url);
    return await readAll(response, rearm, onBytes);
  } catch (error) {
    throw controller.signal.aborted ? new Error(`download stalled: ${url}`) : error;
  } finally {
    clearTimeout(timer);
  }
}

/** Bytes of an asset from the cache, or downloaded and cached; `onBytes` hears only network bytes. */
export async function loadAsset(url: string, onBytes: BytesListener): Promise<Uint8Array<ArrayBuffer>> {
  const cache = await openAssetCache();
  const hit = await cache?.match(url);
  if (hit !== undefined) {
    return new Uint8Array(await hit.arrayBuffer());
  }
  const bytes = await download(url, onBytes);
  await cache?.put(url, new Response(bytes)).catch(() => undefined);
  return bytes;
}

/** Drops every cached asset not listed, so an upgrade does not keep two copies on the phone. */
export async function evictOtherAssets(keep: readonly string[]): Promise<void> {
  const cache = await openAssetCache();
  if (cache === undefined) {
    return;
  }
  const stale = (await cache.keys()).filter((request) => !keep.includes(request.url));
  await Promise.all(stale.map((request) => cache.delete(request)));
}

/** True when every listed asset is already on this device. */
export async function hasCachedAssets(urls: readonly string[]): Promise<boolean> {
  const cache = await openAssetCache();
  if (cache === undefined) {
    return false;
  }
  const hits = await Promise.all(urls.map((url) => cache.match(url)));
  return hits.every((hit) => hit !== undefined);
}
