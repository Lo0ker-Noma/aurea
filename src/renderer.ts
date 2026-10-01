import type { Particles } from './particles';
import type { Mode } from './state';
import { drawGeometry } from './geometry';
import { readCanvasColors, type CanvasColors } from './theme';

const VERT = `
attribute vec2 aPos;
attribute float aBright;
attribute float aSeed;
uniform float uSize;
uniform float uScale;
varying float vB;
void main() {
  vec2 p = aPos * uScale;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  float s = uSize * (0.7 + 0.6 * aSeed);
  gl_PointSize = s;
  vB = aBright * (0.55 + 0.45 * aSeed);
}`;

const FRAG = `
precision mediump float;
uniform vec3 uColor;
uniform float uGain;
varying float vB;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  float a = exp(-r2 * 3.2) * vB * uGain;
  gl_FragColor = vec4(uColor * a, a);
}`;

/** Inset of the plate within the square stage (fraction of half-size). */
export const PLATE = 0.94;

export class Renderer {
  readonly stage: HTMLElement;
  readonly bg: HTMLCanvasElement;
  readonly gl: HTMLCanvasElement;
  readonly ov: HTMLCanvasElement;
  private ctx: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private c2: CanvasRenderingContext2D | null = null; // fallback particles
  private prog: WebGLProgram | null = null;
  private bufPos: WebGLBuffer | null = null;
  private bufBright: WebGLBuffer | null = null;
  private loc = { size: null as WebGLUniformLocation | null, scale: null as WebGLUniformLocation | null, color: null as WebGLUniformLocation | null, gain: null as WebGLUniformLocation | null };
  private max: number;
  px = 0; // backing size in device px
  css = 0;
  dpr = 1;
  kind: 'webgl2' | 'webgl' | '2d' = 'webgl';
  pointScale = 1;
  colors: CanvasColors = readCanvasColors();
  private mode: Mode = 'chladni';
  private geoSpec = '';
  private bgMode: Mode = 'chladni';
  private bgRings = true;
  onResize: (() => void) | null = null;

  constructor(stage: HTMLElement, maxParticles: number) {
    this.stage = stage;
    this.max = maxParticles;
    this.bg = this.mk('cv-bg');
    this.gl = this.mk('cv-gl');
    this.ov = this.mk('cv-ov');
    this.initGL();
    new ResizeObserver(() => this.resize()).observe(stage);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private mk(cls: string) {
    const c = document.createElement('canvas');
    c.className = `cv ${cls}`;
    this.stage.appendChild(c);
    return c;
  }

  private initGL() {
    const opts: WebGLContextAttributes = { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = this.gl.getContext('webgl2', opts) as WebGL2RenderingContext | null;
      if (gl) this.kind = 'webgl2';
      if (!gl) {
        gl = (this.gl.getContext('webgl', opts) || this.gl.getContext('experimental-webgl', opts)) as WebGLRenderingContext | null;
        if (gl) this.kind = 'webgl';
      }
    } catch {
      gl = null;
    }
    if (!gl) {
      this.kind = '2d';
      this.c2 = this.gl.getContext('2d');
      return;
    }
    this.ctx = gl;
    const sh = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    this.prog = p;
    gl.useProgram(p);
    this.loc.size = gl.getUniformLocation(p, 'uSize');
    this.loc.scale = gl.getUniformLocation(p, 'uScale');
    this.loc.color = gl.getUniformLocation(p, 'uColor');
    this.loc.gain = gl.getUniformLocation(p, 'uGain');

    this.bufPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.max * 8, gl.DYNAMIC_DRAW);
    const lp = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(lp);
    gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);

