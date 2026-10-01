import '@fontsource/ibm-plex-sans/latin-300.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/newsreader/latin-300.css';
import '@fontsource/newsreader/latin-400.css';
import './style.css';

import { AudioEngine } from './audio';
import { Field, modesFor } from './field';
import { applyI18n, setLang, t, type I18nKey } from './i18n';
import { ICONS } from './icons';
import { Midi } from './midi';
import { PHI, clamp, freqToSlider, hz, hzCompact, midiName, midiToFreq, noteInfo, sliderToFreq } from './notes';
import { Particles, ratioFor } from './particles';
import { GEOMETRIES, PRESETS, presetById, type Preset } from './presets';
import { Renderer } from './renderer';
import { store, type Mode, type State, type Tab } from './state';
import { applyCanvasTheme, applyTheme, getTheme, setTheme, type ThemeMode } from './theme';
import { renderThumb } from './thumbs';
import { LN_ADDRESS, appTemplate } from './ui';

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;

// ---------- boot ----------
const S = () => store.get();
setLang(S().lang);
document.documentElement.lang = S().lang;
applyCanvasTheme(S().canvasTheme);
applyTheme(getTheme()); // already set pre-paint by index.html; this syncs meta/color-scheme

const app = $('#app');
app.innerHTML = appTemplate();
applyI18n();

const MAX = 30000;
const renderer = new Renderer($('#stage'), MAX);
const field = new Field(128);
const particles = new Particles(MAX, targetCount());
const audio = new AudioEngine();
audio.setVolume(S().volume, S().muted); // stored volume applies as soon as the context exists
const midi = new Midi();

// ---------- helpers ----------
function targetCount(): number {
  switch (S().density) {
    case 'low':
      return 6000;
    case 'mid':
      return 12000;
    case 'high':
      return 24000;
    default:
      return coarse || window.innerWidth < 700 ? 12000 : 18000;
  }
}

const preset = (): Preset => presetById(S().presetId);
const presetName = (p: Preset) => (S().lang === 'es' ? p.es : p.en);
const fmtFreqShort = (f: number) => (Math.abs(f - Math.round(f)) < 1e-6 ? `${Math.round(f)}` : f.toFixed(2).replace(/0$/, ''));

let toastTimer = 0;
function toast(msg: string) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- frequency & audio ----------
function setFreq(f: number, phiPow = 0) {
  const nf = clamp(f, 20, 4000);
  store.set({ freq: nf, phiPow });
  audio.setFreq(nf, 0.05);
}

function startPlayback() {
  const s = S();
  if (!audio.ensure()) {
    toast('Web Audio not supported');
    return;
  }
  if (s.source === 'tone') {
    audio.startTone(s.freq, 0.15);
    store.set({ playing: true });
  } else if (s.source === 'file') {
    if (audio.hasFile) {
      audio.resumeFile();
      store.set({ playing: true });
    } else $<HTMLInputElement>('#fileInput').click();
  } else {
    void setSource('mic');
  }
}

function stopPlayback() {
  const s = S();
  if (s.medRunning) stopMeditation(false);
  if (s.source === 'tone') audio.stopTone(0.2);
  else if (s.source === 'file') audio.pauseFile();
  else audio.stopInputs();
  if (s.source === 'mic') store.set({ source: 'tone' });
  store.set({ playing: false });
}

function togglePlay() {
  if (S().playing) stopPlayback();
  else startPlayback();
}

async function setSource(src: State['source']) {
  const s = S();
  if (src === 'tone') {
    audio.stopInputs();
    store.set({ source: 'tone' });
    if (s.playing) audio.startTone(s.freq);
    return;
  }
  audio.ensure(); // inside the gesture
  audio.stopTone(0.1);
  if (src === 'mic') {
    store.set({ source: 'mic', playing: false });
    $('#srcStatus').textContent = '…';
    const ok = await audio.startMic();
    if (ok) {
      store.set({ source: 'mic', playing: true });
    } else {
      store.set({ source: 'tone', playing: false });
      $('#srcStatus').textContent = t('st.micDenied');
      toast(t('st.micDenied'));
      return;
    }
  } else {
    audio.stopInputs();
    store.set({ source: 'file', playing: false });
    if (audio.hasFile) {
      audio.resumeFile();
      store.set({ playing: true });
    } else $<HTMLInputElement>('#fileInput').click();
  }
  updateSourceUI();
}

function selectPreset(id: string) {
  const p = presetById(id);
  store.set({ presetId: p.id, freq: p.freq, phiPow: 0 });
  if (S().source === 'tone') audio.setFreq(p.freq, 0.08);
  particles.scatter(0.04);
}

// ---------- meditation ----------
let medStart = 0;
let medEnd = 0;
let medDone = false;

function startMeditation() {
  if (!audio.ensure()) return;
  audio.stopInputs();
  const p = preset();
  store.set({ source: 'tone', freq: p.freq, phiPow: 0 });
  audio.startTone(p.freq, 4);
  medStart = performance.now();
  medEnd = medStart + S().medDuration * 60000;
  medDone = false;
  // fade-out + bell live on the audio clock, so they're on time even in a hidden tab
  audio.scheduleSessionEnd(S().medDuration * 60);
  store.set({ medRunning: true, playing: true });
}

