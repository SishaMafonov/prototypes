import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { CvTestTool, sampleVideoFrames } from '../tools/cv-test-tool/capture.ts';

let restore;
let videos;
let tracks;
let displayRequests;
let requestDisplay;
let frame;
let cropFails;

class FakeVideo {
  videoWidth = 4;
  videoHeight = 2;
  clock = -50;
  callbacks = new Map();
  callbackId = 0;
  running = true;
  pause() { this.paused = true; }
  remove() { this.removed = true; }
  setAttribute() {}
  style = {};
  async play() {}
  requestVideoFrameCallback(callback) {
    const id = ++this.callbackId;
    this.callbacks.set(id, callback);
    if (this.running) setImmediate(() => {
      if (!this.callbacks.delete(id)) return;
      this.clock += 50;
      callback(this.clock, { mediaTime: this.clock / 1000 });
    });
    return id;
  }
  cancelVideoFrameCallback(id) { this.callbacks.delete(id); }
}

function makeStream() {
  const track = new EventTarget();
  Object.assign(track, {
    readyState: 'live',
    stops: 0,
    getSettings: () => ({ displaySurface: 'browser' }),
    stop() { this.stops++; this.readyState = 'ended'; },
    async cropTo(target) {
      if (cropFails) throw new Error('Different tab');
      this.target = target;
    },
  });
  tracks.push(track);
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}

beforeEach(() => {
  restore = [];
  const replace = (name, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    restore.push(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    });
    Object.defineProperty(globalThis, name, { configurable: true, value });
  };
  videos = [];
  tracks = [];
  displayRequests = [];
  cropFails = false;
  requestDisplay = async () => makeStream();
  frame = { isConnected: true, getBoundingClientRect: () => ({ width: 4, height: 2 }) };
  replace('isSecureContext', true);
  replace('HTMLVideoElement', FakeVideo);
  replace('CropTarget', { fromElement: async element => ({ element }) });
  replace('navigator', { mediaDevices: { getDisplayMedia(options) {
    displayRequests.push(options);
    return requestDisplay();
  } } });
  replace('document', {
    body: { append() {} },
    createElement(tag) {
      if (tag === 'video') {
        const video = new FakeVideo();
        videos.push(video);
        return video;
      }
      let currentVideo;
      return { width: 0, height: 0, getContext: () => ({
        drawImage(video) { currentVideo = video; },
        getImageData(_x, _y, width, height) {
          return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(currentVideo.clock / 50) };
        },
      }) };
    },
  });
});

afterEach(() => restore.reverse().forEach(reset => reset()));

test('public capture path crops the iframe and retains five independent frames within one second', async () => {
  const tool = new CvTestTool(frame);
  try {
    const pending = tool.captureScreenshot({ count: 5 });
    // The permission request must happen synchronously, preserving click activation.
    assert.equal(displayRequests.length, 1);
    assert.equal(displayRequests[0].audio, false);
    assert.equal(displayRequests[0].preferCurrentTab, true);
    const result = await pending;
    assert.equal(tracks[0].target.element, frame);
    assert.equal(result.length, 5);
    assert.deepEqual(result.map(item => item.offsetMs), [0, 200, 400, 600, 800]);
    assert.ok(result.at(-1).offsetMs < 1000);
    assert.equal(result[0].imageData.data.length, 4 * 2 * 4);
    assert.notStrictEqual(result[0].imageData.data.buffer, result[1].imageData.data.buffer);
    assert.notDeepEqual(result[0].imageData.data, result[1].imageData.data);
    assert.strictEqual(tool.screenshots, result);
    assert.equal(tool.phase, 'ready');
    assert.equal(tool.sharing, true);

    const nextBatch = await tool.captureScreenshot({ count: 1 });
    assert.equal(displayRequests.length, 1, 'reuse the approved stream');
    assert.equal(nextBatch.length, 1);
    assert.strictEqual(tool.screenshots, nextBatch);
    assert.notStrictEqual(result, nextBatch);
    tool.clearScreenshots();
    assert.equal(tool.screenshots.length, 0);
  } finally { tool.stop(); }
  assert.equal(tracks[0].stops, 1);
  assert.equal(videos[0].srcObject, null);
  assert.equal(videos[0].removed, true);
});

