# @dloizides/background-removal

Cuts the background out of a photo in the browser. The photo never leaves the device: an
Apache-2.0 MODNet model runs in onnxruntime-web inside a Web Worker (WebGPU when the browser
has it, WASM otherwise). You get a transparent PNG, the alpha mask, and a keep/erase brush to
fix what the model missed.

## Use

```ts
import { createBackgroundRemover, attachRefineBrush, encodeCutout, BrushMode } from '@dloizides/background-removal';

const remover = createBackgroundRemover({
  modelUrl: '/bg-removal/0.1.0/modnet.onnx',
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

`createBackgroundRemover` starts `dist/worker.js` with
`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`. Vite: add the package
to `optimizeDeps.exclude`. Bundlers that cannot follow that pattern (Metro web) pass
`createWorker: () => new Worker('/bg-removal/worker.js', { type: 'module' })` and ship a bundled
copy of `@dloizides/background-removal/worker`.

## Measured quality (MODNet, Chromium, WASM)

IoU against the cut-outs in `test/fixtures` (threshold 128): couple 0.988, portrait 1 0.994,
portrait 2 0.993, portrait 3 0.992. A tight crop of hands on stone with no body in frame
scores 0.717; the refine brush is the fix for such crops. The same hands score 0.989 when the
model sees the whole photo, so cut first, crop after.

## Licences

Package code MIT. MODNet weights Apache-2.0 (ZHKKKe/MODNet), see `models/NOTICE.md`.
onnxruntime-web MIT.