function stopMeditation(done: boolean) {
  if (!done) audio.cancelSessionEnd(); // when done, the bell is already scheduled
  audio.stopTone(done ? 0.3 : 2.5);
  medDone = done;
  store.set({ medRunning: false, playing: false });
  if (done) {
    window.setTimeout(() => {
      medDone = false;
    }, 8000);
  }
}

// ---------- analysis state ----------
let detected: number | null = null;
let peaks: { freq: number; db: number }[] = [];
let level = -120;
const hist: number[] = [];
let vizFreq = S().freq;
let xyPhase = 0;

function analyse() {
  if (!audio.ctx) {
    peaks = [];
    detected = null;
    return;
  }
  const s = S();
  level = audio.level();
  peaks = level > -95 ? audio.peaks(s.rangeLo, s.rangeHi, s.sensitivity, 4) : [];
  if (peaks.length) {
    hist.push(peaks[0].freq);
    if (hist.length > 7) hist.shift();
    const sorted = [...hist].sort((a, b) => a - b);
    detected = sorted[sorted.length >> 1];
  } else {
    if (hist.length) hist.shift();
    if (!hist.length) detected = null;
  }
}

// ---------- UI construction ----------
const thumbCache = new Map<string, HTMLCanvasElement>();

function thumbFor(p: Preset): HTMLCanvasElement {
  let c = thumbCache.get(p.id);
  if (!c) {
    c = document.createElement('canvas');
    renderThumb(c, p);
    thumbCache.set(p.id, c);
  }
  return c;
}

function buildThumbs() {
  const wrap = $('#thumbs');
  wrap.innerHTML = '';
  const s = S();
  for (const p of PRESETS.filter((x) => x.cat === s.category)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.dataset.id = p.id;
    const label = p.cat === 'geo' ? presetName(p) : `${presetName(p)} · ${fmtFreqShort(p.freq)} Hz`;
    b.title = `${presetName(p)} · ${hz(p.freq)}`;
    const img = document.createElement('span');
    img.className = 'thumb-img';
    img.appendChild(thumbFor(p));
    const l = document.createElement('span');
    l.className = 'thumb-l';
    l.textContent = label;
    b.append(img, l);
    b.addEventListener('click', () => selectPreset(p.id));
    wrap.appendChild(b);
  }
  markThumbs(true);
}

function markThumbs(scroll = false) {
  const id = S().presetId;
  $$('#thumbs .thumb').forEach((b) => {
    const on = b.dataset.id === id;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    if (on && scroll) {
      const wrap = b.parentElement!;
      wrap.scrollLeft = Math.max(0, b.offsetLeft - wrap.clientWidth / 2 + b.clientWidth / 2);
    }
  });
}

function fillSelects() {
  const s = S();
  $$<HTMLOptionElement>('#medPreset option').forEach((o) => {
    const p = presetById(o.value);
    o.textContent = `${presetName(p)} — ${fmtFreqShort(p.freq)} Hz`;
  });
  $$<HTMLElement>('#medPreset optgroup').forEach((g) => g.setAttribute('label', t(`cat.${g.dataset.cat}` as I18nKey)));
  $<HTMLSelectElement>('#medPreset').value = s.presetId;
  const geo = $<HTMLSelectElement>('#geoSel');
  geo.innerHTML =
    `<option value="preset">${t('st.geoPreset')}</option><option value="none">${t('st.geoNone')}</option>` +
    GEOMETRIES.map((g) => `<option value="${g.id}">${s.lang === 'es' ? g.es : g.en}</option>`).join('');
  geo.value = s.overlay;
  const tun = $<HTMLSelectElement>('#tuningSel');
  tun.options[0].textContent = s.lang === 'es' ? 'La = 440 Hz' : 'A = 440 Hz';
  tun.options[1].textContent = s.lang === 'es' ? 'La = 432 Hz' : 'A = 432 Hz';
  tun.value = String(s.tuning);
}

