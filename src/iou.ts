const DEFAULT_THRESHOLD = 128;

/** Intersection over union of two masks, each value counted as foreground at or above the threshold. */
export function maskIoU(predicted: ArrayLike<number>, expected: ArrayLike<number>, threshold = DEFAULT_THRESHOLD): number {
  if (predicted.length !== expected.length) {
    throw new RangeError('masks differ in length');
  }
  let intersection = 0;
  let union = 0;
  for (let index = 0; index < predicted.length; index += 1) {
    const inPredicted = (predicted[index] ?? 0) >= threshold;
    const inExpected = (expected[index] ?? 0) >= threshold;
    intersection += inPredicted && inExpected ? 1 : 0;
    union += inPredicted || inExpected ? 1 : 0;
  }
  return union === 0 ? 1 : intersection / union;
}
