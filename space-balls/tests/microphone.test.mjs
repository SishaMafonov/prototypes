import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { MicrophoneInput, voiceLoudness } from '../src/microphone.ts';

test('loudness gates room noise, scales with amplitude, and stays bounded', () => {
  const level = amplitude => voiceLoudness(new Float32Array(1024).fill(amplitude));
  assert.equal(level(0), 0);
  assert.equal(level(0.005), 0);
  assert.ok(level(0.04) > 0 && level(0.12) > level(0.04));
  assert.equal(level(0.8), 1);
  assert.equal(voiceLoudness(new Float32Array()), 0);
});

let originalNavigator;
let originalAudioContext;
let contexts;
let amplitude;
let request;

function streamFixture() {
  const listeners = {};
  const track = { stops: 0, stop() { this.stops++; }, addEventListener(type, handler) { listeners[type] = handler; } };
  return { track, listeners, getTracks: () => [track], getAudioTracks: () => [track] };
}

beforeEach(() => {
  originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  originalAudioContext = globalThis.AudioContext;
  contexts = [];
  amplitude = 0.1;
  request = async () => streamFixture();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    mediaDevices: { getUserMedia: constraints => request(constraints) },
  } });
  globalThis.AudioContext = class {
    state = 'suspended';
    closes = 0;
    onstatechange = null;
    constructor() { contexts.push(this); }
    async resume() { this.state = 'running'; }
    async close() { this.closes++; this.state = 'closed'; }
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createAnalyser() {
      return { fftSize: 0, getFloatTimeDomainData(samples) { samples.fill(amplitude); }, disconnect() {} };
    }
  };
});

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
  if (originalAudioContext) globalThis.AudioContext = originalAudioContext;
  else delete globalThis.AudioContext;
});

test('microphone reads and smooths loudness, then releases capture on stop', async () => {
  const stream = streamFixture();
  request = async constraints => {
    assert.equal(constraints.video, false);
    assert.equal(constraints.audio.autoGainControl, false);
    return stream;
  };
  const mic = new MicrophoneInput();
  await mic.enable();
  assert.equal(mic.state, 'active');
  const loud = mic.read(0.1);
  assert.ok(loud > 0);
  amplitude = 0;
  assert.ok(mic.read(0.2) < loud);
  mic.stop();
  assert.equal(stream.track.stops, 1);
  assert.equal(contexts[0].closes, 1);
  assert.equal(mic.read(1), 0);
  assert.equal(mic.state, 'off');
});

test('permission denial closes audio and reports a usable fallback state', async () => {
  request = async () => { throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }); };
  const mic = new MicrophoneInput();
  await mic.enable();
  assert.equal(mic.state, 'denied');
  assert.equal(contexts[0].closes, 1);
  assert.equal(mic.level, 0);
});

test('unsupported microphone APIs do not prevent play', async () => {
  delete navigator.mediaDevices;
  const mic = new MicrophoneInput();
  await mic.enable();
  assert.equal(mic.state, 'unavailable');
  assert.equal(contexts.length, 0);
});

test('a suspended audio context does not block the capture request', async () => {
  const stream = streamFixture();
  request = async () => stream;
  globalThis.AudioContext.prototype.resume = function () { return new Promise(() => {}); };
  const mic = new MicrophoneInput();
  await mic.enable();
  assert.equal(mic.state, 'paused');
  mic.stop();
  assert.equal(stream.track.stops, 1);
});

test('canceling a pending permission request stops any late stream', async () => {
  let resolve;
  request = () => new Promise(done => { resolve = done; });
  const mic = new MicrophoneInput();
  const pending = mic.enable();
  await Promise.resolve();
  assert.equal(mic.state, 'requesting');
  mic.stop();
  assert.equal(contexts[0].state, 'closed');
  const stream = streamFixture();
  resolve(stream);
  await pending;
  assert.equal(stream.track.stops, 1);
  assert.equal(mic.state, 'off');
});

test('late permission from an older request cannot replace a newer microphone', async () => {
  let resolveOld;
  const currentStream = streamFixture();
  request = () => new Promise(done => { resolveOld = done; });
  const mic = new MicrophoneInput();
  const oldRequest = mic.enable();
  await Promise.resolve();
  request = async () => currentStream;
  await mic.enable();
  const oldStream = streamFixture();
  resolveOld(oldStream);
  await oldRequest;
  assert.equal(oldStream.track.stops, 1);
  assert.equal(currentStream.track.stops, 0);
  assert.equal(mic.state, 'active');
  mic.stop();
});

test('disconnecting the microphone releases capture and clears loudness', async () => {
  const stream = streamFixture();
  request = async () => stream;
  const mic = new MicrophoneInput();
  await mic.enable();
  mic.read(0.1);
  stream.listeners.ended();
  assert.equal(mic.state, 'unavailable');
  assert.equal(mic.level, 0);
  assert.equal(stream.track.stops, 1);
});
