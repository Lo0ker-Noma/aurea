import type { Mode } from './state';
import { clamp } from './notes';

export interface Modes {
  /** Chladni mode numbers (continuous) */
  n: number;
  m: number;
  /** symmetric/antisymmetric mix (-1..1) */
  s: number;
  /** radial blend weight */
  w: number;
  /** overall wavenumber */
  K: number;
  /** mandala folds */
  S: number;
  /** water sources */
  N: number;
}

/**
 * Deterministic frequency -> mode mapping. A square plate's eigenfrequencies grow
 * with n² + m², so the overall wavenumber K = sqrt(n² + m²) grows with log-frequency
 * (compressed so audible ranges stay legible). The n:m ratio and symmetry mix are
 * smooth functions of log2(f), so sweeping the frequency morphs the figure
 * continuously and the same frequency always gives the same figure.
 */
export function modesFor(freq: number): Modes {
  const f = clamp(freq, 16, 8000);
  const lf = Math.log2(f);
  const K = clamp(2.6 + 2.05 * Math.log2(f / 40), 2.2, 12.6);
  const t = 0.5 + 0.5 * Math.sin(2 * Math.PI * lf * 1.37 + 0.7);
  const theta = 0.24 + 0.42 * t; // n:m between ~1:0.25 and ~1:0.8
  const n = K * Math.cos(theta);
  const m = K * Math.sin(theta);
  const sr = Math.sin(2 * Math.PI * lf * 2.1 + 1.1);
  const s = Math.tanh(4 * sr); // mostly ±1 (x↔y symmetric / antisymmetric), continuous in f
  const w = 0.28 * (0.5 + 0.5 * Math.sin(2 * Math.PI * lf * 0.9 + 2.0));
  const foldsTable = [6, 8, 12, 5, 10, 7, 9, 6];
  const S = foldsTable[Math.floor(lf * 3) % foldsTable.length];
  const N = 3 + (Math.floor(lf * 4) % 5);
  return { n, m, s, w, K, S, N };
}

export class Field {
  readonly G: number;
  readonly f: Float32Array;
  readonly gx: Float32Array;
  readonly gy: Float32Array;
  private readonly r: Float32Array;
  private readonly th: Float32Array;
  private readonly cosA: Float32Array;
  private readonly cosB: Float32Array;
  private readonly ca: Float32Array;
  private readonly cb: Float32Array;
  private readonly cc: Float32Array;
  private readonly cd: Float32Array;
  private readonly ce: Float32Array;
  private key = '';

  constructor(G = 128) {
    this.G = G;
    const n = G * G;
    this.f = new Float32Array(n);
    this.gx = new Float32Array(n);
    this.gy = new Float32Array(n);
    this.r = new Float32Array(n);
    this.th = new Float32Array(n);
    this.cosA = new Float32Array(G);
    this.cosB = new Float32Array(G);
    this.ca = new Float32Array(n);
    this.cb = new Float32Array(n);
    this.cc = new Float32Array(n);
    this.cd = new Float32Array(n);
    this.ce = new Float32Array(n);
    for (let j = 0; j < G; j++) {
      for (let i = 0; i < G; i++) {
        const x = (i / (G - 1)) * 2 - 1;
        const y = (j / (G - 1)) * 2 - 1;
        this.r[j * G + i] = Math.hypot(x, y);
        this.th[j * G + i] = Math.atan2(y, x);
      }
    }
  }

