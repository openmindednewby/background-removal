import { copyFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { installedSource } from './assets';
import { bgRemovalCopies, bgRemovalUrls, externWasmEntry } from './viteAssets';

export { bgRemovalCopies, bgRemovalUrls, DEFAULT_BASE_PATH, externWasmEntry } from './viteAssets';
export type { AssetCopy, BgRemovalSource, BgRemovalUrls } from './viteAssets';

export interface BgRemovalAssetsOptions {
  /** URL folder the versioned model and runtime are served under; defaults to `/bg-removal/`. */
  basePath?: string;
}

/** Serves the model and jsep runtime from your origin in dev, copies them into the build. */
export function bgRemovalAssetsPlugin(options: BgRemovalAssetsOptions = {}): Plugin {
  const source = installedSource();
  const urls = bgRemovalUrls(source.pkgVersion, source.ortVersion, options.basePath);
  const copies = bgRemovalCopies(source, readdirSync(source.ortDir), options.basePath);
  const byUrl = new Map(copies.map((c) => [`/${c.to}`, c.from]));
  let outDir = 'dist';
  return {
    name: 'bg-removal-assets',
    config: () => ({
      define: { __BG_REMOVAL_URLS__: JSON.stringify(urls) },
      resolve: { alias: [{ find: /^onnxruntime-web$/, replacement: normalizePath(externWasmEntry(source.ortDir)) }] },
    }),
    configResolved: (config): void => {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer: (server): void => {
      server.middlewares.use((req, res, next) => {
        const file = byUrl.get(req.url ?? '');
        if (file === undefined) {
          return next();
        }
        if (file.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        res.end(readFileSync(file));
      });
    },
    writeBundle: (): void => {
      for (const c of copies) {
        const target = join(outDir, c.to);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(c.from, target);
      }
    },
  };
}
