import type { Field } from './field';

/**
 * CPU particle system: positions live in a Float32Array that is uploaded to WebGL
 * every frame. Each particle samples the (pre-computed, bilinearly interpolated)
 * plate field: it takes a damped Newton step towards the nearest nodal line
 * (field = 0) and is shaken by random jitter proportional to the local vibration
 * amplitude — exactly why sand gathers on the nodal lines of a Chladni plate.
 */
export class Particles {
  readonly max: number;
  count: number;
  readonly pos: Float32Array;
  readonly bright: Float32Array;
  private seed = 0x9e3779b9;

  constructor(max: number, count: number) {
    this.max = max;
    this.count = Math.min(count, max);
    this.pos = new Float32Array(max * 2);
    this.bright = new Float32Array(max);
    for (let i = 0; i < max; i++) this.respawn(i);
  }

  private rnd(): number {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  respawn(i: number) {
    this.pos[2 * i] = this.rnd() * 2 - 1;
    this.pos[2 * i + 1] = this.rnd() * 2 - 1;
    this.bright[i] = 0.3;
  }

  setCount(n: number) {
    const next = Math.max(1000, Math.min(this.max, Math.round(n)));
    for (let i = this.count; i < next; i++) this.respawn(i);
    this.count = next;
  }

  scatter(amount = 0.25) {
    for (let i = 0; i < this.count; i++) {
      this.pos[2 * i] += (this.rnd() - 0.5) * amount;
      this.pos[2 * i + 1] += (this.rnd() - 0.5) * amount;
    }
  }

  /** Chladni / water / mandala dynamics. k = dt*60 (frame-rate independence). */
  stepField(field: Field, k: number, energy: number, circular: boolean, calm: number) {
    const { G, f: F, gx: GX, gy: GY } = field;
    const pos = this.pos;
    const br = this.bright;
    const sc = (G - 1) / 2;
    const rate = 0.085 * k;
    const maxStep = 0.012 * k;
    const sk = Math.sqrt(k);
    const base = 0.0012 * sk * calm;
    const amp = 0.014 * sk * energy * calm;
    const limit = circular ? 0.985 * 0.985 : 1;
    const tang = 0.012 * sk * calm;
    let s = this.seed;
    for (let i = 0, n = this.count; i < n; i++) {
      let x = pos[2 * i];
      let y = pos[2 * i + 1];
      let fx = (x + 1) * sc;
      let fy = (y + 1) * sc;
      if (fx < 0) fx = 0; else if (fx > G - 1.001) fx = G - 1.001;
      if (fy < 0) fy = 0; else if (fy > G - 1.001) fy = G - 1.001;
      const ix = fx | 0;
      const iy = fy | 0;
      const tx = fx - ix;
      const ty = fy - iy;
      const i00 = iy * G + ix;
      const i10 = i00 + 1;
      const i01 = i00 + G;
      const i11 = i01 + 1;
      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;
      const a = F[i00] * w00 + F[i10] * w10 + F[i01] * w01 + F[i11] * w11;
      const gx = GX[i00] * w00 + GX[i10] * w10 + GX[i01] * w01 + GX[i11] * w11;
      const gy = GY[i00] * w00 + GY[i10] * w10 + GY[i01] * w01 + GY[i11] * w11;
      const g2 = gx * gx + gy * gy;
      let st = (rate * a) / (g2 + 1.5);
      let dx = -st * gx;
      let dy = -st * gy;
      const len2 = dx * dx + dy * dy;
      if (len2 > maxStep * maxStep) {
        st = maxStep / Math.sqrt(len2);
        dx *= st;
        dy *= st;
      }
      const aa = a < 0 ? -a : a;
      const jit = base + amp * aa;
      // xorshift32 inline
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r1 = (s >>> 0) / 4294967296 - 0.5;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r2 = (s >>> 0) / 4294967296 - 0.5;
      // diffusion along the nodal line (perpendicular to the gradient) keeps lines continuous
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r3 = ((s >>> 0) / 4294967296 - 0.5) * tang / Math.sqrt(g2 + 1e-6);
      x += dx + r1 * jit * 2 - gy * r3;
      y += dy + r2 * jit * 2 + gx * r3;
      const out = circular ? x * x + y * y > limit : x < -1 || x > 1 || y < -1 || y > 1;
      if (out) {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        x = ((s >>> 0) / 4294967296) * 2 - 1;
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        y = ((s >>> 0) / 4294967296) * 2 - 1;
        if (circular) {
          x *= 0.7;
          y *= 0.7;
        }
      }
      pos[2 * i] = x;
      pos[2 * i + 1] = y;
      const target = 1 - Math.min(1, aa * 2.2) * 0.85;
      br[i] += (target - br[i]) * 0.2;
    }
    this.seed = s >>> 0;
  }

  /**
   * XY / oscilloscope mode. Particles ease toward points on a Lissajous curve, or
   * (for mic/file input) a delay-embedding of the live waveform.
   */
  stepXY(k: number, energy: number, a: number, b: number, phase: number, wave: Float32Array | null, delay: number) {
    const pos = this.pos;
    const br = this.bright;
    const n = this.count;
    const ease = Math.min(1, 0.12 * k);
    const jit = 0.0025 * energy + 0.0008;
    let gain = 0.86;
    let L = 0;
    if (wave) {
      L = wave.length;
      let peak = 1e-4;
      for (let j = 0; j < L; j++) {
        const v = Math.abs(wave[j]);
        if (v > peak) peak = v;
      }
      gain = 0.86 / peak;
    }
    const TAU = Math.PI * 2;
    let s = this.seed;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      let tx: number;
      let ty: number;
      if (wave && L > delay + 2) {
        const j = Math.floor(u * (L - delay - 1));
        tx = wave[j] * gain;
        ty = wave[j + delay] * gain;
      } else {
        tx = 0.86 * Math.sin(TAU * a * u + phase);
        ty = 0.86 * Math.sin(TAU * b * u);
      }
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r1 = (s >>> 0) / 4294967296 - 0.5;
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      const r2 = (s >>> 0) / 4294967296 - 0.5;
      pos[2 * i] += (tx - pos[2 * i]) * ease + r1 * jit;
      pos[2 * i + 1] += (ty - pos[2 * i + 1]) * ease + r2 * jit;
      br[i] += (0.9 - br[i]) * 0.1;
    }
    this.seed = s >>> 0;
  }
}

/** Best small-integer ratio p/q approximating r (q <= maxQ). */
export function ratioFor(r: number, maxQ = 6): { p: number; q: number; err: number } {
  let best = { p: 1, q: 1, err: Math.abs(r - 1) };
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.max(1, Math.round(r * q));
    const err = Math.abs(r - p / q);
    if (err < best.err - 1e-9) best = { p, q, err };
  }
  return best;
}
