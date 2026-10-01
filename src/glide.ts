/**
 * Meditate "flow": a slow, continuous glide between nearby Solfeggio frequencies.
 *
 * Stations: the preset frequency f0 plus its two nearest Solfeggio neighbours
 * (one below and one above when possible). The path is f0 → A → f0 → B → f0 …
 * Each transition lasts TRANS seconds with a cosine ease in log-frequency
 * (an eased exponential ramp: slow departure/arrival, no audible steps), then
 * rests HOLD seconds on the station. The glide is a pure function of time, so
 * the canvas and the oscillator follow exactly the same curve.
 */
export const SOLFEGGIO = [174, 285, 396, 417, 528, 639, 741, 852, 963];
export const TRANS = 30; // s per transition
export const HOLD = 8; // s resting on each station
const FIRST_HOLD = 4; // s on the preset before the first departure
const RECENTER = 8; // s to glide to a newly chosen preset

export function neighbours(f0: number): [number, number] {
  const others = SOLFEGGIO.filter((f) => Math.abs(Math.log2(f / f0)) > 0.01);
  const below = others.filter((f) => f < f0).sort((a, b) => b - a);
  const above = others.filter((f) => f > f0).sort((a, b) => a - b);
  if (below.length && above.length) return [below[0], above[0]];
  const side = below.length ? below : above;
  return [side[0], side[1] ?? side[0]];
}

export class Glide {
  private path: number[] = [];
  private idx = 0;
  private from = 0;
  private to = 0;
  private t0 = 0; // ms, start of the current transition
  private trans = TRANS;
  private hold = HOLD;

  constructor(f0: number, now: number) {
    this.setCenter(f0, now, null);
  }

  /** Re-centre on a new preset; glides there smoothly from `current` (or starts on it). */
  setCenter(f0: number, now: number, current: number | null = this.at(now)) {
    const [a, b] = neighbours(f0);
    this.path = [f0, a, f0, b];
    this.idx = 0;
    if (current == null) {
      this.from = this.to = f0;
      this.t0 = now - this.trans * 1000; // already "arrived": rest, then depart
      this.hold = FIRST_HOLD;
    } else {
      this.from = current;
      this.to = f0;
      this.t0 = now;
      this.trans = RECENTER;
      this.hold = HOLD;
    }
  }

  private advance(now: number) {
    while (now - this.t0 >= (this.trans + this.hold) * 1000) {
      this.t0 += (this.trans + this.hold) * 1000;
      this.idx = (this.idx + 1) % this.path.length;
      this.from = this.to;
      this.to = this.path[this.idx];
      this.trans = TRANS;
      this.hold = HOLD;
    }
  }

  at(now: number): number {
    this.advance(now);
    const u = Math.min(1, Math.max(0, (now - this.t0) / (this.trans * 1000)));
    const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    return this.from * Math.pow(this.to / this.from, e);
  }

  /** Next station (for display/debug). */
  get target(): number {
    return this.to;
  }
}
