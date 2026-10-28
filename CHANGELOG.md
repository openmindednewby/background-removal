# Changelog

## 0.2.0

- Breaking (subpath move): the default worker (`new URL('./worker.js', import.meta.url)`) moved to `@dloizides/background-removal/default-worker`, which exports `createDefaultWorker` and a `createBackgroundRemover` that defaults `createWorker` to it. The main entry no longer uses `import.meta`, so Metro web can load it; its `createBackgroundRemover` now requires `createWorker`. Vite apps change one import path.
- New: `dist/worker.js` inlines onnxruntime-web (extern-wasm entry), so it has no bare import and can be served as a static file.
- New: `@dloizides/background-removal/assets` (no `vite` import) exports `installedAssetCopies`, `installedAssetUrls`, `copyBgRemovalAssets`, `bgRemovalWorkerUrl`, `bgRemovalWorkerCopy` and the existing copy-list helpers.
- New: `bg-removal-assets <outDir> [--base-path] [--urls-file]` CLI copies the model, runtime and worker for bundler-less hosts and writes `{ modelUrl, runtimeBaseUrl, workerUrl }`.
- `./vite` is unchanged.

## 0.1.1

- Fix: a failed WebGPU session no longer clears the session cache, so a WASM fallback keeps its model instead of downloading it again on every cut.
- Fix: a worker crash (`onerror`) or an unreadable reply (`onmessageerror`) rejects every pending `removeBackground` call instead of leaving it hanging.
- New: `@dloizides/background-removal/vite` exports `bgRemovalAssetsPlugin({ basePath })`. It serves and copies the model plus the jsep runtime pair under a versioned path, defines `__BG_REMOVAL_URLS__`, and aliases `onnxruntime-web` to its extern-wasm entry so no dead `assets/*.wasm` lands in the build.
- New: `BrushMode` is a runtime value (`BrushMode.Keep`, `BrushMode.Erase`), so apps no longer cast `'keep'` / `'erase'`.
- `vite` (>= 5) is an optional peer dependency, needed only for the `./vite` export.

## 0.1.0

- First release: MODNet / U2-Netp in a Web Worker, WebGPU with WASM fallback, alpha PNG + mask, keep/erase refine brush.
