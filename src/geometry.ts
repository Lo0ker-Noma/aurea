/**
 * Procedural sacred-geometry overlays. Each drawer receives a 2D context whose
 * origin is the centre of the drawing and a radius R that the figure must fit in.
 */
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const SQ3 = Math.sqrt(3);
const PHI = (1 + Math.sqrt(5)) / 2;

function circle(c: Ctx, x: number, y: number, r: number) {
  c.moveTo(x + r, y);
  c.arc(x, y, r, 0, TAU);
}
function line(c: Ctx, x1: number, y1: number, x2: number, y2: number) {
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
}
function dot(c: Ctx, x: number, y: number, r: number) {
  c.moveTo(x + r, y);
  c.arc(x, y, r, 0, TAU);
}

/** 6 directions starting at 0° (horizontal), used by the hex-based figures. */
const dirs = (start = 0) => Array.from({ length: 6 }, (_, k) => start + (k * Math.PI) / 3);

function hexCentres(r: number, rings: number): [number, number][] {
  // axial lattice points within hex distance `rings`
  const out: [number, number][] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let s = Math.max(-rings, -q - rings); s <= Math.min(rings, -q + rings); s++) {
      out.push([r * (q + s / 2), r * ((s * SQ3) / 2)]);
    }
  }
  return out;
}

function fruitCentres(r: number): [number, number][] {
  const pts: [number, number][] = [[0, 0]];
  for (const a of dirs(0)) pts.push([2 * r * Math.cos(a), 2 * r * Math.sin(a)]);
  for (const a of dirs(0)) pts.push([4 * r * Math.cos(a), 4 * r * Math.sin(a)]);
  return pts;
}

interface Drawn {
  stroke: () => void;
  fill?: () => void;
}

