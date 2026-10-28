# Changelog

## 0.1.1

- Fix: a failed WebGPU session no longer clears the session cache, so a WASM fallback keeps its model instead of downloading it again on every cut.
- Fix: a worker crash (`onerror`) or an unreadable reply (`onmessageerror`) rejects every pending `removeBackground` call instead of leaving it hanging.
- New: `@dloizides/background-removal/vite` exports `bgRemovalAssetsPlugin({ basePath })`. It serves and copies the model plus the jsep runtime pair under a versioned path, defines `__BG_REMOVAL_URLS__`, and aliases `onnxruntime-web` to its extern-wasm entry so no dead `assets/*.wasm` lands in the build.
- New: `BrushMode` is a runtime value (`BrushMode.Keep`, `BrushMode.Erase`), so apps no longer cast `'keep'` / `'erase'`.
- `vite` (>= 5) is an optional peer dependency, needed only for the `./vite` export.

## 0.1.0

- First release: MODNet / U2-Netp in a Web Worker, WebGPU with WASM fallback, alpha PNG + mask, keep/erase refine brush.