function setSeg(sel: string, attr: string, value: string) {
  $$(`${sel} [data-${attr}]`).forEach((b) => {
    const on = b.dataset[attr] === value;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function updateHeader() {
  const s = S();
  document.body.dataset.tab = s.tab;
  $$('.tab').forEach((b) => {
    const on = b.dataset.tab === s.tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', String(on));
  });
  $$('.lang [data-lang]').forEach((b) => b.classList.toggle('on', b.dataset.lang === s.lang));
  $('#langMini').textContent = s.lang.toUpperCase();
  updateThemeBtn();
}

function updateThemeBtn() {
  const dark = getTheme() === 'dark';
  const b = $('#themeBtn');
  const label = t(dark ? 'theme.toLight' : 'theme.toDark');
  b.setAttribute('aria-label', label);
  b.title = label;
  b.setAttribute('aria-pressed', String(dark));
}

function switchTheme(next: ThemeMode = getTheme() === 'dark' ? 'light' : 'dark') {
  setTheme(next);
  updateThemeBtn();
  // canvas colours may depend on the page theme (e.g. softened light canvas on a dark page)
  renderer.refreshTheme();
  thumbCache.clear();
  buildThumbs();
}

function updatePresetInfo() {
  const s = S();
  const p = preset();
  const n = noteInfo(s.freq, s.tuning, s.lang);
  $('#pName').textContent = presetName(p);
  $('#pDetail').textContent = `${t(`cat.${p.cat}` as I18nKey)} · ${hz(s.freq).replace(' ', '\u00a0')} · ${n.label}`;
  $('#medDetail').textContent = `${presetName(p)} · ${hz(p.freq)} · ${noteInfo(p.freq, s.tuning, s.lang).label}`;
  $<HTMLSelectElement>('#medPreset').value = p.id;
}

function updatePlayUI() {
  const s = S();
  const pb = $('#playBtn');
  pb.querySelector('.ico')!.innerHTML = s.playing ? ICONS.pause : ICONS.play;
  pb.querySelector('.lbl')!.textContent = t(s.playing ? 'pause' : 'play');
  pb.classList.toggle('on', s.playing);
  const sb = $('#soundBtn');
  sb.querySelector('.ico')!.innerHTML = s.playing ? ICONS.pause : ICONS.play;
  sb.querySelector('.lbl')!.textContent = t(s.playing ? 'st.pauseSound' : 'st.playSound');
  sb.classList.toggle('on', s.playing);
  $('#tapHint').classList.toggle('hide', s.playing);
  $('#medBtn').textContent = t(s.medRunning ? 'med.stop' : 'med.start');
  $('#medBtn').classList.toggle('on', s.medRunning);
}

function updateSourceUI() {
  const s = S();
  setSeg('#srcSeg', 'src', s.source);
  $('#fileRow').classList.toggle('show', s.source === 'file');
  const st = $('#srcStatus');
  if (s.source === 'mic' && s.playing) st.textContent = t('st.micOn');
  else if (s.source === 'file') st.textContent = t('st.fileHint');
  else if (st.textContent !== t('st.micDenied')) st.textContent = '';
  $('.stage').classList.toggle('live-input', s.source !== 'tone');
}

function updateStudioValues() {
  const s = S();
  $('#freqVal').textContent = hz(s.freq);
  const fr = $<HTMLInputElement>('#freqRange');
  if (document.activeElement !== fr) fr.value = String(freqToSlider(s.freq));
  const fn = $<HTMLInputElement>('#freqNum');
  if (document.activeElement !== fn) fn.value = s.freq.toFixed(2);
  updateVolumeUI();
  $<HTMLInputElement>('#sizeRange').value = String(s.pointSize);
  $('#sizeVal').textContent = `${s.pointSize.toFixed(2)}×`;
  $<HTMLInputElement>('#loRange').value = String(freqToSlider(s.rangeLo, 20, 8000));
  $<HTMLInputElement>('#hiRange').value = String(freqToSlider(s.rangeHi, 20, 8000));
  $('#loVal').textContent = hzCompact(s.rangeLo);
  $('#hiVal').textContent = hzCompact(s.rangeHi);
  $<HTMLInputElement>('#sensRange').value = String(s.sensitivity);
  $('#sensVal').textContent = `${s.sensitivity} dB`;
  $<HTMLInputElement>('#ringsChk').checked = s.showRings;
  $<HTMLInputElement>('#expGeo').checked = s.exportGeo;
  $<HTMLInputElement>('#expCap').checked = s.exportCaption;
  setSeg('#modeSeg', 'mode', s.mode);
  setSeg('#modeSeg2', 'mode', s.mode);
  setSeg('#densSeg', 'dens', s.density);
  setSeg('#waveSeg', 'wave', s.waveform);
  setSeg('#durSeg', 'dur', String(s.medDuration));
  setSeg('#canvasSeg', 'canvas', s.canvasTheme);
  $$('.subtabs [data-sub]').forEach((b) => b.classList.toggle('on', b.dataset.sub === s.studioSub));
  $$('.pane').forEach((p) => p.classList.toggle('on', p.dataset.pane === s.studioSub));
  $('#chips')
    .querySelectorAll<HTMLElement>('.chip')
    .forEach((c) => c.classList.toggle('on', c.dataset.cat === s.category));
  $('.panel[data-view="explore"]').classList.toggle('collapsed', s.panelCollapsed);
  $('#collapseBtn').setAttribute('aria-expanded', String(!s.panelCollapsed));
}

// ---------- volume ----------
function volIcon(v: number, muted: boolean): string {
  if (muted || v <= 0) return ICONS.volMute;
  return v < 0.4 ? ICONS.volLow : ICONS.volHigh;
}
function updateVolumeUI() {
  const s = S();
  const pct = Math.round(s.volume * 100);
  const silent = s.muted || s.volume <= 0;
  const txt = s.muted ? `${t('vol.label')}: ${pct}% (${t('vol.mute')})` : `${t('vol.label')}: ${pct}%`;
  $$('.vol-row').forEach((row) => {
    row.classList.toggle('muted', silent);
    const r = $<HTMLInputElement>('.vol-range', row);
    if (document.activeElement !== r || r.value !== String(s.volume)) r.value = String(s.volume);
    r.style.setProperty('--p', `${s.muted ? 0 : pct}%`);
    r.setAttribute('aria-valuetext', txt);
    $('.vol-val', row).textContent = `${pct}%`;
    const b = $<HTMLButtonElement>('.vol-mute', row);
    const icon = volIcon(s.volume, s.muted);
    if (b.dataset.icon !== icon) {
      b.innerHTML = icon;
      b.dataset.icon = icon;
    }
    b.setAttribute('aria-pressed', String(s.muted));
    const lbl = t(silent ? 'vol.unmute' : 'vol.mute');
    b.setAttribute('aria-label', lbl);
    b.title = lbl;
  });
}
function setVolume(v: number, muted: boolean) {
  store.set({ volume: clamp(v, 0, 1), muted });
  audio.setVolume(S().volume, S().muted);
}

function updateMidiUI() {
  const map: Record<string, I18nKey> = {
    unsupported: 'midi.unsupported',
    idle: 'midi.idle',
    connecting: 'midi.connecting',
    connected: 'midi.connected',
    nodevices: 'midi.noDevices',
    denied: 'midi.denied',
  };
  $('#midiStatus').textContent = t(map[midi.status]);
  $('#midiDot').dataset.state = midi.status;
  $('#midiDevices').textContent = midi.devices.length ? midi.devices.join(', ') : '—';
  const btn = $<HTMLButtonElement>('#midiBtn');
  btn.disabled = midi.status === 'unsupported' || midi.status === 'connecting';
  btn.hidden = midi.status === 'unsupported' || midi.status === 'connected';
}

function overlaySpec(): string {
  const s = S();
  if (s.tab === 'meditate') return 'none';
  if (s.tab === 'studio') return s.overlay === 'preset' ? preset().geo : s.overlay;
  return preset().geo;
}

function refreshCanvasStatic() {
  const s = S();
  renderer.setMode(s.mode);
  renderer.drawBg(s.mode, s.showRings);
  renderer.drawOverlay(s.mode === 'xy' && s.tab !== 'studio' ? preset().geo : overlaySpec());
}

function renderAll() {
  updateHeader();
  updatePresetInfo();
  updatePlayUI();
  updateSourceUI();
  updateStudioValues();
  updateMidiUI();
  refreshCanvasStatic();
}

// ---------- events ----------
$$('.tab').forEach((b) =>
  b.addEventListener('click', () => {
    store.set({ tab: b.dataset.tab as Tab });
    window.scrollTo({ top: 0 });
  }),
);
$$('.lang [data-lang]').forEach((b) => b.addEventListener('click', () => store.set({ lang: b.dataset.lang as State['lang'] })));
$('#helpBtn').addEventListener('click', () => openHelp());
$('#themeBtn').addEventListener('click', () => switchTheme());
$('#langMini').addEventListener('click', () => store.set({ lang: S().lang === 'es' ? 'en' : 'es' }));
$('#helpClose').addEventListener('click', () => closeHelp());
$('#helpModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeHelp();
});

let lastFocus: HTMLElement | null = null;
function openHelp() {
  lastFocus = document.activeElement as HTMLElement;
  const m = $('#helpModal');
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('open'));
  $('#helpClose').focus();
}
function closeHelp() {
  const m = $('#helpModal');
  m.classList.remove('open');
  window.setTimeout(() => (m.hidden = true), 180);
  lastFocus?.focus?.();
}

// ---------- donate (frosted-glass popup) ----------
let donateLastFocus: HTMLElement | null = null;
let donateCloseTimer = 0;
const donateOpen = () => !$('#donateModal').hidden;
function openDonate() {
  const m = $('#donateModal');
  clearTimeout(donateCloseTimer);
  donateLastFocus = document.activeElement as HTMLElement;
  m.hidden = false;
  document.body.classList.add('dn-lock');
  void m.offsetWidth; // start the transition from the hidden state
  m.classList.add('open');
  $('#donateBtn').setAttribute('aria-expanded', 'true');
  $('#donateClose').focus();
}
function closeDonate() {
  const m = $('#donateModal');
  if (m.hidden) return;
  m.classList.remove('open');
  document.body.classList.remove('dn-lock');
  $('#donateBtn').setAttribute('aria-expanded', 'false');
  donateCloseTimer = window.setTimeout(() => (m.hidden = true), 220);
  (donateLastFocus ?? $('#donateBtn')).focus?.();
}
$('#donateBtn').addEventListener('click', openDonate);
$('#donateClose').addEventListener('click', closeDonate);
$('#donateModal [data-dn-close]').addEventListener('click', closeDonate);
$('#donateModal').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeDonate();
    return;
  }
  if (e.key !== 'Tab') return;
  // focus trap
  const f = $$<HTMLElement>('.dn-card button, .dn-card a[href]').filter((el) => el.offsetParent !== null);
  const first = f[0];
  const lastEl = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    lastEl.focus();
  } else if (!e.shiftKey && document.activeElement === lastEl) {
    e.preventDefault();
    first.focus();
  }
});
$('#donateCopy').addEventListener('click', async () => {
  let ok = false;
  try {
    await navigator.clipboard.writeText(LN_ADDRESS);
    ok = true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = LN_ADDRESS;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
  }
  if (ok) {
    const b = $('#donateCopy');
    b.classList.add('done');
    window.setTimeout(() => b.classList.remove('done'), 1600);
    toast(t('donate.copied'));
  } else toast(LN_ADDRESS);
});

