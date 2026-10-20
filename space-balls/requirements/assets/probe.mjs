import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadOpenCv } from '../../tools/opencv.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const decoded = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-File', join(directory, 'decode.ps1')],
  { encoding: 'utf8', maxBuffer: 64 * 1024 ** 2 }));
const cv = await loadOpenCv();
for (const [index, entry] of decoded.entries()) {
  const owned = [];
  const own = mat => { owned.push(mat); return mat; };
  try {
    const raw = own(cv.matFromArray(entry.height, entry.width, cv.CV_8UC4, Buffer.from(entry.rgba, 'base64')));
    const rawMask = own(cv.matFromArray(entry.height, entry.width, cv.CV_8UC4, Buffer.from(entry.mask, 'base64')));
    const gray = own(new cv.Mat()), mask = own(new cv.Mat());
    cv.cvtColor(raw, gray, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(rawMask, mask, cv.COLOR_RGBA2GRAY);
    assert.ok(mask.data.every(value => value === 0 || value === 255), 'binary mask');
    assert.ok(cv.countNonZero(mask) > 100, 'nonempty core mask');
    const template = own(new cv.Mat()), smallMask = own(new cv.Mat());
    const width = 48, height = entry.id === 'asteroid' ? 48 : 64;
    cv.resize(gray, template, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
    cv.resize(mask, smallMask, new cv.Size(width, height), 0, 0, cv.INTER_NEAREST);
    const wrongEntry = decoded[(index + 1) % decoded.length];
    const wrongRaw = own(cv.matFromArray(wrongEntry.height, wrongEntry.width, cv.CV_8UC4,
      Buffer.from(wrongEntry.rgba, 'base64')));
    const wrongGray = own(new cv.Mat()), wrong = own(new cv.Mat());
    cv.cvtColor(wrongRaw, wrongGray, cv.COLOR_RGBA2GRAY);
    cv.resize(wrongGray, wrong, new cv.Size(width, height), 0, 0, cv.INTER_AREA);
    for (const flip of [false, true]) {
      const candidate = own(new cv.Mat()), candidateMask = own(new cv.Mat());
      if (flip) { cv.flip(template, candidate, 1); cv.flip(smallMask, candidateMask, 1); }
      else { template.copyTo(candidate); smallMask.copyTo(candidateMask); }
      const scene = own(new cv.Mat(height + 40, width + 50, cv.CV_8UC1, new cv.Scalar(31)));
      const roi = own(scene.roi(new cv.Rect(17, 13, width, height)));
      candidate.copyTo(roi, candidateMask);
      const result = own(new cv.Mat());
      cv.matchTemplate(scene, candidate, result, cv.TM_SQDIFF_NORMED, candidateMask);
      assert.ok(result.data32F.every(Number.isFinite), 'finite score map');
      const best = cv.minMaxLoc(result);
      assert.ok(best.minVal < 0.001, entry.id + ' exact synthetic match');
      assert.deepEqual(best.minLoc, { x: 17, y: 13 });
      const blank = own(new cv.Mat(height + 40, width + 50, cv.CV_8UC1, new cv.Scalar(31)));
      cv.matchTemplate(blank, candidate, result, cv.TM_SQDIFF_NORMED, candidateMask);
      assert.ok(result.data32F.every(Number.isFinite));
      assert.ok(cv.minMaxLoc(result).minVal > 0.12, entry.id + ' blank negative control');
      wrong.copyTo(roi, candidateMask);
      cv.matchTemplate(scene, candidate, result, cv.TM_SQDIFF_NORMED, candidateMask);
      assert.ok(result.data32F.every(Number.isFinite));
      assert.ok(cv.minMaxLoc(result).minVal > 0.03, entry.id + ' wrong-art negative control');
    }
    console.log(entry.id + ': PNG/mask, resize, flip, planted match, blank/wrong-art controls OK');
  } finally { owned.reverse().forEach(mat => mat.delete()); }
}
console.log('Synthetic compatibility verified; live thresholds remain uncalibrated.');