    this.bufBright = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufBright);
    gl.bufferData(gl.ARRAY_BUFFER, this.max * 4, gl.DYNAMIC_DRAW);
    const lb = gl.getAttribLocation(p, 'aBright');
    gl.enableVertexAttribArray(lb);
    gl.vertexAttribPointer(lb, 1, gl.FLOAT, false, 0, 0);

    const seeds = new Float32Array(this.max);
    for (let i = 0; i < this.max; i++) seeds[i] = Math.random();
    const bs = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bs);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const ls = gl.getAttribLocation(p, 'aSeed');
    gl.enableVertexAttribArray(ls);
    gl.vertexAttribPointer(ls, 1, gl.FLOAT, false, 0, 0);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    if (this.colors.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.gl.addEventListener('webglcontextlost', (e) => e.preventDefault());
    this.gl.addEventListener('webglcontextrestored', () => {
      this.initGL();
      this.resize();
    });
  }

  resize() {
    const rect = this.stage.getBoundingClientRect();
    const css = Math.max(1, Math.floor(Math.min(rect.width, rect.height || rect.width)));
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const px = Math.max(1, Math.round(css * dpr));
    if (px === this.px && css === this.css) return;
    this.px = px;
    this.css = css;
    this.dpr = dpr;
    for (const c of [this.bg, this.gl, this.ov]) {
      c.width = px;
      c.height = px;
    }
    if (this.ctx) this.ctx.viewport(0, 0, px, px);
    this.drawBg(this.bgMode, this.bgRings);
    this.drawOverlay(this.geoSpec, true);
    this.onResize?.();
  }

  drawBg(mode: Mode, rings: boolean) {
    this.bgMode = mode;
    this.bgRings = rings;
    const c = this.bg.getContext('2d');
    if (!c || !this.px) return;
    const S = this.px;
    const h = S / 2;
    const col = this.colors;
    c.clearRect(0, 0, S, S);
    const g = c.createRadialGradient(h, h * 0.9, 0, h, h, h * 1.15);
    g.addColorStop(0, col.bgInner);
    g.addColorStop(1, col.bgOuter);
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
    // plate edge
    const inset = h * (1 - PLATE);
    c.strokeStyle = col.edge;
    c.lineWidth = Math.max(1, this.dpr * 0.75);
    if (mode === 'mandala') {
      c.beginPath();
      c.arc(h, h, h * PLATE * 0.985, 0, Math.PI * 2);
      c.stroke();
    } else {
      c.strokeRect(inset, inset, S - 2 * inset, S - 2 * inset);
    }
    if (rings) {
      c.lineWidth = Math.max(1, this.dpr * 1.1);
      c.strokeStyle = col.ring;
      const n = mode === 'water' ? 9 : 5;
      for (let i = 1; i <= n; i++) {
        const r = (h * PLATE * i) / (n + 0.5);
        c.globalAlpha = col.ringAlpha * (mode === 'water' ? 1.25 : 1) * (1 - i / (n + 2));
        c.beginPath();
        c.arc(h, h, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = 1;
      const glow = c.createRadialGradient(h, h, 0, h, h, h * 0.35);
      glow.addColorStop(0, col.glow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = glow;
      c.fillRect(0, 0, S, S);
    }
  }

  drawOverlay(spec: string, force = false) {
    if (spec === this.geoSpec && !force) return;
    this.geoSpec = spec;
    const c = this.ov.getContext('2d');
    if (!c || !this.px) return;
    c.clearRect(0, 0, this.px, this.px);
    if (!spec || spec === 'none') return;
    const h = this.px / 2;
    drawGeometry(c, spec, h, h, h * PLATE * 0.97, {
      color: this.colors.geo,
      fillColor: this.colors.geoFill,
      width: Math.max(1, this.dpr * 1.05),
    });
  }

  /** Re-read the CSS canvas variables (after a theme switch) and repaint static layers. */
  refreshTheme() {
    this.colors = readCanvasColors();
    if (this.ctx) {
      const gl = this.ctx;
      if (this.colors.blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    this.drawBg(this.bgMode, this.bgRings);
    this.drawOverlay(this.geoSpec, true);
  }

  setMode(m: Mode) {
    this.mode = m;
  }

  draw(ps: Particles) {
    const n = ps.count;
    const sizeBase = (this.px / 420) * 2.4 * this.pointScale;
    if (this.ctx && this.prog) {
      const gl = this.ctx;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.pos.subarray(0, n * 2));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufBright);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.bright.subarray(0, n));
      gl.uniform1f(this.loc.size, Math.max(1.5, sizeBase));
      gl.uniform1f(this.loc.scale, PLATE);
      gl.uniform3fv(this.loc.color, this.colors.particle[this.mode]);
      gl.uniform1f(this.loc.gain, this.colors.gain * (this.mode === 'xy' ? 0.8 : 1));
      gl.drawArrays(gl.POINTS, 0, n);
    } else if (this.c2) {
      const c = this.c2;
      const S = this.px;
      const h = S / 2;
      c.clearRect(0, 0, S, S);
      c.globalCompositeOperation = this.colors.blend === 'add' ? 'lighter' : 'source-over';
      const [r, g, b] = this.colors.particle[this.mode];
      c.fillStyle = `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},0.35)`;
      const s = Math.max(1, sizeBase * 0.6);
      const pos = ps.pos;
      for (let i = 0; i < n; i++) {
        c.fillRect(h + pos[2 * i] * h * PLATE - s / 2, h + pos[2 * i + 1] * h * PLATE - s / 2, s, s);
      }
      c.globalCompositeOperation = 'source-over';
    }
  }

  /** Composite all layers into a PNG data URL. Call right after draw() in the same task. */
  snapshot(withGeo: boolean, caption: string | null): string {
    const S = this.px;
    const out = document.createElement('canvas');
    out.width = S;
    out.height = S;
    const c = out.getContext('2d')!;
    c.drawImage(this.bg, 0, 0);
    c.drawImage(this.gl, 0, 0);
    if (withGeo) c.drawImage(this.ov, 0, 0);
    if (caption) {
      const fs = Math.round(S * 0.026);
      c.font = `500 ${fs}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      c.fillStyle = this.colors.caption;
      c.textBaseline = 'bottom';
      c.fillText(caption, fs, S - fs * 0.8);
      c.font = `400 ${Math.round(fs * 1.3)}px Newsreader, Georgia, serif`;
      c.textAlign = 'right';
      c.fillStyle = this.colors.captionAccent;
      const logo = 'Áurea';
      c.fillText(logo, S - fs, S - fs * 0.8);
    }
    return out.toDataURL('image/png');
  }
}
