import type { Category } from './presets';
import { presetById } from './presets';
import { DEFAULT_CANVAS, type CanvasTheme } from './theme';

export type Lang = 'es' | 'en';
export type Tab = 'explore' | 'meditate' | 'studio';
export type Mode = 'chladni' | 'water' | 'mandala' | 'xy';
export type Source = 'tone' | 'mic' | 'file';
export type StudioSub = 'shape' | 'sound' | 'analysis' | 'output' | 'midi';
export type Density = 'auto' | 'low' | 'mid' | 'high';
export type Waveform = 'sine' | 'soft' | 'triangle';

export interface State {
  lang: Lang;
  tab: Tab;
  presetId: string;
  category: Category;
  mode: Mode;
  playing: boolean;
  freq: number;
  /** cumulative golden-ratio multiplier applied since the last direct frequency change */
  phiPow: number;
  tuning: 440 | 432;
  source: Source;
  overlay: string; // 'preset' | 'none' | geometry id
  showRings: boolean;
  density: Density;
  pointSize: number;
  volume: number;
  waveform: Waveform;
  studioSub: StudioSub;
  medDuration: 5 | 10 | 20;
  medRunning: boolean;
  rangeLo: number;
  rangeHi: number;
  sensitivity: number; // dB threshold
  panelCollapsed: boolean;
  exportGeo: boolean;
  exportCaption: boolean;
  canvasTheme: CanvasTheme;
}

const KEY = 'aurea:v1';
const PERSIST: (keyof State)[] = [
  'lang', 'presetId', 'category', 'mode', 'freq', 'tuning', 'overlay', 'showRings', 'density',
  'pointSize', 'volume', 'waveform', 'medDuration', 'rangeLo', 'rangeHi', 'sensitivity', 'panelCollapsed', 'studioSub',
  'exportGeo', 'exportCaption', 'canvasTheme',
];

function defaults(): State {
  const p = presetById('tree');
  return {
    lang: 'es',
    tab: 'explore',
    presetId: p.id,
    category: p.cat,
    mode: 'chladni',
    playing: false,
    freq: p.freq,
    phiPow: 0,
    tuning: 440,
    source: 'tone',
    overlay: 'preset',
    showRings: true,
    density: 'auto',
    pointSize: 1,
    volume: 0.6,
    waveform: 'sine',
    studioSub: 'sound',
    medDuration: 5,
    medRunning: false,
    rangeLo: 60,
    rangeHi: 2600,
    sensitivity: -70,
    panelCollapsed: false,
    exportGeo: true,
    exportCaption: true,
    canvasTheme: DEFAULT_CANVAS,
  };
}

function load(): State {
  const s = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      for (const k of PERSIST) {
        if (k in saved && typeof saved[k] === typeof s[k]) (s as unknown as Record<string, unknown>)[k] = saved[k];
      }
    }
  } catch {
    /* ignore */
  }
  // sanitize
  if (s.lang !== 'es' && s.lang !== 'en') s.lang = 'es';
  if (s.tuning !== 440 && s.tuning !== 432) s.tuning = 440;
  if (![5, 10, 20].includes(s.medDuration)) s.medDuration = 5;
  if (s.canvasTheme !== 'dark' && s.canvasTheme !== 'light') s.canvasTheme = DEFAULT_CANVAS;
  if (!isFinite(s.freq) || s.freq < 20 || s.freq > 4000) s.freq = presetById(s.presetId).freq;
  s.presetId = presetById(s.presetId).id;
  return s;
}

type Listener = (s: State, changed: Set<keyof State>) => void;

class Store {
  s: State = load();
  private listeners: Listener[] = [];
  private saveTimer = 0;

  get(): State {
    return this.s;
  }

  set(patch: Partial<State>): void {
    const changed = new Set<keyof State>();
    for (const k of Object.keys(patch) as (keyof State)[]) {
      if (this.s[k] !== patch[k]) {
        (this.s as unknown as Record<string, unknown>)[k] = patch[k];
        changed.add(k);
      }
    }
    if (!changed.size) return;
    if ([...changed].some((k) => PERSIST.includes(k))) this.scheduleSave();
    for (const l of this.listeners) l(this.s, changed);
  }

  on(l: Listener): void {
    this.listeners.push(l);
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        const out: Record<string, unknown> = {};
        for (const k of PERSIST) out[k] = this.s[k];
        localStorage.setItem(KEY, JSON.stringify(out));
      } catch {
        /* storage may be unavailable (private mode) */
      }
    }, 250);
  }
}

export const store = new Store();