  /** Recompute the scalar field and its normalized gradient. Returns true if it changed. */
  compute(mode: Mode, md: Modes, time: number): boolean {
    const { G, f } = this;
    if (mode === 'chladni') {
      const key = `c${md.n.toFixed(4)}|${md.m.toFixed(4)}|${md.s.toFixed(3)}|${md.w.toFixed(3)}`;
      if (key === this.key) return false;
      this.key = key;
      const { cosA, cosB, r } = this;
      for (let i = 0; i < G; i++) {
        const u = ((i / (G - 1)) * 2 - 1) * (Math.PI / 2);
        cosA[i] = Math.cos(md.n * u);
        cosB[i] = Math.cos(md.m * u);
      }
      const kr = md.K * (Math.PI / 2);
      for (let j = 0, idx = 0; j < G; j++) {
        const an = cosA[j];
        const bm = cosB[j];
        for (let i = 0; i < G; i++, idx++) {
          f[idx] = cosA[i] * bm + md.s * cosB[i] * an + md.w * Math.cos(kr * r[idx]);
        }
      }
    } else if (mode === 'water') {
      // Σ w·cos(k·d_i − ωt) = C·cos(ωt) + S·sin(ωt) with C = Σ w·cos(k·d_i), S = Σ w·sin(k·d_i)
      // → the expensive part is cached per frequency; each frame is 2 multiply-adds per cell.
      const key = `w${md.K.toFixed(4)}|${md.N}`;
      if (key !== this.key) {
        this.key = key;
        const N = md.N;
        const k = md.K * (Math.PI / 2) * 1.1;
        const sx: number[] = [0];
        const sy: number[] = [0];
        const sw: number[] = [0.7];
        for (let q = 0; q < N; q++) {
          const a = -Math.PI / 2 + (q * 2 * Math.PI) / N;
          sx.push(0.62 * Math.cos(a));
          sy.push(0.62 * Math.sin(a));
          sw.push(1);
        }
        const A = this.ca;
        const B = this.cb;
        for (let j = 0, idx = 0; j < G; j++) {
          const y = (j / (G - 1)) * 2 - 1;
          for (let i = 0; i < G; i++, idx++) {
            const x = (i / (G - 1)) * 2 - 1;
            let c = 0;
            let sn = 0;
            for (let q = 0; q <= N; q++) {
              const dx = x - sx[q];
              const dy = y - sy[q];
              const ph = k * Math.sqrt(dx * dx + dy * dy);
              c += sw[q] * Math.cos(ph);
              sn += sw[q] * Math.sin(ph);
            }
            A[idx] = c;
            B[idx] = sn;
          }
        }
      }
      const ph = time * 0.4;
      const c = Math.cos(ph);
      const sn = Math.sin(ph);
      const A = this.ca;
      const B = this.cb;
      for (let idx = 0; idx < G * G; idx++) f[idx] = A[idx] * c + B[idx] * sn;
    } else if (mode === 'mandala') {
      // cos(Sθ + φ) expanded so the slow rotation costs only multiply-adds per frame
      const key = `m${md.K.toFixed(4)}|${md.S}`;
      const { ca: A1, cb: B1, cc: A2, cd: B2, ce: R0 } = this;
      if (key !== this.key) {
        this.key = key;
        const { r, th } = this;
        const a = md.K * 0.62 * Math.PI;
        const S = md.S;
        for (let idx = 0; idx < G * G; idx++) {
          const rr = r[idx];
          const t = th[idx];
          const r1 = Math.cos(a * rr);
          const r2 = 0.55 * Math.cos(0.5 * a * rr + 1.3);
          A1[idx] = r1 * Math.cos(S * t);
          B1[idx] = r1 * Math.sin(S * t);
          A2[idx] = r2 * Math.cos(2 * S * t);
          B2[idx] = r2 * Math.sin(2 * S * t);
          R0[idx] = 0.25 * Math.cos(a * 1.5 * rr);
        }
      }
      const rot = time * 0.06 * md.S;
      const c1 = Math.cos(rot);
      const s1 = Math.sin(rot);
      for (let idx = 0; idx < G * G; idx++) {
        // cos(S(θ+rot)) and cos(2S(θ−rot/2)) = cos(2Sθ − S·rot)
        f[idx] = A1[idx] * c1 - B1[idx] * s1 + A2[idx] * c1 + B2[idx] * s1 + R0[idx];
      }
    } else {
      return false;
    }
    this.gradient();
    return true;
  }

  private gradient() {
    const { G, f, gx, gy } = this;
    let max = 1e-6;
    for (let i = 0; i < f.length; i++) {
      const v = Math.abs(f[i]);
      if (v > max) max = v;
    }
    const norm = 1 / max;
    for (let i = 0; i < f.length; i++) f[i] *= norm;
    const h2 = (G - 1) / 4; // 1 / (2 * cellSize), cellSize = 2/(G-1)
    for (let j = 0; j < G; j++) {
      const jm = j > 0 ? j - 1 : j;
      const jp = j < G - 1 ? j + 1 : j;
      for (let i = 0; i < G; i++) {
        const im = i > 0 ? i - 1 : i;
        const ip = i < G - 1 ? i + 1 : i;
        const idx = j * G + i;
        gx[idx] = (f[j * G + ip] - f[j * G + im]) * h2 * (2 / (ip - im));
        gy[idx] = (f[jp * G + i] - f[jm * G + i]) * h2 * (2 / (jp - jm));
      }
    }
  }

  invalidate() {
    this.key = '';
  }
}