function build(c: Ctx, spec: string, R: number): Drawn {
  const [kind, a1, a2] = spec.split(':');
  switch (kind) {
    case 'origin':
      return {
        stroke: () => {
          circle(c, 0, 0, R * 0.42);
          circle(c, 0, 0, R * 0.96);
          line(c, -R * 0.96, 0, R * 0.96, 0);
          line(c, 0, -R * 0.96, 0, R * 0.96);
        },
        fill: () => dot(c, 0, 0, R * 0.025),
      };
    case 'seed': {
      const r = R / 2.05;
      return {
        stroke: () => {
          circle(c, 0, 0, r);
          for (const a of dirs(Math.PI / 6)) circle(c, r * Math.cos(a), r * Math.sin(a), r);
          circle(c, 0, 0, 2 * r);
        },
      };
    }
    case 'flower': {
      const r = R / 3;
      return {
        stroke: () => {
          for (const [x, y] of hexCentres(r, 2)) circle(c, x, y, r);
          circle(c, 0, 0, 3 * r);
          circle(c, 0, 0, 3 * r * 1.02);
        },
      };
    }
    case 'fruit': {
      const r = R / 5.05;
      return { stroke: () => fruitCentres(r).forEach(([x, y]) => circle(c, x, y, r)) };
    }
    case 'metatron': {
      const r = R / 5.05;
      const pts = fruitCentres(r);
      return {
        stroke: () => {
          pts.forEach(([x, y]) => circle(c, x, y, r));
          for (let i = 0; i < pts.length; i++)
            for (let j = i + 1; j < pts.length; j++) line(c, pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
        },
      };
    }
    case 'tree': {
      const u = R * 0.46;
      const X = 0.866 * u;
      const s: [number, number][] = [
        [0, 0], [X, 0.5], [-X, 0.5], [X, 1.5], [-X, 1.5], [0, 2], [X, 2.5], [-X, 2.5], [0, 3], [0, 4],
      ].map(([x, y]) => [x, (y - 2) * u] as [number, number]);
      const paths = [
        [0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5], [3, 6],
        [4, 5], [4, 7], [5, 6], [5, 7], [5, 8], [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9],
      ];
      const cr = R * 0.1;
      return {
        stroke: () => {
          for (const [i, j] of paths) {
            const [x1, y1] = s[i];
            const [x2, y2] = s[j];
            const d = Math.hypot(x2 - x1, y2 - y1);
            const ux = (x2 - x1) / d;
            const uy = (y2 - y1) / d;
            line(c, x1 + ux * cr, y1 + uy * cr, x2 - ux * cr, y2 - uy * cr);
          }
          for (const [x, y] of s) circle(c, x, y, cr);
        },
      };
    }
    case 'vesica': {
      const r = R * 0.55;
      const d = r / 2;
      const h = (r * SQ3) / 2;
      return {
        stroke: () => {
          circle(c, -d, 0, r);
          circle(c, d, 0, r);
          line(c, 0, -h, 0, h);
          line(c, -d - r, 0, d + r, 0);
          c.moveTo(-d, 0); c.lineTo(0, -h); c.lineTo(d, 0); c.lineTo(0, h); c.closePath();
          c.moveTo(-d, 0); c.lineTo(d, 0);
          circle(c, 0, 0, R * 0.96);
        },
      };
    }
    case 'harmonic':
      return {
        stroke: () => {
          for (let i = 1; i <= 5; i++) circle(c, 0, 0, (R * 0.96 * i) / 5);
          for (let k = 0; k < 24; k++) {
            const a = (k * TAU) / 24;
            const r0 = k % 2 ? R * 0.384 : R * 0.192;
            line(c, r0 * Math.cos(a), r0 * Math.sin(a), R * 0.96 * Math.cos(a), R * 0.96 * Math.sin(a));
          }
        },
        fill: () => dot(c, 0, 0, R * 0.02),
      };
    case 'torus': {
      const r = R * 0.48;
      return {
        stroke: () => {
          for (let k = 0; k < 12; k++) {
            const a = (k * TAU) / 12;
            circle(c, r * Math.cos(a), r * Math.sin(a), r);
          }
        },
      };
    }
    case 'trinity': {
      const r = R * 0.45;
      const o = R * 0.3;
      return {
        stroke: () => {
          for (let k = 0; k < 3; k++) {
            const a = -Math.PI / 2 + (k * TAU) / 3;
            circle(c, o * Math.cos(a), o * Math.sin(a), r);
          }
          circle(c, 0, 0, R * 0.96);
          // inscribed triangle
          for (let k = 0; k < 3; k++) {
            const a = -Math.PI / 2 + (k * TAU) / 3;
            const b = a + TAU / 3;
            line(c, R * 0.96 * Math.cos(a), R * 0.96 * Math.sin(a), R * 0.96 * Math.cos(b), R * 0.96 * Math.sin(b));
          }
        },
      };
    }
    case 'globe':
      return {
        stroke: () => {
          const r = R * 0.9;
          circle(c, 0, 0, r);
          for (const f of [0.35, 0.7]) {
            c.moveTo(r * f, 0);
            c.ellipse(0, 0, r * f, r, 0, 0, TAU);
          }
          line(c, 0, -r, 0, r);
          for (const lat of [-0.66, -0.33, 0, 0.33, 0.66]) {
            const y = r * Math.sin((lat * Math.PI) / 2);
            const w = Math.sqrt(r * r - y * y);
            line(c, -w, y, w, y);
          }
          circle(c, 0, 0, R * 0.98);
        },
      };
    case 'spiral': {
      return {
        stroke: () => {
          // golden rectangle subdivision with quarter arcs
          let w = R * 1.9;
          let h = w / PHI;
          let x = -w / 2;
          let y = -h / 2;
          c.rect(x, y, w, h);
          for (let i = 0; i < 10; i++) {
            const dir = i % 4;
            if (dir === 0) {
              const s = h; // square on the left
              c.rect(x, y, s, s);
              c.moveTo(x, y + s);
              c.arc(x + s, y + s, s, Math.PI, Math.PI * 1.5);
              x += s; w -= s;
            } else if (dir === 1) {
              const s = w; // square on top
              c.rect(x, y, s, s);
              c.moveTo(x, y);
              c.arc(x, y + s, s, Math.PI * 1.5, TAU);
              y += s; h -= s;
            } else if (dir === 2) {
              const s = h; // square on the right
              c.rect(x + w - s, y, s, s);
              c.moveTo(x + w, y);
              c.arc(x + w - s, y, s, 0, Math.PI / 2);
              w -= s;
            } else {
              const s = w; // square at the bottom
              c.rect(x, y + h - s, s, s);
              c.moveTo(x + s, y + h);
              c.arc(x + s, y + h - s, s, Math.PI / 2, Math.PI);
              h -= s;
            }
          }
        },
      };
    }
    case 'phyllo': {
      const N = 233;
      const ga = Math.PI * (3 - Math.sqrt(5));
      return {
        stroke: () => circle(c, 0, 0, R * 0.98),
        fill: () => {
          for (let i = 1; i <= N; i++) {
            const rr = R * 0.92 * Math.sqrt(i / N);
            const a = i * ga;
            dot(c, rr * Math.cos(a), rr * Math.sin(a), R * (0.012 + 0.018 * Math.sqrt(i / N)));
          }
        },
      };
    }
    case 'star': {
      const n = Math.max(3, parseInt(a1 || '5', 10));
      const k = Math.max(1, parseInt(a2 || '2', 10));
      const r = R * 0.94;
      const pt = (i: number): [number, number] => {
        const a = -Math.PI / 2 + (i * TAU) / n;
        return [r * Math.cos(a), r * Math.sin(a)];
      };
      return {
        stroke: () => {
          circle(c, 0, 0, R * 0.96);
          for (let i = 0; i < n; i++) {
            const [x1, y1] = pt(i);
            const [x2, y2] = pt(i + k);
            line(c, x1, y1, x2, y2);
            if (k > 1) {
              const [x3, y3] = pt(i + 1);
              line(c, x1, y1, x3, y3);
            }
          }
          // inner circle tangent to the star lines
          circle(c, 0, 0, r * Math.cos((Math.PI * k) / n));
        },
      };
    }
    default:
      return { stroke: () => undefined };
  }
}

export interface GeoStyle {
  color: string;
  width: number;
  glow?: number;
  fillColor?: string;
}

export function drawGeometry(c: Ctx, spec: string, cx: number, cy: number, R: number, style: GeoStyle): void {
  if (!spec || spec === 'none') return;
  c.save();
  c.translate(cx, cy);
  c.lineWidth = style.width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = style.color;
  if (style.glow) {
    c.shadowColor = style.color;
    c.shadowBlur = style.glow;
  }
  const d = build(c, spec, R);
  c.beginPath();
  d.stroke();
  c.stroke();
  if (d.fill) {
    c.fillStyle = style.fillColor ?? style.color;
    c.beginPath();
    d.fill();
    c.fill();
  }
  c.restore();
}
