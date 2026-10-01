import type { Lang } from './state';

const NAMES_ES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const PHI = (1 + Math.sqrt(5)) / 2;

export interface NoteInfo {
  midi: number;
  name: string;
  octave: number;
  cents: number;
  /** e.g. "Si5 −44¢" */
  label: string;
}

/** Nearest equal-tempered note for a frequency given the A4 reference. */
export function noteInfo(freq: number, a4: number, lang: Lang): NoteInfo {
  const f = Math.max(freq, 1e-3);
  const midiF = 69 + 12 * Math.log2(f / a4);
  const midi = Math.round(midiF);
  const cents = Math.round((midiF - midi) * 100);
  const names = lang === 'es' ? NAMES_ES : NAMES_EN;
  const name = names[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return { midi, name, octave, cents, label: `${name}${octave}\u00a0${centsLabel(cents)}` };
}

export function centsLabel(c: number): string {
  if (c === 0) return '±0¢';
  return `${c > 0 ? '+' : '−'}${Math.abs(c)}¢`;
}

export function midiToFreq(note: number, a4: number): number {
  return a4 * Math.pow(2, (note - 69) / 12);
}

export function midiName(note: number, lang: Lang): string {
  const names = lang === 'es' ? NAMES_ES : NAMES_EN;
  return `${names[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 1}`;
}

/** "963.00 Hz" */
export function hz(f: number, digits = 2): string {
  return `${f.toFixed(digits)} Hz`;
}

/** Compact: "60.00 Hz" / "2.600 kHz" */
export function hzCompact(f: number): string {
  return f >= 1000 ? `${(f / 1000).toFixed(3)} kHz` : `${f.toFixed(2)} Hz`;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Map 0..1 slider position to a log frequency scale and back. */
export const F_MIN = 20;
export const F_MAX = 4000;
export function sliderToFreq(t: number, lo = F_MIN, hi = F_MAX): number {
  return lo * Math.pow(hi / lo, clamp(t, 0, 1));
}
export function freqToSlider(f: number, lo = F_MIN, hi = F_MAX): number {
  return clamp(Math.log(f / lo) / Math.log(hi / lo), 0, 1);
}