$$('#chips .chip').forEach((c) =>
  c.addEventListener('click', () => store.set({ category: c.dataset.cat as State['category'] })),
);
$('#collapseBtn').addEventListener('click', () => store.set({ panelCollapsed: !S().panelCollapsed }));
$$('[data-mode]').forEach((b) =>
  b.addEventListener('click', () => {
    store.set({ mode: b.dataset.mode as Mode });
    particles.scatter(0.3);
  }),
);
$('#playBtn').addEventListener('click', () => {
  if (S().source !== 'tone' && !S().playing) {
    audio.stopInputs();
    store.set({ source: 'tone' });
  }
  togglePlay();
});
$('#tapHint').addEventListener('click', () => {
  if (S().tab === 'meditate') return;
  if (S().source !== 'tone') {
    audio.stopInputs();
    store.set({ source: 'tone' });
  }
  startPlayback();
});
$('#soundBtn').addEventListener('click', () => togglePlay());

// meditate
$<HTMLSelectElement>('#medPreset').addEventListener('change', (e) => selectPreset((e.target as HTMLSelectElement).value));
$$('#durSeg [data-dur]').forEach((b) =>
  b.addEventListener('click', () => {
    store.set({ medDuration: Number(b.dataset.dur) as State['medDuration'] });
    if (S().medRunning) {
      medEnd = medStart + S().medDuration * 60000;
      audio.scheduleSessionEnd((medEnd - performance.now()) / 1000);
    }
  }),
);
$('#medBtn').addEventListener('click', () => (S().medRunning ? stopMeditation(false) : startMeditation()));

