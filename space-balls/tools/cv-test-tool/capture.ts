export const CAPTURE_WINDOW_MS = 1_000;
export const MAX_FRAME_COUNT = 30;

export interface CapturedScreenshot {
  /** Independent RGBA pixels, suitable for cv.matFromImageData(). */
  readonly imageData: ImageData;
  /** Milliseconds since the first screenshot in this batch. */
  readonly offsetMs: number;
  /** Timestamp on the performance.now() clock. */
  readonly timestampMs: number;
  /** Position in the captured video, in seconds. */
  readonly mediaTime: number;
}

export interface CaptureOptions {
  count: number;
}

export interface CvTestToolApi {
  captureScreenshot(options: CaptureOptions): Promise<readonly CapturedScreenshot[]>;
  readonly screenshots: readonly CapturedScreenshot[];
  runRequirement(id: string): Promise<import('./vision/types').Result>;
  runSuite(id?: string): Promise<import('./vision/types').Result[]>;
  readonly results: Readonly<Record<string, import('./vision/types').Result>>;
}

declare global {
  interface Window {
    cvTestTool: CvTestToolApi;
  }
}

type CropTrack = MediaStreamTrack & { cropTo?: (target: unknown) => Promise<void> };
type CropApi = { fromElement(element: Element): Promise<unknown> };
type DisplayOptions = DisplayMediaStreamOptions & {
  preferCurrentTab: boolean;
  selfBrowserSurface: 'include';
  surfaceSwitching: 'exclude';
  monitorTypeSurfaces: 'exclude';
};

function validateCount(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > MAX_FRAME_COUNT) {
    throw new RangeError(`count must be an integer between 1 and ${MAX_FRAME_COUNT}.`);
  }
}

/** Sample presented video frames at evenly spaced offsets within one second. */
export function sampleVideoFrames(video: HTMLVideoElement, count: number, signal: AbortSignal, onSample?: (screenshot: CapturedScreenshot) => void) {
  validateCount(count);
  signal.throwIfAborted();
  return new Promise<CapturedScreenshot[]>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) { reject(new Error('A 2D canvas context is required.')); return; }

    const frames: CapturedScreenshot[] = [];
    let startedAt: number | undefined;
    let callbackId: number;
    let timer = setTimeout(() => finish(new Error('No video frames arrived. Keep this tab visible and try again.')), 5_000);

    function finish(error?: unknown) {
      clearTimeout(timer);
      video.cancelVideoFrameCallback(callbackId);
      signal.removeEventListener('abort', onAbort);
      // Release the scratch canvas; each ImageData owns its own pixel buffer.
      canvas.width = canvas.height = 0;
      if (error) reject(error);
      else resolve(frames);
    }

    function onAbort() { finish(signal.reason); }

    function onFrame(now: number, metadata: VideoFrameCallbackMetadata) {
      try {
        signal.throwIfAborted();
        if (startedAt === undefined) {
          startedAt = now;
          clearTimeout(timer);
          timer = setTimeout(() => finish(new Error('The stream did not deliver enough frames within one second. Try a smaller count.')), CAPTURE_WINDOW_MS);
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (!canvas.width || !canvas.height) throw new Error('The captured preview has no visible pixels.');
        }
        const offsetMs = now - startedAt;
        if (offsetMs >= CAPTURE_WINDOW_MS) throw new Error('The capture exceeded one second. Keep the tab visible and try again.');
        if (video.videoWidth !== canvas.width || video.videoHeight !== canvas.height) {
          throw new Error('The preview changed size during capture. Keep its size fixed and try again.');
        }
        if (offsetMs >= frames.length * CAPTURE_WINDOW_MS / count) {
          context!.drawImage(video, 0, 0);
          frames.push(Object.freeze({
            imageData: context!.getImageData(0, 0, canvas.width, canvas.height),
            offsetMs,
            timestampMs: now,
            mediaTime: metadata.mediaTime,
          }));
          onSample?.(frames[frames.length - 1]);
        }
        if (frames.length === count) finish();
        else callbackId = video.requestVideoFrameCallback(onFrame);
      } catch (error) { finish(error); }
    }

    signal.addEventListener('abort', onAbort, { once: true });
    callbackId = video.requestVideoFrameCallback(onFrame);
  });
}

