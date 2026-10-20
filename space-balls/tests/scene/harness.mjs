import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createContext, Script } from 'node:vm';
import { Window } from 'happy-dom';
import * as rules from '../../src/match.ts';
import * as planets from '../../src/planets.ts';
import { parse, read } from '../struct/graph.mjs';
import { CanvasScene } from './canvas.mjs';

const mainSource = read('src/main.ts');
function executable(text, path) {
  // Strip module boundaries only; execute the original function bodies and DOM markup.
  const declarations = parse(text, path).body;
  for (const declaration of [...declarations].reverse()) {
    if (declaration.type === 'ImportDeclaration') text = text.slice(0,declaration.start) + text.slice(declaration.end);
    else if (declaration.type === 'ExportNamedDeclaration') {
      assert.ok(declaration.declaration, 'Scene adapter needs a declaration export');
      text = text.slice(0,declaration.start) + text.slice(declaration.declaration.start);
    }
  }
  return stripTypeScriptTypes(text, { mode: 'strip' });
}

export function visible(element, window) {
  for (let node = element; node?.nodeType === 1; node = node.parentElement) {
    if (node.hidden || (node.localName === 'dialog' && !node.open) || window.getComputedStyle(node).display === 'none') return false;
  }
  return true;
}

function domTree(element, window) {
  return { kind: 'dom', tag: element.localName, id: element.id,
    classes: [...element.classList], attributes: Object.fromEntries([...element.attributes].map(a=>[a.name,a.value])),
    visible: visible(element, window), text: element.textContent.replace(/\s+/g,' ').trim(),
    children: [...element.children].map(child => domTree(child, window)) };
}

