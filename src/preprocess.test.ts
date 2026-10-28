import { ModelKind } from './ModelKind';
import { modelInputSize, toInputTensor } from './preprocess';

describe('modelInputSize', () => {
  it('with u2netp, returns the fixed 320 square', () => {
    const source = { width: 1000, height: 700 };

    const size = modelInputSize(ModelKind.U2netp, source);

    expect(size).toEqual({ width: 320, height: 320 });
  });

  it('with a large portrait for modnet, scales the short side to 512 and snaps to 32', () => {
    const source = { width: 1000, height: 1500 };

    const size = modelInputSize(ModelKind.Modnet, source);

    expect(size).toEqual({ width: 512, height: 768 });
  });

  it('with a small image for modnet, scales up so the short side is 512', () => {
    const source = { width: 256, height: 300 };

    const size = modelInputSize(ModelKind.Modnet, source);

    expect(size).toEqual({ width: 512, height: 576 });
  });

  it('with an exact 512 square for modnet, keeps the size', () => {
    const source = { width: 512, height: 512 };

    const size = modelInputSize(ModelKind.Modnet, source);

    expect(size).toEqual({ width: 512, height: 512 });
  });
});

describe('toInputTensor', () => {
  it('with modnet and a white then black pixel, maps channels to +1 and -1 in CHW order', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);

    const tensor = toInputTensor(ModelKind.Modnet, rgba, { width: 2, height: 1 });

    expect(Array.from(tensor)).toEqual([1, -1, 1, -1, 1, -1]);
  });

  it('with u2netp, divides by the brightest channel then applies the ImageNet mean and std', () => {
    const rgba = new Uint8ClampedArray([100, 50, 0, 255]);

    const tensor = toInputTensor(ModelKind.U2netp, rgba, { width: 1, height: 1 });

    expect([tensor[0], tensor[1], tensor[2]].map((v) => Number(v.toFixed(4)))).toEqual([
      Number(((1 - 0.485) / 0.229).toFixed(4)),
      Number(((0.5 - 0.456) / 0.224).toFixed(4)),
      Number(((0 - 0.406) / 0.225).toFixed(4)),
    ]);
  });

  it('with u2netp and an all-black image, does not divide by zero', () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255]);

    const tensor = toInputTensor(ModelKind.U2netp, rgba, { width: 1, height: 1 });

    expect(tensor[0]).toBeCloseTo(-0.485 / 0.229, 5);
  });

  it('with a pixel count that does not match the size, throws RangeError', () => {
    const rgba = new Uint8ClampedArray(4);

    const act = (): Float32Array => toInputTensor(ModelKind.Modnet, rgba, { width: 2, height: 1 });

    expect(act).toThrow(RangeError);
  });
});
