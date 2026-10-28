import { BrushMode } from './BrushMode';
import { paintDab, paintStroke, toMaskPoint } from './refine';

describe('paintDab', () => {
  it('with erase at the centre of a full mask, clears the five pixels inside radius 1 only', () => {
    const mask = { width: 5, height: 5, data: new Uint8ClampedArray(25).fill(255) };

    paintDab(mask, { x: 2, y: 2 }, 1, BrushMode.Erase);

    expect(Array.from(mask.data).flatMap((v, i) => (v === 0 ? [i] : []))).toEqual([7, 11, 12, 13, 17]);
  });

  it('with keep at a corner, fills inside the radius and clips at the edges', () => {
    const mask = { width: 3, height: 3, data: new Uint8ClampedArray(9) };

    paintDab(mask, { x: 0, y: 0 }, 1, BrushMode.Keep);

    expect(Array.from(mask.data)).toEqual([255, 255, 0, 255, 0, 0, 0, 0, 0]);
  });
});

describe('paintStroke', () => {
  it('with a horizontal drag, paints every pixel along the line', () => {
    const mask = { width: 10, height: 1, data: new Uint8ClampedArray(10) };

    paintStroke(mask, { x: 1, y: 0 }, { x: 8, y: 0 }, { radius: 0.5, mode: BrushMode.Keep });

    expect(Array.from(mask.data)).toEqual([0, 255, 255, 255, 255, 255, 255, 255, 255, 0]);
  });

  it('with the same start and end, paints one dab', () => {
    const mask = { width: 3, height: 1, data: new Uint8ClampedArray(3) };

    paintStroke(mask, { x: 1, y: 0 }, { x: 1, y: 0 }, { radius: 0.5, mode: BrushMode.Keep });

    expect(Array.from(mask.data)).toEqual([0, 255, 0]);
  });
});

describe('toMaskPoint', () => {
  it('with a canvas shown at half size and offset, maps the client point to mask pixels', () => {
    const rect = { left: 10, top: 20, width: 50, height: 25 };

    const point = toMaskPoint({ x: 35, y: 30 }, rect, { width: 100, height: 50 });

    expect(point).toEqual({ x: 50, y: 20 });
  });
});
