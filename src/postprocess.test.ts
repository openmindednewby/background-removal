import { ModelKind } from './ModelKind';
import { applyAlpha, normalizeMatte, resizeMatte } from './postprocess';

describe('normalizeMatte', () => {
  it('with modnet values outside 0..1, clamps them', () => {
    const raw = new Float32Array([-0.25, 0.5, 1.25]);

    const matte = normalizeMatte(ModelKind.Modnet, raw);

    expect(Array.from(matte)).toEqual([0, 0.5, 1]);
  });

  it('with u2netp values, rescales min..max to 0..1', () => {
    const raw = new Float32Array([2, 4, 6]);

    const matte = normalizeMatte(ModelKind.U2netp, raw);

    expect(Array.from(matte)).toEqual([0, 0.5, 1]);
  });

  it('with a flat u2netp output, returns all zeros', () => {
    const raw = new Float32Array([3, 3]);

    const matte = normalizeMatte(ModelKind.U2netp, raw);

    expect(Array.from(matte)).toEqual([0, 0]);
  });
});

describe('resizeMatte', () => {
  it('with the same size, converts 0..1 to 0..255 bytes', () => {
    const matte = new Float32Array([0, 1, 0.5, 1]);

    const alpha = resizeMatte(matte, { width: 2, height: 2 }, { width: 2, height: 2 });

    expect(Array.from(alpha)).toEqual([0, 255, 128, 255]);
  });

  it('with a 2x upscale of a left-black right-white matte, keeps the outer columns and blends the middle', () => {
    const matte = new Float32Array([0, 1]);

    const alpha = resizeMatte(matte, { width: 2, height: 1 }, { width: 4, height: 1 });

    expect(Array.from(alpha)).toEqual([0, 64, 191, 255]);
  });

  it('with a downscale of a uniform matte, keeps the value', () => {
    const matte = new Float32Array(16).fill(1);

    const alpha = resizeMatte(matte, { width: 4, height: 4 }, { width: 2, height: 2 });

    expect(Array.from(alpha)).toEqual([255, 255, 255, 255]);
  });
});

describe('applyAlpha', () => {
  it('with an alpha byte per pixel, replaces only the alpha channel in a copy', () => {
    const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    const alpha = new Uint8ClampedArray([0, 128]);

    const out = applyAlpha(rgba, alpha);

    expect([Array.from(out), rgba[3]]).toEqual([[10, 20, 30, 0, 40, 50, 60, 128], 255]);
  });

  it('with an alpha length that does not match, throws RangeError', () => {
    const rgba = new Uint8ClampedArray(8);
    const alpha = new Uint8ClampedArray(1);

    const act = (): Uint8ClampedArray => applyAlpha(rgba, alpha);

    expect(act).toThrow(RangeError);
  });
});