export function createGame({ width = 960, height = 540, dpr = 1, text = mainSource,
  missingApp = false, missingContext = false, secure = true } = {}) {
  const window = new Window({ url: secure ? 'https://scene.test/' : 'http://scene.test/', width, height });
  const document = window.document, recorder = new CanvasScene(), images = [], frames = new Map(), observers = [];
  let now = 0, nextFrame = 0, viewport = { width, height };
  const previewBounds = { left: width/2-60, top: height/2-100, width: 120, height: 160 };
  document.body.innerHTML = missingApp ? '' : '<div id="app"></div>';
  const style = document.createElement('style'); style.textContent = read('src/style.css'); document.head.append(style);
  window.devicePixelRatio = dpr;
  Object.defineProperty(window,'isSecureContext',{configurable:true,value:secure});
  window.HTMLElement.prototype.getBoundingClientRect = function() {
    const rect = this.matches('.planet-preview') ? previewBounds : { left: 0, top: 0, ...viewport };
    return { ...rect, right: rect.left+rect.width, bottom: rect.top+rect.height, x: rect.left, y: rect.top, toJSON() { return rect; } };
  };
  window.HTMLCanvasElement.prototype.getContext = () => missingContext ? null : recorder.context;
  const captures = new Set();
  window.HTMLElement.prototype.setPointerCapture = function(id) { captures.add(id); };
  const audio = { requests: [], contexts: [], tracks: [] };
  class FixtureAudioContext {
    state = 'suspended'; onstatechange = null; closes = 0;
    constructor() { audio.contexts.push(this); }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; this.closes++; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    createAnalyser() { return { fftSize: 0, getFloatTimeDomainData: samples => samples.fill(audio.amplitude ?? 0), disconnect() {} }; }
  }
  const navigator = { mediaDevices: { getUserMedia: options => new Promise((resolve,reject) => audio.requests.push({ options,resolve,reject })) } };
  audio.grant = () => {
    const track = new window.EventTarget();
    Object.assign(track, { stops: 0, stop() { this.stops++; } }); audio.tracks.push(track);
    audio.requests.at(-1).resolve({ getTracks: () => [track], getAudioTracks: () => [track] });
    return track;
  };
  class FixtureImage extends window.EventTarget {
    src = ''; complete = false; naturalWidth = 0; naturalHeight = 0;
    constructor() { super(); images.push(this); }
    load() {
      const bytes = readFileSync(new URL('../../'+this.src, import.meta.url));
      assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
      this.naturalWidth = bytes.readUInt32BE(16); this.naturalHeight = bytes.readUInt32BE(20); this.complete = true;
      this.dispatchEvent(new window.Event('load'));
    }
    fail() { this.complete = true; this.dispatchEvent(new window.Event('error')); }
  }
  class FixtureResizeObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() {}
  }
  const math = Object.create(Math); math.random = () => 0.5;
  const context = createContext({ window, document, navigator, AudioContext: FixtureAudioContext,
    HTMLButtonElement: window.HTMLButtonElement, Image: FixtureImage, ResizeObserver: FixtureResizeObserver,
    performance: { now: () => now }, Math: math,
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    ...rules, ...planets,
    backgroundUrl: 'src/assets/background.png', planetsUrl: 'src/assets/planets.png',
    ballUrl: 'src/assets/ball.png', tailUrl: 'src/assets/ball_tail.png' });
  const execute = (code, filename) => new Script(code, { filename }).runInContext(context, { timeout: 2000 });
  let bridge;
  try {
    execute(executable(read('src/microphone.ts'), 'src/microphone.ts'), 'scene/microphone.js');
    execute(executable(text, 'src/main.ts'), 'scene/main.js');
    bridge = execute(`({ render, resizeCanvas, syncMatchInterface, syncVoiceControls,
      get match() { return match; }, get state() { return state; }, get selectedPlanet() { return selectedPlanet; },
      get microphone() { return microphone; }, get playerDrive() { return playerDrive; } })`, 'scene/bridge.js');
  } catch(error) { window.happyDOM.abort(); window.close(); throw error; }
  const query = selector => { const node=document.querySelector(selector); assert.ok(node,`Missing scene node ${selector}`); return node; };
  const game = {
    window, document, recorder, images, audio, captures, previewBounds, bridge, observers,
    get viewport() { return { ...viewport }; },
    query, isVisible: selector => visible(query(selector), window),
    click: selector => query(selector).click(),
    event(target, type, fields = {}) {
      const event = new window.Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, fields); (typeof target === 'string' ? query(target) : target).dispatchEvent(event); return event;
    },
    load() { for (const image of images) if (!image.complete) image.load(); },
    tick(milliseconds = 16) {
      now += milliseconds;
      assert.equal(frames.size,1,'Expected exactly one animation loop');
      const [id, callback] = frames.entries().next().value; frames.delete(id); callback(now);
    },
    ready() { this.load(); this.click('.selection .confirm'); assert.equal(bridge.state,'ready'); },
    start() { this.ready(); this.click('.start'); this.tick(0); },
    play() { this.start(); for (let i=0;i<30;i++) this.tick(100); assert.equal(bridge.match.phase,'playing'); },
    snapshot() {
      recorder.reset(); bridge.render(); recorder.assertBalanced();
      const canvas = query('canvas'), ui = query('.interface');
      return { kind: 'scene', children: [recorder.root, domTree(ui, window)],
        commands: recorder.commands, canvas: { width: canvas.width, height: canvas.height },
        css: { ...viewport }, state: bridge.state, phase: bridge.match?.phase ?? null };
    },
    resize(nextWidth,nextHeight,nextDpr=window.devicePixelRatio) {
      viewport={width:nextWidth,height:nextHeight}; window.happyDOM.setViewport(viewport); window.devicePixelRatio=nextDpr;
      window.dispatchEvent(new window.Event('resize'));
    },
    close() { bridge.microphone.stop(); frames.clear(); window.happyDOM.abort(); window.close(); },
  };
  return game;
}

export const sprites = (scene, file) => scene.commands.filter(n => n.op==='drawImage' && n.image.endsWith('/'+file));
export const rings = scene => scene.commands.filter(n => n.op==='stroke' && n.path.length===1 && n.path[0].op==='arc' && n.path[0].args[3]===0 && n.path[0].args[4]===Math.PI*2);
export const nets = scene => scene.commands.filter(n => n.op==='strokeRect');
export const labels = scene => scene.commands.filter(n => n.op==='fillText');
export const sourceText = mainSource;
