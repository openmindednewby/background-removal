import { evictOtherAssets, hasCachedAssets, loadAsset } from './assetStore';

const URL_A = 'https://host.test/a';
const URL_B = 'https://host.test/b';

class FakeCache {
  entries = new Map<string, Response>();

  match(url: string): Promise<Response | undefined> {
    return Promise.resolve(this.entries.get(url)?.clone());
  }

  put(url: string, response: Response): Promise<void> {
    this.entries.set(url, response);
    return Promise.resolve();
  }

  keys(): Promise<Array<{ url: string }>> {
    return Promise.resolve([...this.entries.keys()].map((url) => ({ url })));
  }

  delete(request: { url: string }): Promise<boolean> {
    return Promise.resolve(this.entries.delete(request.url));
  }
}

function installCache(): FakeCache {
  const cache = new FakeCache();
  Object.assign(globalThis, { caches: { open: () => Promise.resolve(cache) } });
  return cache;
}

function installFetch(respond: () => Response): jest.Mock {
  const fetchMock = jest.fn(async () => respond());
  Object.assign(globalThis, { fetch: fetchMock });
  return fetchMock;
}

afterEach(() => {
  delete (globalThis as { caches?: unknown }).caches;
  jest.useRealTimers();
});

describe('loadAsset', () => {
  it('on a first call, reports the bytes and caches them', async () => {
    const cache = installCache();
    installFetch(() => new Response(new Uint8Array(6)));
    const onBytes = jest.fn();

    const bytes = await loadAsset(URL_A, onBytes);

    expect(bytes).toHaveLength(6);
    expect(onBytes.mock.calls.reduce((sum: number, [count]: number[]) => sum + (count ?? 0), 0)).toBe(6);
    expect(cache.entries.has(URL_A)).toBe(true);
  });

  it('with the asset cached, takes it from the cache without touching the network', async () => {
    const cache = installCache();
    cache.entries.set(URL_A, new Response(new Uint8Array(6)));
    const fetchMock = installFetch(() => new Response(new Uint8Array(1)));
    const onBytes = jest.fn();

    const bytes = await loadAsset(URL_A, onBytes);

    expect(bytes).toHaveLength(6);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onBytes).not.toHaveBeenCalled();
  });

  it('with no cache storage in this browser, still returns the bytes', async () => {
    installFetch(() => new Response(new Uint8Array(3)));

    const bytes = await loadAsset(URL_A, () => undefined);

    expect(bytes).toHaveLength(3);
  });

  it('with a storage quota error on write, still returns the bytes', async () => {
    const cache = installCache();
    cache.put = (): Promise<void> => Promise.reject(new Error('quota'));
    installFetch(() => new Response(new Uint8Array(3)));

    const bytes = await loadAsset(URL_A, () => undefined);

    expect(bytes).toHaveLength(3);
  });

  it('with a 404, rejects and caches nothing', async () => {
    const cache = installCache();
    installFetch(() => new Response('', { status: 404 }));

    const failure = loadAsset(URL_A, () => undefined);

    await expect(failure).rejects.toThrow('404');
    expect(cache.entries.size).toBe(0);
  });

  it('with an SPA fallback page answering 200, rejects and caches nothing', async () => {
    const cache = installCache();
    installFetch(() => new Response('<html></html>', { headers: { 'content-type': 'text/html; charset=utf-8' } }));

    const failure = loadAsset(URL_A, () => undefined);

    await expect(failure).rejects.toThrow('web page');
    expect(cache.entries.size).toBe(0);
  });

  it('with a server that stops answering, gives up at the stall limit', async () => {
    jest.useFakeTimers();
    const hang = (_url: string, init: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    Object.assign(globalThis, { fetch: hang });
    const pending = loadAsset(URL_A, () => undefined).catch((error: Error) => error.message);

    await jest.advanceTimersByTimeAsync(30_000);

    await expect(pending).resolves.toContain('stalled');
  });
});

describe('evictOtherAssets', () => {
  it('with an older version cached, keeps only the listed assets', async () => {
    const cache = installCache();
    cache.entries.set(URL_A, new Response('new'));
    cache.entries.set(URL_B, new Response('old'));

    await evictOtherAssets([URL_A]);

    expect([...cache.entries.keys()]).toEqual([URL_A]);
  });

  it('with no cache storage, does nothing', async () => {
    const result = evictOtherAssets([URL_A]);

    await expect(result).resolves.toBeUndefined();
  });
});

describe('hasCachedAssets', () => {
  it('with every asset cached, is true', async () => {
    const cache = installCache();
    cache.entries.set(URL_A, new Response('a'));
    cache.entries.set(URL_B, new Response('b'));

    const found = await hasCachedAssets([URL_A, URL_B]);

    expect(found).toBe(true);
  });

  it('with one asset missing, is false', async () => {
    const cache = installCache();
    cache.entries.set(URL_A, new Response('a'));

    const found = await hasCachedAssets([URL_A, URL_B]);

    expect(found).toBe(false);
  });

  it('with no cache storage, is false', async () => {
    const found = await hasCachedAssets([URL_A]);

    expect(found).toBe(false);
  });
});