test('invalid counts and overlapping captures do not open extra share pickers', async () => {
  const tool = new CvTestTool(frame);
  for (const count of [0, -1, 1.5, NaN, Infinity, 31, '5']) {
    await assert.rejects(tool.captureScreenshot({ count }), RangeError);
  }
  assert.equal(displayRequests.length, 0);
  let grant;
  requestDisplay = () => new Promise(resolve => { grant = resolve; });
  const first = tool.captureScreenshot({ count: 5 });
  await assert.rejects(tool.captureScreenshot({ count: 5 }), /already in progress/);
  assert.equal(displayRequests.length, 1);
  grant(makeStream());
  await first;
  tool.stop();
});

test('permission denial resets the tool so a later user gesture can retry', async () => {
  const tool = new CvTestTool(frame);
  requestDisplay = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  await assert.rejects(tool.captureScreenshot({ count: 5 }), { name: 'NotAllowedError' });
  assert.equal(tool.busy, false);
  assert.equal(tool.phase, 'idle');
  requestDisplay = async () => makeStream();
  await tool.captureScreenshot({ count: 5 });
  tool.stop();
});

test('wrong-tab cropping failure stops every track and saves no full-tab screenshot', async () => {
  const tool = new CvTestTool(frame);
  cropFails = true;
  await assert.rejects(tool.captureScreenshot({ count: 5 }), /own tab/);
  assert.equal(tracks[0].stops, 1);
  assert.equal(tool.sharing, false);
  assert.equal(tool.screenshots.length, 0);
  assert.equal(videos.length, 0);
});

test('canceling a pending permission request releases a stream that arrives later', async () => {
  const tool = new CvTestTool(frame);
  let grant;
  requestDisplay = () => new Promise(resolve => { grant = resolve; });
  const pending = tool.captureScreenshot({ count: 5 });
  tool.stop();
  grant(makeStream());
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(tracks[0].stops, 1);
  assert.equal(tool.busy, false);
  assert.equal(videos.length, 0);
});

test('ending sharing during a batch aborts it and preserves the last successful batch', async () => {
  const tool = new CvTestTool(frame);
  const completed = await tool.captureScreenshot({ count: 1 });
  videos[0].running = false;
  const pending = tool.captureScreenshot({ count: 5 });
  await Promise.resolve();
  tracks[0].readyState = 'ended';
  tracks[0].dispatchEvent(new Event('ended'));
  await assert.rejects(pending, { name: 'AbortError' });
  assert.strictEqual(tool.screenshots, completed);
  assert.equal(tool.sharing, false);
  assert.equal(videos[0].callbacks.size, 0);
});

test('sampling rejects slow streams and resizing instead of returning a misleading batch', async () => {
  const video = new FakeVideo();
  const request = video.requestVideoFrameCallback.bind(video);
  video.requestVideoFrameCallback = callback => request((_now, metadata) => callback(video.clock * 10, metadata));
  await assert.rejects(sampleVideoFrames(video, 5, new AbortController().signal), /exceeded one second/);
  assert.equal(video.callbacks.size, 0);

  const resizing = new FakeVideo();
  const requestResize = resizing.requestVideoFrameCallback.bind(resizing);
  resizing.requestVideoFrameCallback = callback => requestResize((now, metadata) => {
    if (now > 0) resizing.videoWidth = 8;
    callback(now, metadata);
  });
  await assert.rejects(sampleVideoFrames(resizing, 5, new AbortController().signal), /changed size/);
  assert.equal(resizing.callbacks.size, 0);
});

test('a stalled video times out and removes its pending frame callback', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const video = new FakeVideo();
  video.running = false;
  const pending = sampleVideoFrames(video, 5, new AbortController().signal);
  t.mock.timers.tick(5_000);
  await assert.rejects(pending, /No video frames/);
  assert.equal(video.callbacks.size, 0);
});
