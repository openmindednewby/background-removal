import { assetLocations, bgRemovalUrls, bgRemovalWorkerUrl } from './assetUrls';

const VERSIONS = { packageVersion: '1.0.0', runtimeVersion: '2.0.0' };

describe('assetLocations', () => {
  it('with a path, matches the layout the copy tools write', () => {
    const copied = bgRemovalUrls('1.0.0', '2.0.0', '/assets/cut/');

    const found = assetLocations('/assets/cut/', VERSIONS);

    expect(found.modelUrl).toBe(copied.modelUrl);
    expect(found.runtimeBaseUrl).toBe(copied.runtimeBaseUrl);
    expect(found.workerUrl).toBe(bgRemovalWorkerUrl('1.0.0', '/assets/cut/'));
  });

  it('with a full URL and no trailing slash, keeps the origin on every location', () => {
    const found = assetLocations('https://host.test/cut', VERSIONS);

    expect(found).toEqual({
      modelUrl: 'https://host.test/cut/1.0.0/modnet.onnx',
      runtimeBaseUrl: 'https://host.test/cut/ort/2.0.0/',
      runtimeWasmUrl: 'https://host.test/cut/ort/2.0.0/ort-wasm-simd-threaded.jsep.wasm',
      workerUrl: 'https://host.test/cut/1.0.0/worker.js',
    });
  });
});
