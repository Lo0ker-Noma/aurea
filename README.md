# Áurea

**Real-time cymatics & sacred geometry in the browser.** Áurea generates a pure tone with the Web Audio API and shows the *cymatic* figure it draws: thousands of particles migrate to the nodal lines of a vibrating Chladni plate, with the preset's sacred-geometry drawing overlaid. 100 % client-side — no accounts, no payments, no backend.

> **ES ·** Áurea genera un tono en tiempo real en tu navegador y muestra la figura cimática que dibuja: miles de partículas se mueven hacia las líneas nodales de una placa de Chladni, con la geometría sagrada del preset superpuesta. Todo ocurre en tu dispositivo: sin cuentas, sin pagos, sin servidor. Interfaz en español e inglés, con modo claro y oscuro.

## Features

- **Explore / Explorar** — square particle canvas (WebGL) + collapsible panel: preset name, detail line (category · frequency · nearest note with cents, e.g. `963.00 Hz · Si5 −44¢` / `B5 −44¢`), category chips (Sacred geometry, Solfeggio, Creation numbers, Fibonacci, Intentions), thumbnail strip, 4 visualization modes and Play/Pause.
  - **Chladni** – square-plate standing waves; **Water** – ripple interference of point sources; **Mandala** – radially symmetric polar modes (slowly rotating); **XY** – oscilloscope Lissajous figure (live waveform delay-embedding for mic/file input).
- **Meditate / Meditar** — breathing ring (5.5 s inhale / 5.5 s exhale), *Inhala/Exhala* cue, 5/10/20 min timer, start/stop, tone with soft fade-in/out and a gentle bell at the end.
- **Studio / Estudio** — sub-tabs:
  - **Shape**: mode, geometry overlay, background rings, canvas theme (dark/light), particle density and size.
  - **Sound**: A = 440/432 reference (affects note names and cents), source **Tone / Mic / File**, log frequency slider + numeric input, **×φ / ÷φ** golden-ratio multipliers, ±octave, waveform, volume.
  - **Analysis**: detected frequency and note, spectral peaks (AnalyserNode FFT 16k, local-maximum peak picking + parabolic interpolation, median smoothing), live spectrum, range and threshold. With mic/file the visualization follows the detected dominant frequency.
  - **Output**: export a PNG of the canvas (optional geometry and caption).
  - **MIDI**: Web MIDI note-on → frequency using the current reference tuning; status display and graceful fallback where Web MIDI is unsupported (Safari/iOS).
- **Dark mode** — page-wide light/dark switch (sun/moon button in the header, or `D`). Light (Neko-style) is the default; the choice is saved in `localStorage` (`aurea:theme`) and applied by an inline script before first paint, so there is no flash. The browser `theme-color` follows the theme.
- **Volume & background listening** — a volume bar with a mute toggle sits under Play/Pause in *Explore*, under the button in *Meditate* and in *Studio → Sound* (all synced). It drives one master `GainNode` for every audible source (tone, audio file, meditation bell) with a perceptual curve (`gain = v²`, so the low, background range is fine-grained) and `setTargetAtTime` ramps (no clicks). Volume (default 60 %) and mute are saved in `localStorage`. Audio keeps playing when the tab is hidden or loses focus; if the OS suspends/interrupts the `AudioContext` it is resumed on the next visibility change, focus or tap. Meditation fade-out and bell are scheduled on the audio clock, so they're on time in a background tab. Media Session metadata (preset · Hz, “Áurea by Looker”) and play/pause/stop handlers enable lock-screen / notification controls where supported. Nothing plays before the first tap.
- Help modal (bilingual), ES/EN toggle, keyboard shortcuts (`Space`, `1` `2` `3`, `D`, `?`).
- Persists language, last preset, tuning, mode and other preferences in `localStorage`.
- Mobile-first & responsive, handles `devicePixelRatio`/resize, respects `prefers-reduced-motion`, audio only starts from a user gesture (iOS-safe).

### Presets

| Category | Presets (Hz) |
|---|---|
| Sacred geometry | El Origen · El Uno 136.10 · Semilla de la vida 417 · Flor de la vida 528 · Fruto de la vida 639 · Cubo de Metatrón 852 · Árbol de la vida 963 · Vesica piscis 396 · Campo armónico 432 · Toroide 216 |
| Solfeggio | 174 · 285 · 396 · 417 · 528 · 639 · 741 · 852 · 963 |
| Creation numbers | 108 · 111 · Schumann × 32 = 250.56 · Scientific C 256 · 333 · 432 · 444 |
| Fibonacci | 89 · 144 · φ 161.80 · 233 · 377 · 610 · 987 |
| Intentions | Manifestar 528 · Abundancia 888 · Prosperar 417 · Gratitud 639 · Visión 852 · Corona abierta 963 · Sanar 285 · Descanso 174 |

## How it works

- **Frequency → modes.** A square plate's eigenfrequencies grow with *n² + m²*, so the overall wavenumber *K = √(n² + m²)* grows with log-frequency (compressed to stay legible); the *n : m* ratio and the symmetric/antisymmetric mix are smooth deterministic functions of log₂ f. The same frequency always yields the same figure, and sweeping the slider morphs it continuously (`src/field.ts`).
- **Particles.** The field is sampled on a 128² grid; each particle takes a damped Newton step toward the nearest nodal line, is shaken in proportion to the local vibration amplitude and diffuses along the line (`src/particles.ts`). The CPU update is ~0.7 ms per frame for 18 000 particles on a laptop; positions are streamed into a single WebGL `POINTS` draw with additive (dark) or alpha (light) blending (`src/renderer.ts`). WebGL2 → WebGL1 → Canvas2D fallback. Particle count adapts to device and measured frame time.
- **Theming.** Two independent axes, both driven by CSS custom properties in `src/style.css`:
  - **Page theme** (`<html data-theme="light|dark">`): all UI tokens (backgrounds, cards, text, borders, buttons, header, modal). API in `src/theme.ts` (`ThemeMode`, `getTheme`, `setTheme`, `applyTheme`); default `DEFAULT_THEME = 'light'` (`prefers-color-scheme` is intentionally ignored to keep the light Neko base).
  - **Canvas theme**: all canvas colours. The canvas has two themes: `:root[data-canvas="dark"]` (default — a soft slate card with golden particles) and `:root[data-canvas="light"]` (white card with blue dots). Switch at runtime in *Studio → Shape → Canvas*, or change the default in `src/theme.ts` (`DEFAULT_CANVAS`) and `index.html` (`data-canvas`).

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + static build into dist/
npm run preview   # serve dist/ on http://localhost:4173
```

Requires Node 20.19+ (or 22+). Microphone and Web MIDI need a secure context (`localhost` or HTTPS).

## Deploy to Vercel

The project is a standard Vite app, so Vercel detects it with zero configuration:

1. Push the repo to GitHub.
2. In Vercel → *Add New Project* → import the repo. Framework preset **Vite**, build command `npm run build`, output directory `dist` (all auto-detected).
3. Deploy. (Or from the CLI: `npx vercel` then `npx vercel --prod`.)

## Tech

Vite + vanilla TypeScript, Web Audio API, WebGL, Web MIDI. No runtime dependencies other than self-hosted fonts (`@fontsource` IBM Plex Sans / Mono and Newsreader — bundled into `dist/`, no CDN).

---

*Áurea is an artistic and relaxation tool, not a medical device.*
