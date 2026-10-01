import type { Source, Waveform } from './state';

export interface Peak {
  freq: number;
  db: number;
}

type AC = typeof AudioContext;
/** Tone peak level before the master volume (v² curve): 0.5 × 0.6² ≈ the old default loudness. */
const TONE_LEVEL = 0.5;

/**
 * Web Audio engine: a tone generator (oscillator → gain → master), microphone and
 * file inputs, and an AnalyserNode used for FFT peak picking. The AudioContext is
 * only created inside a user-gesture handler (call ensure() from a click/tap).
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private toneGain!: GainNode;
  private analyser!: AnalyserNode;
  private sink!: GainNode;
  private osc: OscillatorNode | null = null;
  private micStream: MediaStream | null = null;
  private micNode: MediaStreamAudioSourceNode | null = null;
  private fileEl: HTMLAudioElement | null = null;
  private fileNode: MediaElementAudioSourceNode | null = null;
  private fileUrl = '';
  private spec: Float32Array<ArrayBuffer> = new Float32Array(0);
  private wave: Float32Array<ArrayBuffer> = new Float32Array(0);
  freq = 440;
  private waveform: Waveform = 'sine';
  private volume = 0.6;
  private muted = false;
  /** true while the app intends audio to be audible (used to auto-resume after OS suspensions) */
  wantRunning = false;
  /** 'element' = Web Audio → MediaStream → <audio> (enables Media Session/lock-screen on Android/desktop); 'direct' = ctx.destination */
  route: 'direct' | 'element' = 'direct';
  private outEl: HTMLAudioElement | null = null;
  private bellNodes: OscillatorNode[] = [];
  private fadeInEnd = 0;
  toneOn = false;
  source: Source = 'tone';

  get supported(): boolean {
    return !!(window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext);
  }

  /** Must be called synchronously inside a user gesture (iOS). */
  ensure(): AudioContext | null {
    if (!this.ctx) {
      const Ctor: AC | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.targetGain();
      this.master.connect(ctx.destination);
      this.setupOutputRoute(ctx);
      ctx.addEventListener('statechange', () => this.onStateChange?.(ctx.state));
      this.toneGain = ctx.createGain();
      this.toneGain.gain.value = 0;
      this.toneGain.connect(this.master);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 16384;
      this.analyser.smoothingTimeConstant = 0.6;
      this.analyser.minDecibels = -110;
      this.analyser.maxDecibels = -10;
      // keep the analyser pulled without making it audible (mic must never reach speakers)
      this.sink = ctx.createGain();
      this.sink.gain.value = 0;
      this.analyser.connect(this.sink);
      this.sink.connect(ctx.destination);
      this.toneGain.connect(this.analyser);
      this.spec = new Float32Array(this.analyser.frequencyBinCount);
      this.wave = new Float32Array(2048);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  onStateChange: ((state: string) => void) | null = null;

  /**
   * Background playback & Media Session: Chrome (Android/desktop) only shows media
   * controls for an HTMLMediaElement, so the master bus is also streamed into a
   * hidden <audio> element. If it starts (we are inside the user gesture) the
   * direct connection is dropped; otherwise we keep ctx.destination.
   * iOS Safari uses the direct route (+ navigator.audioSession = 'playback').
   */
  private setupOutputRoute(ctx: AudioContext) {
    const nav = navigator as unknown as { audioSession?: { type: string } };
    try {
      if (nav.audioSession) nav.audioSession.type = 'playback';
    } catch {
      /* ignore */
    }
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS || typeof ctx.createMediaStreamDestination !== 'function' || !('srcObject' in HTMLMediaElement.prototype)) return;
    try {
      const dest = ctx.createMediaStreamDestination();
      this.master.connect(dest);
      const el = new Audio();
      el.srcObject = dest.stream;
      el.setAttribute('playsinline', '');
      this.outEl = el;
      el.play()
        .then(() => {
          // the element now carries the audio: drop the direct path to avoid doubling
          try {
            this.master.disconnect(ctx.destination);
          } catch {
            /* ignore */
          }
          this.route = 'element';
        })
        .catch(() => {
          this.master.disconnect(dest);
          this.outEl = null;
          this.route = 'direct';
        });
    } catch {
      this.route = 'direct';
    }
  }

  /** Resume a suspended/interrupted context (call on visibility/focus/tap). */
  kick() {
    const ctx = this.ctx;
    if (!ctx || !this.wantRunning) return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    if (this.outEl && this.outEl.paused) void this.outEl.play().catch(() => undefined);
  }

  /** Perceptual volume curve: gain = v² (fine control at low, background levels). */
  static curve(v: number): number {
    const c = Math.max(0, Math.min(1, v));
    return c * c;
  }

  private targetGain(): number {
    return this.muted ? 0 : AudioEngine.curve(this.volume);
  }

  get masterGain(): number {
    return this.ctx ? this.master.gain.value : this.targetGain();
  }

  get oscFreq(): number {
    return this.osc ? this.osc.frequency.value : 0;
  }

  get toneLevel(): number {
    return this.ctx ? this.toneGain.gain.value : 0;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  private applyWave(osc: OscillatorNode) {
    if (!this.ctx) return;
    if (this.waveform === 'triangle') osc.type = 'triangle';
    else if (this.waveform === 'soft') {
      const real = new Float32Array([0, 0, 0, 0, 0]);
      const imag = new Float32Array([0, 1, 0.18, 0.06, 0.02]);
      osc.setPeriodicWave(this.ctx.createPeriodicWave(real, imag));
    } else osc.type = 'sine';
  }

  setWaveform(w: Waveform) {
    this.waveform = w;
    if (this.osc) this.applyWave(this.osc);
  }

  /** Set volume (0..1, linear slider position) and mute; smooth ramp, no clicks. */
  setVolume(v: number, muted = this.muted) {
    this.volume = v;
    this.muted = muted;
    if (this.ctx) {
      const g = this.master.gain;
      const now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.setTargetAtTime(this.targetGain(), now, 0.04);
    }
  }

  setFreq(f: number, glide = 0.04) {
    this.freq = f;
    if (this.ctx && this.osc) this.osc.frequency.setTargetAtTime(f, this.ctx.currentTime, glide);
  }

  startTone(f: number, fade = 0.12) {
    const ctx = this.ensure();
    if (!ctx) return;
    this.freq = f;
    const now = ctx.currentTime;
    if (!this.osc) {
      const osc = ctx.createOscillator();
      this.applyWave(osc);
      osc.frequency.value = f;
      osc.connect(this.toneGain);
      osc.start();
      this.osc = osc;
    } else {
      this.osc.frequency.setTargetAtTime(f, now, 0.03);
    }
    const g = this.toneGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(TONE_LEVEL, now + fade);
    this.fadeInEnd = now + fade;
    this.toneOn = true;
  }

  /**
   * Schedule the end of a meditation on the audio clock (fade-out + bell), so it
   * happens on time even when the tab is hidden and timers/rAF are throttled.
   */
  scheduleSessionEnd(inSec: number, fade = 4) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.cancelSessionEnd(false);
    const now = ctx.currentTime;
    const end = now + Math.max(0.5, inSec);
    const g = this.toneGain.gain;
    if (now >= this.fadeInEnd) {
      // settle on the full level first (also undoes a partial fade from an earlier schedule)
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(TONE_LEVEL, Math.min(now + 0.6, end));
    } else {
      g.cancelScheduledValues(this.fadeInEnd + 1e-3);
    }
    const t0 = Math.max(end - fade, this.fadeInEnd, now + 0.6);
    if (t0 < end) {
      g.setValueAtTime(TONE_LEVEL, t0);
      g.linearRampToValueAtTime(0, end);
    }
    this.bellNodes = this.bell(end + 0.4);
    this.gongAt = end + 0.4;
  }

  /**
   * Cancel a scheduled session end (pause / cancel / leaving / duration change):
   * the gong never sounds, and if the tone keeps playing its level is restored.
   */
  cancelSessionEnd(restore = true) {
    for (const o of this.bellNodes) {
      try {
        o.stop();
        o.disconnect();
      } catch {
        /* not started yet or already stopped */
      }
    }
    this.bellNodes = [];
    if (this.ctx) for (const g of this.gongLog) if (!g.cancelled && g.at > this.ctx.currentTime) g.cancelled = true;
    this.gongAt = 0;
    const ctx = this.ctx;
    if (restore && ctx && this.toneOn) {
      const g = this.toneGain.gain;
      const now = ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(TONE_LEVEL, Math.max(this.fadeInEnd, now + 0.6));
    }
  }

  /** Debug log of gongs (scheduled ctx time, cancelled before sounding?). */
  gongLog: { at: number; cancelled: boolean }[] = [];
  /** ctx time at which the scheduled gong will sound (0 = none). */
  gongAt = 0;

  stopTone(fade = 0.15) {
    if (!this.ctx || !this.osc) {
      this.toneOn = false;
      return;
    }
    const now = this.ctx.currentTime;
    const g = this.toneGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fade);
    const osc = this.osc;
    this.osc = null;
    osc.stop(now + fade + 0.05);
    window.setTimeout(() => osc.disconnect(), (fade + 0.2) * 1000);
    this.toneOn = false;
  }

  /**
   * Soft gong (only used when a timer completes): a low, slightly inharmonic
   * partial set with a gentle mallet attack and a long decay, through the master
   * volume. Optionally at a future ctx time; returns the nodes so it can be cancelled.
   */
  bell(at?: number): OscillatorNode[] {
    const ctx = this.ctx;
    if (!ctx) return [];
    const t = Math.max(ctx.currentTime, at ?? 0);
    const base = 196;
    const partials: [number, number, number][] = [
      // [ratio, peak amplitude, decay seconds]
      [1, 0.2, 7],
      [1.0036, 0.1, 7], // slow beating = shimmer
      [2.01, 0.07, 4.5],
      [2.76, 0.05, 3.5],
      [4.07, 0.022, 2.2],
      [5.43, 0.01, 1.4],
    ];
    const nodes: OscillatorNode[] = [];
    this.gongLog.push({ at: t, cancelled: false });
    for (const [mul, amp, dec] of partials) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = base * mul;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + dec + 0.1);
      nodes.push(o);
    }
    return nodes;
  }

  async startMic(): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx || !navigator.mediaDevices?.getUserMedia) return false;
    this.stopInputs();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.micStream = stream;
      this.micNode = ctx.createMediaStreamSource(stream);
      this.micNode.connect(this.analyser);
      this.source = 'mic';
      return true;
    } catch {
      return false;
    }
  }

  async playFile(file: File): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return false;
    this.stopInputs();
    if (!this.fileEl) {
      this.fileEl = new Audio();
      this.fileEl.loop = true;
      this.fileEl.crossOrigin = 'anonymous';
      this.fileNode = ctx.createMediaElementSource(this.fileEl);
    }
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = URL.createObjectURL(file);
    this.fileEl.src = this.fileUrl;
    this.fileNode!.connect(this.analyser);
    this.fileNode!.connect(this.master);
    this.source = 'file';
    try {
      await this.fileEl.play();
      return true;
    } catch {
      return false;
    }
  }

  get hasFile(): boolean {
    return !!this.fileUrl;
  }

  resumeFile() {
    if (this.fileEl && this.fileUrl) {
      this.fileNode?.disconnect();
      this.fileNode!.connect(this.analyser);
      this.fileNode!.connect(this.master);
      void this.fileEl.play().catch(() => undefined);
      this.source = 'file';
    }
  }

  stopInputs() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.micNode) {
      this.micNode.disconnect();
      this.micNode = null;
    }
    if (this.fileEl) {
      this.fileEl.pause();
      this.fileNode?.disconnect();
    }
    this.source = 'tone';
  }

  get filePlaying(): boolean {
    return !!this.fileEl && !this.fileEl.paused;
  }

  pauseFile() {
    this.fileEl?.pause();
  }

  /** RMS level of the current input in dBFS (approximate). */
  level(): number {
    if (!this.ctx) return -120;
    this.analyser.getFloatTimeDomainData(this.wave);
    let s = 0;
    for (let i = 0; i < this.wave.length; i++) s += this.wave[i] * this.wave[i];
    return 10 * Math.log10(s / this.wave.length + 1e-12);
  }

  /** Latest time-domain buffer (call level() first in the same frame). */
  waveform_(): Float32Array {
    return this.wave;
  }

  spectrum(): Float32Array | null {
    if (!this.ctx) return null;
    this.analyser.getFloatFrequencyData(this.spec);
    return this.spec;
  }

  /**
   * Peak picking on the FFT magnitude (dB). Local maxima inside [lo, hi] above the
   * threshold are refined with parabolic interpolation and returned strongest-first.
   */
  peaks(lo: number, hi: number, thresholdDb: number, maxPeaks = 4): Peak[] {
    const spec = this.spectrum();
    if (!spec) return [];
    const sr = this.sampleRate;
    const N = this.analyser.fftSize;
    const binHz = sr / N;
    const i0 = Math.max(2, Math.floor(lo / binHz));
    const i1 = Math.min(spec.length - 2, Math.ceil(hi / binHz));
    let maxDb = -Infinity;
    for (let i = i0; i <= i1; i++) if (spec[i] > maxDb) maxDb = spec[i];
    const floor = Math.max(thresholdDb, maxDb - 36);
    const cands: Peak[] = [];
    for (let i = i0; i <= i1; i++) {
      const b = spec[i];
      if (b < floor || b <= spec[i - 1] || b < spec[i + 1]) continue;
      const a = spec[i - 1];
      const c = spec[i + 1];
      const den = a - 2 * b + c;
      const p = den !== 0 ? (0.5 * (a - c)) / den : 0;
      const off = Math.max(-0.5, Math.min(0.5, p));
      cands.push({ freq: (i + off) * binHz, db: b - 0.25 * (a - c) * off });
    }
    cands.sort((x, y) => y.db - x.db);
    const out: Peak[] = [];
    for (const c of cands) {
      if (out.every((o) => Math.abs(1200 * Math.log2(c.freq / o.freq)) > 80)) out.push(c);
      if (out.length >= maxPeaks) break;
    }
    return out;
  }

  get binHz(): number {
    return this.ctx ? this.sampleRate / this.analyser.fftSize : 48000 / 16384;
  }
}
