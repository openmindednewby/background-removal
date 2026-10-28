import { maskIoU } from './iou';

describe('maskIoU', () => {
  it('with half the foreground overlapping, returns intersection over union', () => {
    const predicted = [255, 255, 0, 0];
    const expected = [255, 0, 255, 0];

    const iou = maskIoU(predicted, expected);

    expect(iou).toBeCloseTo(1 / 3, 5);
  });

  it('with two empty masks, returns 1', () => {
    const predicted = [0, 0];
    const expected = [0, 0];

    const iou = maskIoU(predicted, expected);

    expect(iou).toBe(1);
  });

  it('with a value just under the 128 threshold, counts it as background', () => {
    const predicted = [127, 128];
    const expected = [255, 255];

    const iou = maskIoU(predicted, expected);

    expect(iou).toBe(0.5);
  });

  it('with masks of different length, throws RangeError', () => {
    const predicted = [0];
    const expected = [0, 0];

    const act = (): number => maskIoU(predicted, expected);

    expect(act).toThrow(RangeError);
  });
});
