import './style.css';
import { CvTestTool, MAX_FRAME_COUNT, type CaptureOptions } from './capture';
import { loadOpenCv } from '../opencv.mjs';
import { SuiteControls } from './suite-controls';

// Initialize the same pinned WASM runtime used by the Node.js tooling.
void loadOpenCv().then(cv => {
  const version = cv.getBuildInformation().match(/General configuration for OpenCV (\S+)/)?.[1];
  if (!version) throw new Error('OpenCV runtime did not report its version.');
  console.info(`[cvTestTool] OpenCV ${version} loaded | repository commit ${__REPOSITORY_COMMIT__}`);
}).catch(error => {
  console.error('[cvTestTool] OpenCV failed to initialize:', error);
});

function element<T extends HTMLElement>(selector: string) {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing harness element: ${selector}`);
  return found;
}

const frame = element<HTMLIFrameElement>('#preview');
const capture = element<HTMLButtonElement>('#capture');
const stop = element<HTMLButtonElement>('#stop');
const reload = element<HTMLButtonElement>('#reload');
const clear = element<HTMLButtonElement>('#clear');
const count = element<HTMLInputElement>('#count');
const status = element('#status');
const frames = element('#frames');
const emptyState = frames.innerHTML;
const tool = new CvTestTool(frame);
let frameReady = false;
let renderedFrames = tool.screenshots;
let currentStory = '';

// Publish a small, stable API; capture controls share the same implementation.
function captureScreenshots(options: CaptureOptions) {
    if (!frameReady) return Promise.reject(new Error('Wait for the preview to load before capturing.'));
    status.classList.remove('error');
    frame.scrollIntoView({ block: 'center', behavior: 'instant' });
    const pending = tool.captureScreenshot(options);
    return pending.then(result => {
      const duration = result.at(-1)!.offsetMs;
      status.textContent = `${result.length} frames captured in ${Math.round(duration)} ms. Pixels are available in window.cvTestTool.screenshots.`;
      return result;
    }).catch(error => {
      status.classList.add('error');
      status.textContent = error instanceof Error ? error.message : String(error);
      throw error;
    });
}
const suiteControls = new SuiteControls(frame, tool, () => currentStory, captureScreenshots, () => frameReady, render);
window.cvTestTool = Object.freeze({
  captureScreenshot: (options: CaptureOptions) => suiteControls.busy
    ? Promise.reject(new Error('A visual suite is in progress.')) : captureScreenshots(options),
  get screenshots() { return tool.screenshots; },
  runRequirement: (id: string) => suiteControls.runRequirement(id),
  runSuite: (id?: string) => suiteControls.runSuite(id),
  get results() { return Object.fromEntries(suiteControls.runner.results); },
});

function render() {
  const busy = tool.busy || suiteControls.busy;
  capture.disabled = !frameReady || busy;
  reload.disabled = busy;
  count.disabled = busy;
  clear.disabled = !tool.screenshots.length || busy;
  stop.disabled = !tool.sharing && !busy;
  element('#state').textContent = ({ idle: 'Idle', requesting: 'Choose this tab', capturing: 'Capturing', ready: 'Sharing preview' })[tool.phase];
  element('#state').classList.toggle('active', tool.sharing);
  document.querySelectorAll<HTMLAnchorElement>('.story-link').forEach(link => link.setAttribute('aria-disabled', String(busy)));
  if (tool.phase === 'requesting') status.textContent = 'Select this capture workspace’s tab in the browser share picker.';
  if (tool.phase === 'capturing') status.textContent = 'Sampling video frames. Keep the preview visible and its size fixed…';
  if (renderedFrames === tool.screenshots) return;
  renderedFrames = tool.screenshots;
  element('#frame-count').textContent = String(renderedFrames.length);
  if (!renderedFrames.length) {
    frames.innerHTML = emptyState;
    element('#batch-summary').textContent = 'Ready for your first capture';
    return;
  }
  frames.replaceChildren();
  const scratch = document.createElement('canvas');
  let bytes = 0;
  renderedFrames.forEach((screenshot, index) => {
    const { imageData, offsetMs } = screenshot;
    bytes += imageData.data.byteLength;
    scratch.width = imageData.width;
    scratch.height = imageData.height;
    scratch.getContext('2d')!.putImageData(imageData, 0, 0);
    const thumbnail = document.createElement('canvas');
    thumbnail.width = 240;
    thumbnail.height = Math.round(240 * imageData.height / imageData.width);
    thumbnail.getContext('2d')!.drawImage(scratch, 0, 0, thumbnail.width, thumbnail.height);
    thumbnail.setAttribute('role', 'img');
    thumbnail.setAttribute('aria-label', `Frame ${index + 1} at ${Math.round(offsetMs)} milliseconds`);
    const figure = document.createElement('figure');
    const caption = document.createElement('figcaption');
    caption.innerHTML = `<strong>${String(index + 1).padStart(2, '0')}</strong><span>+${Math.round(offsetMs)} ms</span>`;
    figure.append(thumbnail, caption);
    frames.append(figure);
  });
  scratch.width = scratch.height = 0;
  const first = renderedFrames[0].imageData;
  element('#batch-summary').textContent = `${first.width} × ${first.height} px · ${(bytes / 1024 ** 2).toFixed(1)} MB in memory · latest batch`;
}

tool.addEventListener('change', render);
capture.addEventListener('click', () => {
  if (!count.reportValidity()) return;
  // No await before invoking the API: preserve transient user activation.
  void window.cvTestTool.captureScreenshot({ count: Number(count.value) }).catch(() => {});
});
count.max = String(MAX_FRAME_COUNT);
stop.addEventListener('click', () => { suiteControls.cancel(); tool.stop(); status.textContent = 'Sharing stopped. Captured frames remain in memory.'; });
clear.addEventListener('click', () => { tool.clearScreenshots(); status.textContent = 'Frames cleared from the workspace.'; });

const stories = {
  'space-balls': { title: 'Space Balls', path: '../../index.html', label: '/index.html' },
  motion: { title: 'Motion study', path: './fixtures/motion.html', label: '/tools/cv-test-tool/fixtures/motion.html' },
};
function loadStory() {
  const id = Object.hasOwn(stories, location.hash.slice(1)) ? location.hash.slice(1) as keyof typeof stories : 'space-balls';
  if (tool.busy || suiteControls.busy) { history.replaceState(null, '', `#${currentStory}`); return; }
  const story = stories[id];
  currentStory = id;
  suiteControls.onStoryChanged();
  tool.stop();
  tool.clearScreenshots();
  frameReady = false;
  status.classList.remove('error');
  status.textContent = 'Loading preview…';
  element('#story-title').textContent = story.title;
  element('#story-path').textContent = story.label;
  frame.title = `${story.title} test page`;
  document.querySelectorAll<HTMLAnchorElement>('.story-link').forEach(link => {
    if (link.dataset.story === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  frame.src = new URL(story.path, location.href).href;
  render();
}
frame.addEventListener('load', () => {
  frameReady = true;
  suiteControls.refresh();
  status.textContent = 'Preview ready. Capture 5 frames to start a sequence.';
  render();
});
reload.addEventListener('click', loadStory);
window.addEventListener('hashchange', loadStory);
window.addEventListener('pagehide', () => tool.stop());
document.querySelectorAll<HTMLAnchorElement>('.story-link, .brand').forEach(link => link.addEventListener('click', event => {
  if (tool.busy || suiteControls.busy) event.preventDefault();
}));
new ResizeObserver(() => {
  const bounds = frame.getBoundingClientRect();
  element('#dimensions').textContent = `${Math.round(bounds.width)} × ${Math.round(bounds.height)}`;
}).observe(frame);
loadStory();
