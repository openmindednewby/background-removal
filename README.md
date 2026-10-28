# @dloizides/background-removal

Cuts the background out of a photo in the browser. The photo never leaves the device: an
Apache-2.0 MODNet model runs in onnxruntime-web inside a Web Worker (WebGPU when the browser
has it, WASM otherwise). You get a transparent PNG, the alpha mask, and a keep/erase brush to
fix what the model missed.

## Use

```ts
import { attachRefineBrush, encodeCutout, BrushMode } from '@dloizides/background-removal';
import { createBackgroundRemover } from '@dloizides/background-removal/default-worker';

const remover = createBackgroundRemover({
  modelUrl: '/bg-removal/0.2.0/modnet.onnx',
  runtimeBaseUrl: '/bg-removal/ort/1.31.1/',
});

const cut = await remover.removeBackground(fileFromInput);
cut.png;        // Blob, image/png with alpha
cut.mask;       // { data: Uint8ClampedArray (one alpha byte per pixel), width, height }
cut.backend;    // 'webgpu' | 'wasm'

let mode = BrushMode.Erase;
const detach = attachRefineBrush(canvas, { mask: cut.mask, image: cut.image, getMode: () => mode, getRadius: () => 24 });
const refined = await encodeCutout(cut.image, cut.mask);
```

The model downloads on the first `removeBackground` call, not on import. Call it only when the
user presses "Remove background".

## Host the model and runtime on your own origin

No third-party CDN is contacted. Copy two things into the app's static output at build time:

| From | To (example) | Size |
|---|---|---|
| `node_modules/@dloizides/background-removal/models/modnet.onnx` | `/bg-removal/<pkg version>/modnet.onnx` | 25.9 MB |
| `node_modules/onnxruntime-web/dist/*.wasm` and `*.mjs` | `/bg-removal/ort/<ort version>/` | ~25 MB wasm, only the variant the browser picks is fetched |

Neither filename carries a content hash, so put the version in the path and serve both with
`Cache-Control: public, max-age=31536000, immutable`. Later cuts reuse the browser cache.
Serve the `.wasm` as `application/wasm`. Setting `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` on the page lets onnxruntime use WASM threads.

Vite does all of this with one plugin. It serves the files in dev, copies the model plus the jsep
runtime pair into the build, defines `__BG_REMOVAL_URLS__` (`{ modelUrl, runtimeBaseUrl }`), and
points `onnxruntime-web` at its extern-wasm entry so no unused `assets/*.wasm` is emitted:

```ts
import { bgRemovalAssetsPlugin } from '@dloizides/background-removal/vite';

export default defineConfig({ plugins: [bgRemovalAssetsPlugin({ basePath: '/bg-removal/' })] });
```

## Worker and bundlers

`dist/worker.js` is fully bundled: onnxruntime-web (its extern-wasm entry) is inlined, so the
file has no bare import and any host can serve it as a static module worker.

The main entry has no `import.meta`, so it loads under Metro web. Its `createBackgroundRemover`
needs `createWorker`. Two ways to give it one:

- **Vite and other bundlers that follow `new URL('./worker.js', import.meta.url)`** import
  `createBackgroundRemover` from `@dloizides/background-removal/default-worker`. It is the same
  function with `createWorker` defaulting to the bundled worker. In Vite, add the package to
  `optimizeDeps.exclude`.
- **Metro / Expo web (no Vite, no esbuild)** copy the assets with the CLI before the bundler runs
  and start the worker by URL:

```jsonc
// package.json
"scripts": { "prebuild": "bg-removal-assets public --urls-file src/bgRemovalUrls.json", "postinstall": "bg-removal-assets public --urls-file src/bgRemovalUrls.json" }
```

```ts
import { createBackgroundRemover } from '@dloizides/background-removal';
import urls from './bgRemovalUrls.json';

const remover = createBackgroundRemover({ ...urls, createWorker: () => new Worker(urls.workerUrl, { type: 'module' }) });
```

`bg-removal-assets <outDir> [--base-path /bg-removal/] [--urls-file <file.json>]` copies the model,
the jsep runtime pair and `worker.js` under versioned paths in `<outDir>` and writes
`{ modelUrl, runtimeBaseUrl, workerUrl }`. Git-ignore the copied folder and the urls file. The same
copy list is available in code from `@dloizides/background-removal/assets`
(`installedAssetCopies`, `installedAssetUrls`, `copyBgRemovalAssets`), which never imports `vite`.

## Measured quality (MODNet, Chromium, WASM)

IoU against the cut-outs in `test/fixtures` (threshold 128): couple 0.988, portrait 1 0.994,
portrait 2 0.993, portrait 3 0.992. A tight crop of hands on stone with no body in frame
scores 0.717; the refine brush is the fix for such crops. The same hands score 0.989 when the
model sees the whole photo, so cut first, crop after.

## Licences

Package code MIT. MODNet weights Apache-2.0 (ZHKKKe/MODNet), see `models/NOTICE.md`.
onnxruntime-web MIT.