/** Owns one user-approved display stream and the latest successful batch. */
export class CvTestTool extends EventTarget {
  private readonly frame: HTMLIFrameElement;
  private stream?: MediaStream;
  private video?: HTMLVideoElement;
  private operation?: AbortController;
  private frames: readonly CapturedScreenshot[] = Object.freeze([]);
  phase: 'idle' | 'requesting' | 'capturing' | 'ready' = 'idle';

  constructor(frame: HTMLIFrameElement) {
    super();
    this.frame = frame;
  }

  get screenshots() { return this.frames; }
  get busy() { return this.operation !== undefined; }
  get sharing() { return this.stream?.getVideoTracks()[0]?.readyState === 'live'; }

  private notify() { this.dispatchEvent(new Event('change')); }

  clearScreenshots() {
    this.frames = Object.freeze([]);
    this.notify();
  }

  stop() {
    this.operation?.abort(new DOMException('Capture stopped.', 'AbortError'));
    const stream = this.stream;
    this.stream = undefined;
    stream?.getTracks().forEach(track => track.stop());
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
      this.video.remove();
      this.video = undefined;
    }
    this.phase = 'idle';
    this.notify();
  }

  private async startVideo(signal: AbortSignal) {
    if (this.video && this.sharing) return this.video;
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Screen capture requires HTTPS or localhost and a browser with getDisplayMedia support.');
    }
    const cropApi = (globalThis as typeof globalThis & { CropTarget?: CropApi }).CropTarget;
    if (!cropApi || !HTMLVideoElement.prototype.requestVideoFrameCallback) {
      throw new Error('Use desktop Chrome or Edge with Region Capture and video frame callbacks.');
    }

    // Call directly in the click's activation scope, before any asynchronous work.
    const options: DisplayOptions = {
      video: { displaySurface: 'browser', frameRate: { ideal: 30 } },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
      monitorTypeSurfaces: 'exclude',
    };
    const stream = await navigator.mediaDevices.getDisplayMedia(options);
    if (signal.aborted) {
      stream.getTracks().forEach(track => track.stop());
      signal.throwIfAborted();
    }
    this.stream = stream;
    const track = stream.getVideoTracks()[0] as CropTrack | undefined;
    if (!track?.cropTo || track.getSettings().displaySurface !== 'browser') {
      throw new Error('Choose “This Tab” in the share picker. Window and screen capture cannot isolate the preview.');
    }
    track.addEventListener('ended', () => { if (this.stream === stream) this.stop(); }, { once: true });
    track.contentHint = 'motion';
    try {
      await track.cropTo(await cropApi.fromElement(this.frame));
    } catch {
      throw new Error('Could not crop to the preview. Select this capture workspace’s own tab in the share picker.');
    }
    signal.throwIfAborted();

    const video = document.createElement('video');
    this.video = video;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    // Keep video presented so frame callbacks run, outside the cropped iframe.
    video.style.cssText = 'position:fixed;bottom:0;left:0;width:2px;height:2px;pointer-events:none';
    document.body.append(video);
    video.srcObject = stream;
    await video.play();
    signal.throwIfAborted();
    return video;
  }

  async captureScreenshot(options: CaptureOptions): Promise<readonly CapturedScreenshot[]> {
    validateCount(options?.count);
    if (this.busy) throw new Error('A capture is already in progress.');
    if (!this.frame.isConnected || !this.frame.getBoundingClientRect().width || !this.frame.getBoundingClientRect().height) {
      throw new Error('Load a visible preview before capturing.');
    }
    const operation = new AbortController();
    this.operation = operation;
    this.phase = this.sharing ? 'capturing' : 'requesting';
    this.notify();
    try {
      const video = await this.startVideo(operation.signal);
      this.phase = 'capturing';
      this.notify();
      const frames = await sampleVideoFrames(video, options.count, operation.signal,
        screenshot => this.dispatchEvent(new CustomEvent('sample', { detail: screenshot })));
      operation.signal.throwIfAborted();
      this.frames = Object.freeze(frames);
      return this.frames;
    } catch (error) {
      this.stop();
      throw error;
    } finally {
      this.operation = undefined;
      this.phase = this.sharing ? 'ready' : 'idle';
      this.notify();
    }
  }
}