// studio
$$('.subtabs [data-sub]').forEach((b) => b.addEventListener('click', () => store.set({ studioSub: b.dataset.sub as State['studioSub'] })));
$<HTMLSelectElement>('#geoSel').addEventListener('change', (e) => store.set({ overlay: (e.target as HTMLSelectElement).value }));
$<HTMLInputElement>('#ringsChk').addEventListener('change', (e) => store.set({ showRings: (e.target as HTMLInputElement).checked }));
$$('#canvasSeg [data-canvas]').forEach((b) => b.addEventListener('click', () => store.set({ canvasTheme: b.dataset.canvas as State['canvasTheme'] })));
$$('#densSeg [data-dens]').forEach((b) =>
  b.addEventListener('click', () => {
    store.set({ density: b.dataset.dens as State['density'] });
    particles.setCount(targetCount());
  }),
);
$<HTMLInputElement>('#sizeRange').addEventListener('input', (e) => store.set({ pointSize: Number((e.target as HTMLInputElement).value) }));
$<HTMLSelectElement>('#tuningSel').addEventListener('change', (e) => store.set({ tuning: Number((e.target as HTMLSelectElement).value) as 440 | 432 }));
$$('#srcSeg [data-src]').forEach((b) => b.addEventListener('click', () => void setSource(b.dataset.src as State['source'])));
$<HTMLInputElement>('#fileInput').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  audio.stopTone(0.1);
  $('#fileName').textContent = file.name;
  const ok = await audio.playFile(file);
  store.set({ source: 'file', playing: ok });
  updateSourceUI();
});
$<HTMLInputElement>('#freqRange').addEventListener('input', (e) => setFreq(sliderToFreq(Number((e.target as HTMLInputElement).value))));
$<HTMLInputElement>('#freqNum').addEventListener('change', (e) => {
  const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.'));
  if (isFinite(v)) setFreq(v);
});
$('#phiUp').addEventListener('click', () => setFreq(S().freq * PHI, S().phiPow + 1));
$('#phiDown').addEventListener('click', () => setFreq(S().freq / PHI, S().phiPow - 1));
$('#octUp').addEventListener('click', () => setFreq(S().freq * 2, S().phiPow));
$('#octDown').addEventListener('click', () => setFreq(S().freq / 2, S().phiPow));
$$('#waveSeg [data-wave]').forEach((b) =>
  b.addEventListener('click', () => {
    store.set({ waveform: b.dataset.wave as State['waveform'] });
    audio.setWaveform(S().waveform);
  }),
);
$<HTMLInputElement>('#loRange').addEventListener('input', (e) => {
  const v = sliderToFreq(Number((e.target as HTMLInputElement).value), 20, 8000);
  store.set({ rangeLo: Math.min(v, S().rangeHi * 0.9) });
});
$<HTMLInputElement>('#hiRange').addEventListener('input', (e) => {
  const v = sliderToFreq(Number((e.target as HTMLInputElement).value), 20, 8000);
  store.set({ rangeHi: Math.max(v, S().rangeLo * 1.1) });
});
$<HTMLInputElement>('#sensRange').addEventListener('input', (e) => store.set({ sensitivity: Number((e.target as HTMLInputElement).value) }));
$('#snapBtn').addEventListener('click', () => {
  if (detected) {
    void setSource('tone');
    setFreq(detected);
  }
});
$<HTMLInputElement>('#expGeo').addEventListener('change', (e) => store.set({ exportGeo: (e.target as HTMLInputElement).checked }));
$<HTMLInputElement>('#expCap').addEventListener('change', (e) => store.set({ exportCaption: (e.target as HTMLInputElement).checked }));
$('#exportBtn').addEventListener('click', () => {
  const s = S();
  renderer.draw(particles);
  const f = s.source === 'tone' ? s.freq : vizFreq;
  const cap = s.exportCaption ? `${presetName(preset())} · ${hz(f)} · ${noteInfo(f, s.tuning, s.lang).label}` : null;
  const url = renderer.snapshot(s.exportGeo, cap);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aurea-${f.toFixed(2)}hz-${s.mode}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(t('st.exported'));
});

