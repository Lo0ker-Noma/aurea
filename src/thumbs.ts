import { modesFor } from './field';
import { drawGeometry } from './geometry';
import type { Preset } from './presets';
import { readCanvasColors } from './theme';

/** Static preview: sparse particles sampled near the nodal lines + the geometry. */
export function renderThumb(canvas: HTMLCanvasElement, p: Preset) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const css = 72;
  const S = Math.round(css * dpr);
  canvas.width = S;
  canvas.height = S;
  const c = canvas.getContext('2d');
  if (!c) return;
  const col = readCanvasColors();
  c.fillStyle = col.thumbBg;
  c.fillRect(0, 0, S, S);
  const md = modesFor(p.freq);
  const h = Math.PI / 2;
  c.fillStyle = col.thumbDots;
  let seed = Math.floor(p.freq * 1000) | 1;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const ds = Math.max(1, dpr * 0.8);
  let placed = 0;
  for (let k = 0; k < 9000 && placed < 650; k++) {
    const x = rnd() * 2 - 1;
    const y = rnd() * 2 - 1;
    const u = x * h;
    const v = y * h;
    const f =
      Math.cos(md.n * u) * Math.cos(md.m * v) +
      md.s * Math.cos(md.m * u) * Math.cos(md.n * v) +
      md.w * Math.cos(md.K * h * Math.hypot(x, y));
    if (Math.abs(f) < 0.07) {
      c.fillRect(((x + 1) / 2) * S - ds / 2, ((y + 1) / 2) * S - ds / 2, ds, ds);
      placed++;
    }
  }
  drawGeometry(c, p.geo, S / 2, S / 2, S * 0.43, { color: col.thumbGeo, width: Math.max(1, dpr * 0.9), fillColor: col.thumbGeo });
}
