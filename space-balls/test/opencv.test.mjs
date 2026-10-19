import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOpenCv } from '../tools/opencv.mjs';

test('OpenCV initializes, converts RGBA pixels, and detects an image difference', { timeout: 15_000 }, async () => {
  const [cv, sameRuntime] = await Promise.all([loadOpenCv(), loadOpenCv()]);
  assert.strictEqual(cv, sameRuntime);

  const rgba = cv.matFromArray(2, 2, cv.CV_8UC4, [
    255, 0, 0, 255,    0, 255, 0, 255,
    0, 0, 255, 255,    255, 255, 255, 255,
  ]);
  const gray = new cv.Mat();
  const expected = cv.matFromArray(2, 2, cv.CV_8UC1, [76, 150, 29, 255]);
  const difference = new cv.Mat();

  try {
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    assert.equal(gray.rows, 2);
    assert.equal(gray.cols, 2);
    assert.equal(gray.channels(), 1);
    assert.deepEqual([...gray.data], [76, 150, 29, 255]);

    cv.absdiff(gray, expected, difference);
    assert.equal(cv.countNonZero(difference), 0);

    expected.data[2] = 0;
    cv.absdiff(gray, expected, difference);
    assert.equal(cv.countNonZero(difference), 1);
    assert.deepEqual([...difference.data], [0, 0, 29, 0]);
  } finally {
    rgba.delete();
    gray.delete();
    expected.delete();
    difference.delete();
  }
});