// volume (Explore, Meditate and Studio > Sound share one store value)
$$<HTMLInputElement>('.vol-range').forEach((r) =>
  r.addEventListener('input', () => setVolume(Number(r.value), false)), // moving the slider unmutes
);
$$<HTMLButtonElement>('.vol-mute').forEach((b) =>
  b.addEventListener('click', () => {
    const s = S();
    if (s.muted) setVolume(s.volume > 0 ? s.volume : 0.3, false);
    else if (s.volume <= 0) setVolume(0.3, false);
    else setVolume(s.volume, true);
  }),
);
window.addEventListener('storage', (e) => {
  // another tab changed the volume: keep in sync
  if (e.key === 'aurea:v1') {
    try {
      const o = JSON.parse(e.newValue || '{}');
      if (typeof o.volume === 'number' && (o.volume !== S().volume || !!o.muted !== S().muted)) setVolume(o.volume, !!o.muted);
    } catch {
      /* ignore */
    }
  }
});

// MIDI
midi.onChange = () => updateMidiUI();
midi.onNote = (note) => {
  const s = S();
  const f = midiToFreq(note, s.tuning);
  if (f < 20 || f > 4000) return;
  if (s.source !== 'tone') {
    audio.stopInputs();
    store.set({ source: 'tone' });
  }
  setFreq(f);
  $('#midiLast').textContent = `${note} · ${midiName(note, s.lang)} · ${hz(f)}`;
  if (!S().playing && audio.ctx && audio.ctx.state === 'running') {
    audio.startTone(f);
    store.set({ playing: true });
  }
};
$('#midiBtn').addEventListener('click', () => {
  audio.ensure(); // unlock audio in this gesture so MIDI notes can sound
  void midi.connect();
});

// keyboard
window.addEventListener('keydown', (e) => {
  const tgt = e.target as HTMLElement;
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(tgt.tagName);
  if (donateOpen()) return; // the popup handles its own keys
  if (e.key === 'Escape' && !$('#helpModal').hidden) return closeHelp();
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ' && tgt.tagName !== 'BUTTON') {
    e.preventDefault();
    if (S().tab === 'meditate') S().medRunning ? stopMeditation(false) : startMeditation();
    else togglePlay();
  } else if (e.key === '1') store.set({ tab: 'explore' });
  else if (e.key === '2') store.set({ tab: 'meditate' });
  else if (e.key === '3') store.set({ tab: 'studio' });
  else if (e.key === '?') openHelp();
  else if (e.key === 'd' || e.key === 'D') switchTheme();
});

// ---------- background playback ----------
// Never pause when hidden / blurred. If the OS suspends or interrupts the context
// (phone call, other app, lock screen), resume on the next visibility/focus/tap.
const kick = () => audio.kick();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) kick();
});
window.addEventListener('focus', kick);
window.addEventListener('pageshow', kick);
for (const ev of ['pointerdown', 'touchend', 'keydown'] as const) window.addEventListener(ev, kick, { capture: true, passive: true });
audio.onStateChange = (state) => {
  if (state !== 'running' && audio.wantRunning && !document.hidden) kick();
  updateMediaSession();
};

// keep the meditation UI honest even while rAF is paused in a hidden tab
window.setInterval(() => {
  if (S().medRunning && performance.now() >= medEnd) stopMeditation(true);
}, 1000);

