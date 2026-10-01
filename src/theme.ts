import type { Mode } from './state';

/**
 * Canvas theme. All canvas colours come from CSS custom properties declared in
 * style.css under :root[data-canvas="dark"] and :root[data-canvas="light"], so the
 * whole look of the particle stage can be switched (or re-tuned) from CSS alone.
 *
 * To change the default canvas, edit DEFAULT_CANVAS below (or the
 * data-canvas attribute on <html> in index.html). Users can also switch it in
 * Studio → Shape → Canvas; the choice is stored in localStorage.
 */
export type CanvasTheme = 'dark' | 'light';
export const DEFAULT_CANVAS: CanvasTheme = 'dark';

export interface CanvasColors {
  bgInner: string;
  bgOuter: string;
  edge: string;
  ring: string;
  ringAlpha: number;
  glow: string;
  geo: string;
  geoFill: string;
  blend: 'add' | 'over';
  gain: number;
  particle: Record<Mode, [number, number, number]>;
  thumbBg: string;
  thumbDots: string;
  thumbGeo: string;
  caption: string;
  captionAccent: string;
}

let probe: CanvasRenderingContext2D | null = null;
/** Normalise any CSS colour to [r,g,b] in 0..1. */
export function rgb01(css: string): [number, number, number] {
  probe ??= document.createElement('canvas').getContext('2d');
  if (!probe) return [1, 1, 1];
  probe.fillStyle = '#000';
  probe.fillStyle = css.trim() || '#fff';
  const v = probe.fillStyle as string; // "#rrggbb" or "rgba(...)"
  if (v.startsWith('#')) {
    const n = parseInt(v.slice(1, 7), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const m = v.match(/[\d.]+/g) || ['255', '255', '255'];
  return [Number(m[0]) / 255, Number(m[1]) / 255, Number(m[2]) / 255];
}

export function readCanvasColors(): CanvasColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    bgInner: v('--cv-bg-inner', '#2c3437'),
    bgOuter: v('--cv-bg-outer', '#1f2527'),
    edge: v('--cv-edge', 'rgba(255,255,255,0.08)'),
    ring: v('--cv-ring', '#8fb8c8'),
    ringAlpha: parseFloat(v('--cv-ring-alpha', '0.12')),
    glow: v('--cv-glow', 'rgba(143,184,200,0.10)'),
    geo: v('--cv-geo', 'rgba(230,232,235,0.55)'),
    geoFill: v('--cv-geo-fill', 'rgba(240,240,240,0.7)'),
    blend: v('--cv-blend', 'add') === 'over' ? 'over' : 'add',
    gain: parseFloat(v('--cv-gain', '0.55')),
    particle: {
      chladni: rgb01(v('--cv-p-chladni', '#f2cf86')),
      water: rgb01(v('--cv-p-water', '#c9e6f2')),
      mandala: rgb01(v('--cv-p-mandala', '#f0c27a')),
      xy: rgb01(v('--cv-p-xy', '#f5d99a')),
    },
    thumbBg: v('--cv-thumb-bg', '#262c2e'),
    thumbDots: v('--cv-thumb-dots', 'rgba(242,207,134,0.55)'),
    thumbGeo: v('--cv-thumb-geo', 'rgba(242,214,160,0.95)'),
    caption: v('--cv-caption', 'rgba(255,255,255,0.8)'),
    captionAccent: v('--cv-caption-accent', 'rgba(242,207,134,0.95)'),
  };
}

export function applyCanvasTheme(t: CanvasTheme) {
  document.documentElement.dataset.canvas = t;
}

/* --------------------------------------------------------------------------
 * Page theme (whole UI). Light = Neko-style base; dark = integrated with the
 * dark canvas. Stored under its own localStorage key so the inline script in
 * index.html can apply it before first paint (no flash).
 * ------------------------------------------------------------------------ */
export type ThemeMode = 'light' | 'dark';
export const THEME_KEY = 'aurea:theme';
export const DEFAULT_THEME: ThemeMode = 'light';
/** Browser UI colour (address bar etc.) per page theme; keep in sync with --bg in style.css. */
export const THEME_COLOR: Record<ThemeMode, string> = { light: '#f7f6f2', dark: '#121516' };

const isMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark';

/** Saved preference, or null if the user never chose one. */
export function savedTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isMode(v) ? v : null;
  } catch {
    return null;
  }
}

/** Current theme as applied on <html data-theme>. */
export function getTheme(): ThemeMode {
  const v = document.documentElement.dataset.theme;
  return isMode(v) ? v : savedTheme() ?? DEFAULT_THEME;
}

/** Apply to the document (attribute, color-scheme, theme-color meta) without persisting. */
export function applyTheme(t: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = t;
  root.style.colorScheme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[t]);
}

/** Apply and remember. */
export function setTheme(t: ThemeMode): void {
  applyTheme(t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage unavailable (private mode) — still applied for this session */
  }
}
