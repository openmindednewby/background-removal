import { join } from 'node:path';
import { bgRemovalCopies, bgRemovalUrls, externWasmEntry } from './viteAssets';

describe('bgRemovalUrls', () => {
  it('with package 0.1.0 and runtime 1.31.1, puts both versions in the paths', () => {
    const urls = bgRemovalUrls('0.1.0', '1.31.1');

    expect(urls).toEqual({ modelUrl: '/bg-removal/0.1.0/modnet.onnx', runtimeBaseUrl: '/bg-removal/ort/1.31.1/' });
  });

  it('with a custom base path missing its slashes, serves both files under that folder', () => {
    const urls = bgRemovalUrls('0.1.1', '1.31.1', 'static/cutout');

    expect(urls).toEqual({ modelUrl: '/static/cutout/0.1.1/modnet.onnx', runtimeBaseUrl: '/static/cutout/ort/1.31.1/' });
  });
});

describe('bgRemovalCopies', () => {
  it('with the runtime folder listing, copies the model and only the jsep runtime the worker loads, never plain, asyncify, jspi or maps', () => {
    const listing = ['ort.min.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.asyncify.wasm', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.jspi.wasm', 'ort.min.mjs.map'];

    const copies = bgRemovalCopies({ pkgDir: 'pkg', ortDir: 'ort', pkgVersion: '0.1.0', ortVersion: '1.31.1' }, listing);

    expect(copies.map((c) => c.to)).toEqual([
      'bg-removal/0.1.0/modnet.onnx',
      'bg-removal/ort/1.31.1/ort-wasm-simd-threaded.jsep.wasm',
      'bg-removal/ort/1.31.1/ort-wasm-simd-threaded.jsep.mjs',
    ]);
    expect(copies[0]?.from).toBe(join('pkg', 'models', 'modnet.onnx'));
  });

  it('with a custom base path, copies into that folder', () => {
    const listing = ['ort-wasm-simd-threaded.jsep.wasm'];

    const copies = bgRemovalCopies({ pkgDir: 'pkg', ortDir: 'ort', pkgVersion: '0.1.1', ortVersion: '1.31.1' }, listing, '/cutout/');

    expect(copies.map((c) => c.to)).toEqual(['cutout/0.1.1/modnet.onnx', 'cutout/ort/1.31.1/ort-wasm-simd-threaded.jsep.wasm']);
  });
});

describe('externWasmEntry', () => {
  it('with the runtime folder, points at the entry that loads wasm from wasmPaths', () => {
    const entry = externWasmEntry('ort');

    expect(entry).toBe(join('ort', 'ort.min.mjs'));
  });
});