// ---------- Media Session (lock screen / notification controls) ----------
const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;
let msKey = '';
function updateMediaSession() {
  if (!ms) return;
  const s = S();
  const p = preset();
  const key = `${p.id}|${s.freq}|${s.lang}|${s.source}`;
  if (key !== msKey && typeof MediaMetadata !== 'undefined') {
    msKey = key;
    const name = s.source === 'tone' ? `${presetName(p)} · ${hz(s.freq)}` : s.source === 'file' ? t('st.file') : t('st.mic');
    try {
      ms.metadata = new MediaMetadata({
        title: name,
        artist: 'Áurea by Looker',
        album: presetName(p),
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    } catch {
      /* ignore */
    }
  }
  ms.playbackState = s.playing ? 'playing' : audio.ctx ? 'paused' : 'none';
}
if (ms) {
  const set = (a: MediaSessionAction, h: MediaSessionActionHandler) => {
    try {
      ms.setActionHandler(a, h);
    } catch {
      /* action unsupported */
    }
  };
  // these only fire after the user has started audio at least once (no autoplay)
  set('play', () => {
    if (S().playing) return;
    if (S().tab === 'meditate') startMeditation();
    else startPlayback();
  });
  set('pause', () => {
    if (S().playing) stopPlayback();
  });
  set('stop', () => {
    if (S().playing) stopPlayback();
  });
}

// ---------- store reactions ----------
store.on((s, ch) => {
  if (ch.has('lang')) {
    setLang(s.lang);
    document.documentElement.lang = s.lang;
    applyI18n();
    fillSelects();
    buildThumbs();
  }
  if (ch.has('canvasTheme')) {
    applyCanvasTheme(s.canvasTheme);
    renderer.refreshTheme();
    thumbCache.clear();
    buildThumbs();
  }
  if (ch.has('category')) buildThumbs();
  if (ch.has('presetId')) markThumbs(!ch.has('category'));
  if (ch.has('tab') || ch.has('lang')) updateHeader();
  if (['presetId', 'freq', 'tuning', 'lang'].some((k) => ch.has(k as keyof State))) updatePresetInfo();
  if (['playing', 'medRunning', 'lang'].some((k) => ch.has(k as keyof State))) updatePlayUI();
  if (['source', 'playing', 'lang'].some((k) => ch.has(k as keyof State))) updateSourceUI();
  if (ch.has('lang')) updateMidiUI();
  if (ch.has('playing')) audio.wantRunning = s.playing;
  if (['playing', 'presetId', 'freq', 'lang', 'source'].some((k) => ch.has(k as keyof State))) updateMediaSession();
  updateStudioValues();
  if (['mode', 'showRings', 'presetId', 'overlay', 'tab'].some((k) => ch.has(k as keyof State))) refreshCanvasStatic();
  if (ch.has('pointSize')) renderer.pointScale = s.pointSize;
});

// ---------- main loop ----------
let last = performance.now();
let frameAcc = 0;
let frameN = 0;
let perfTimer = 0;
let uiTimer = 0;
const calm = reduceMotion ? 0.55 : 1;
renderer.pointScale = S().pointSize;

function breath(now: number): { s: number; inhale: boolean } {
  const T = 5.5;
  const tt = (((now - medStart) / 1000) % (2 * T) + 2 * T) % (2 * T);
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  return tt < T ? { s: ease(tt / T), inhale: true } : { s: 1 - ease((tt - T) / T), inhale: false };
}

const fmtTime = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

function frame(now: number) {
  const dt = clamp((now - last) / 1000, 0.001, 0.05);
  last = now;
  const k = dt * 60;
  const s = S();

  // audio analysis
  const needAnalysis = !!audio.ctx && (s.source !== 'tone' || s.tab === 'studio');
  if (needAnalysis) analyse();

  // frequency driving the visuals
  let target = s.freq;
  if (s.source !== 'tone') target = detected ?? vizFreq;
  if (s.source === 'tone' || Math.abs(Math.log2(target / vizFreq)) > 1 / 12) vizFreq = target;
  else vizFreq = Math.pow(2, Math.log2(vizFreq) + (Math.log2(target) - Math.log2(vizFreq)) * Math.min(1, 0.15 * k));

  // energy
  let energy = s.playing ? 1 : 0.3;
  if (s.source !== 'tone' && s.playing) energy = clamp((level + 65) / 40, 0.15, 1.2);
  let br = { s: 0.5, inhale: true };
  if (s.tab === 'meditate') {
    br = s.medRunning ? breath(now) : { s: 0.45 + 0.05 * Math.sin(now / 1400), inhale: true };
    if (s.medRunning) energy *= 0.65 + 0.35 * br.s;
  }

  const md = modesFor(vizFreq);
  if (s.mode === 'xy') {
    let r = vizFreq / s.tuning;
    while (r >= 2) r /= 2;
    while (r < 1) r *= 2;
    const q = ratioFor(r, 4);
    xyPhase += ((r - q.p / q.q) * Math.PI * 4 + 0.25 * calm) * dt;
    let wave: Float32Array | null = null;
    let delay = 1;
    if (s.source !== 'tone' && s.playing && level > -60) {
      wave = audio.waveform_();
      delay = clamp(Math.round(audio.sampleRate / Math.max(30, vizFreq) / 4), 1, 600);
    }
    particles.stepXY(k, energy * calm, q.p, q.q, xyPhase, wave, delay);
  } else {
    field.compute(s.mode, md, (now / 1000) * calm);
    particles.stepField(field, k, energy, s.mode === 'mandala', calm);
  }
  renderer.draw(particles);

  // meditation overlay
  if (s.tab === 'meditate') {
    const ring = $('#medRing');
    ring.style.transform = `translate(-50%,-50%) scale(${(0.42 + 0.5 * br.s).toFixed(4)})`;
    if (s.medRunning) {
      const left = medEnd - now;
      if (left <= 0) stopMeditation(true);
      $('#medTxt').textContent = t(br.inhale ? 'med.inhale' : 'med.exhale');
      $('#medTime').textContent = fmtTime(left);
    } else {
      $('#medTxt').textContent = t(medDone ? 'med.done' : 'med.breathe');
      $('#medTime').textContent = fmtTime(s.medDuration * 60000);
    }
  }

  // throttled DOM readouts
  uiTimer += dt;
  if (uiTimer > 0.12) {
    uiTimer = 0;
    updateReadouts(md);
  }

  // adaptive particle count
  frameAcc += dt;
  frameN++;
  perfTimer += dt;
  if (perfTimer > 2) {
    const avg = frameAcc / frameN;
    if (s.density === 'auto') {
      if (avg > 0.026 && particles.count > 5000) particles.setCount(particles.count * 0.8);
      else if (avg < 0.018 && particles.count < targetCount()) particles.setCount(Math.min(targetCount(), particles.count * 1.1));
    }
    $('#countVal').textContent = `${particles.count.toLocaleString()} · ${Math.round(1 / Math.max(avg, 1e-3))} fps`;
    perfTimer = frameAcc = frameN = 0;
  }
  requestAnimationFrame(frame);
}

function updateReadouts(md: ReturnType<typeof modesFor>) {
  const s = S();
  const n = noteInfo(vizFreq, s.tuning, s.lang);
  if (s.tab === 'studio') {
    const mult = s.phiPow && s.source === 'tone' ? `  × ${Math.pow(PHI, s.phiPow).toFixed(4)}` : '';
    const pk = peaks.length ? peaks.slice(0, 3).map((p) => hz(p.freq)).join('  ') : '—';
    let modes = `(${md.n.toFixed(1)}, ${md.m.toFixed(1)})`;
    if (s.mode === 'mandala') modes += `  ×${md.S}`;
    if (s.mode === 'water') modes += `  ${md.N + 1}●`;
    $('#readout').innerHTML =
      `<div><b>${t('readout.audio')}</b>${hz(vizFreq)}${mult}  ${n.label}</div>` +
      `<div><b>${t('readout.peaks')}</b>${pk}</div>` +
      `<div><b>${t('readout.modes')}</b>${modes}</div>`;
    if (s.studioSub === 'analysis') {
      $('#detFreq').textContent = detected ? hz(detected) : t('st.noSignal');
      $('#detNote').textContent = detected ? noteInfo(detected, s.tuning, s.lang).label : '—';
      $('#detPeaks').textContent = pk;
      drawSpectrum();
    }
  }
  if (s.source !== 'tone' && s.tab === 'explore') {
    const p = preset();
    $('#pDetail').textContent = `${t(`cat.${p.cat}` as I18nKey)} · ${hz(vizFreq)} · ${n.label}`;
  }
}

function drawSpectrum() {
  const cv = $<HTMLCanvasElement>('#specCv');
  const w = cv.clientWidth;
  if (!w) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (cv.width !== Math.round(w * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(120 * dpr);
  }
  const c = cv.getContext('2d')!;
  const W = cv.width;
  const H = cv.height;
  c.clearRect(0, 0, W, H);
  const cs = getComputedStyle(document.documentElement);
  const lineCol = cs.getPropertyValue('--spec-line').trim() || '#262c2e';
  const accent = cs.getPropertyValue('--accent').trim() || '#0f9ccc';
  const s = S();
  const spec = audio.ctx ? audio.spectrum() : null;
  const lo = 20;
  const hi = 8000;
  const x = (f: number) => (Math.log(f / lo) / Math.log(hi / lo)) * W;
  // range shading
  c.fillStyle = cs.getPropertyValue('--spec-range').trim() || 'rgba(0,0,0,0.04)';
  c.fillRect(x(s.rangeLo), 0, x(s.rangeHi) - x(s.rangeLo), H);
  // grid
  c.strokeStyle = cs.getPropertyValue('--line').trim() || '#e5e5e0';
  c.lineWidth = 1;
  c.beginPath();
  for (const f of [50, 100, 200, 500, 1000, 2000, 5000]) {
    c.moveTo(Math.round(x(f)) + 0.5, 0);
    c.lineTo(Math.round(x(f)) + 0.5, H);
  }
  c.stroke();
  if (spec) {
    const binHz = audio.binHz;
    c.strokeStyle = lineCol;
    c.lineWidth = 1.2 * dpr;
    c.beginPath();
    let started = false;
    for (let px = 0; px < W; px += 2) {
      const f = lo * Math.pow(hi / lo, px / W);
      const b = Math.round(f / binHz);
      const db = spec[Math.min(spec.length - 1, b)];
      const y = H - clamp((db + 110) / 90, 0, 1) * H;
      if (!started) {
        c.moveTo(px, y);
        started = true;
      } else c.lineTo(px, y);
    }
    c.stroke();
    // threshold
    const ty = H - clamp((s.sensitivity + 110) / 90, 0, 1) * H;
    c.setLineDash([4 * dpr, 4 * dpr]);
    c.strokeStyle = accent;
    c.globalAlpha = 0.5;
    c.beginPath();
    c.moveTo(0, ty);
    c.lineTo(W, ty);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.fillStyle = accent;
    for (const p of peaks) {
      const px = x(p.freq);
      const y = H - clamp((p.db + 110) / 90, 0, 1) * H;
      c.beginPath();
      c.arc(px, y, 3 * dpr, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// ---------- start ----------
fillSelects();
buildThumbs();
renderAll();
requestAnimationFrame(frame);

// expose a tiny debug hook (useful for automated checks)
(window as unknown as { __aurea: object }).__aurea = {
  get count() {
    return particles.count;
  },
  get renderer() {
    return renderer.kind;
  },
  /** micro-benchmark of the CPU simulation (ms per step) for a given mode */
  bench(mode: Mode = 'chladni', steps = 120) {
    const md = modesFor(S().freq);
    const t0 = performance.now();
    for (let i = 0; i < steps; i++) {
      field.compute(mode, md, i / 60);
      particles.stepField(field, 1, 1, mode === 'mandala', 1);
    }
    return { mode, count: particles.count, msPerStep: (performance.now() - t0) / steps };
  },
  audio() {
    return {
      state: audio.ctx?.state ?? 'none',
      masterGain: audio.masterGain,
      target: AudioEngine.curve(S().volume) * (S().muted ? 0 : 1),
      volume: S().volume,
      muted: S().muted,
      route: audio.route,
      wantRunning: audio.wantRunning,
      playing: S().playing,
      mediaSession: ms ? { state: ms.playbackState, title: ms.metadata?.title, artist: ms.metadata?.artist, album: ms.metadata?.album } : null,
    };
  },
  sample() {
    return { pos: Array.from(particles.pos.slice(0, 6)), br: Array.from(particles.bright.slice(0, 3)), px: renderer.px, f: Array.from(field.f.slice(0, 3)) };
  },
};
