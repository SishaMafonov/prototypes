export type MicrophoneState = 'off' | 'requesting' | 'active' | 'paused' | 'denied' | 'unavailable' | 'error';

export function voiceLoudness(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const rms = Math.sqrt(energy / samples.length);
  if (!Number.isFinite(rms)) return 0;
  return Math.max(0, Math.min(1, (rms - 0.012) / 0.2)) ** 0.75;
}

export class MicrophoneInput {
  state: MicrophoneState = 'off';
  level = 0;
  private generation = 0;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private samples = new Float32Array(1024);

  async enable(): Promise<void> {
    this.stop();
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      this.state = 'unavailable';
      return;
    }
    const generation = this.generation;
    this.state = 'requesting';
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    try {
      context = new AudioContext();
      this.context = context;
      // Request capture immediately even if a browser defers AudioContext.resume().
      void context.resume().catch(() => {
        if (generation === this.generation && this.state === 'active') {
          this.state = 'paused';
          this.level = 0;
        }
      });
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }, video: false,
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach(track => track.stop());
        if (context.state !== 'closed') void context.close().catch(() => {});
        return;
      }
      this.stream = stream;
      this.context = context;
      this.source = context.createMediaStreamSource(stream);
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = this.samples.length;
      this.source.connect(this.analyser);
      // Loudness is processed locally, without recording or speaker feedback.
      context.onstatechange = () => {
        if (generation === this.generation) {
          this.state = context?.state === 'running' ? 'active' : 'paused';
          if (this.state !== 'active') this.level = 0;
        }
      };
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => {
        if (generation === this.generation) {
          this.stop();
          this.state = 'unavailable';
        }
      }));
      this.state = context.state === 'running' ? 'active' : 'paused';
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      if (generation !== this.generation) return;
      this.stop();
      const name = error instanceof Error ? error.name : '';
      this.state = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied'
        : name === 'NotFoundError' || name === 'NotReadableError' ? 'unavailable' : 'error';
    }
  }

  read(seconds: number): number {
    if (this.state !== 'active' || !this.analyser) return this.level = 0;
    this.analyser.getFloatTimeDomainData(this.samples);
    const target = voiceLoudness(this.samples);
    const response = 1 - Math.exp(-Math.max(0, seconds) / (target > this.level ? 0.04 : 0.12));
    this.level += (target - this.level) * response;
    return this.level;
  }

  stop(): void {
    this.generation++;
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.context) {
      this.context.onstatechange = null;
      if (this.context.state !== 'closed') void this.context.close().catch(() => {});
    }
    this.stream = null;
    this.context = null;
    this.source = null;
    this.analyser = null;
    this.level = 0;
    this.state = 'off';
  }
}
