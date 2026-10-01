import { ICONS, MARK } from './icons';
import { CATEGORIES, PRESETS } from './presets';

const seg = (id: string, items: [string, string][], attr: string) =>
  `<div class="seg" id="${id}" role="group">${items
    .map(([v, key]) => `<button type="button" data-${attr}="${v}" data-i18n="${key}"></button>`)
    .join('')}</div>`;

const section = (key: string, body: string, extra = '') =>
  `<div class="sec"><div class="sec-h"><span class="sq"></span><span data-i18n="${key}"></span>${extra}<i></i></div>${body}</div>`;

const range = (id: string, min: number, max: number, step: number) =>
  `<input type="range" class="range" id="${id}" min="${min}" max="${max}" step="${step}">`;

const volRow = (id: string) =>
  `<div class="vol-row" id="${id}">
    <button type="button" class="icon-btn ghost vol-mute" aria-pressed="false"></button>
    <input type="range" class="range vol vol-range" min="0" max="1" step="0.01" data-i18n-aria="vol.label">
    <span class="mono vol-val"></span>
  </div>`;

/** Shared "Continuous / Timer" block (Meditate and Studio use the same markup + logic). */
const sessionBlock = (scope: 'meditate' | 'studio') =>
  `<div class="sess" data-scope="${scope}">
    <div class="seg sess-mode" role="group" data-i18n-aria="sess.mode">
      <button type="button" data-smode="continuous" data-i18n="sess.continuous"></button>
      <button type="button" data-smode="timer" data-i18n="sess.timer"></button>
    </div>
    <div class="sess-timer">
      <div class="seg sess-dur" role="group" data-i18n-aria="med.duration">
        ${[5, 10, 20].map((d) => `<button type="button" data-sdur="${d}">${d} <span data-i18n="med.min"></span></button>`).join('')}
      </div>
      <div class="sess-row">
        <span class="sess-clock mono" role="timer" data-i18n-aria="sess.left"></span>
        <button type="button" class="sess-cancel" data-i18n="sess.cancel"></button>
      </div>
    </div>
  </div>`;

const presetOptions = () =>
  CATEGORIES.map(
    (c) =>
      `<optgroup data-cat="${c}">${PRESETS.filter((p) => p.cat === c)
        .map((p) => `<option value="${p.id}"></option>`)
        .join('')}</optgroup>`,
  ).join('');

/** Lightning address (forwards to noblemoose21@primal.net); public/donate-qr.svg encodes lightning:<address>. */
export const LN_ADDRESS = 'looker@lawallet.io';

export function appTemplate(): string {
  return `
<header class="hdr">
  <a class="brand" href="./" aria-label="Áurea by Looker">${MARK}<span class="brand-text"><span class="word">Áurea</span><span class="by">by Looker</span></span></a>
  <nav class="tabs" role="tablist">
    <button type="button" role="tab" class="tab" data-tab="explore" data-i18n="tab.explore"></button>
    <button type="button" role="tab" class="tab" data-tab="meditate" data-i18n="tab.meditate"></button>
    <button type="button" role="tab" class="tab" data-tab="studio" data-i18n="tab.studio"></button>
  </nav>
  <div class="hdr-r">
    <button type="button" class="donate-btn" id="donateBtn" aria-haspopup="dialog" data-i18n-aria="donate.label" data-i18n-title="donate.label">${ICONS.heart}<span class="donate-lbl" data-i18n="donate.label"></span></button>
    <button type="button" class="icon-btn theme-btn" id="themeBtn" aria-pressed="false"><span class="i-moon">${ICONS.moon}</span><span class="i-sun">${ICONS.sun}</span></button>
    <button type="button" class="icon-btn" id="helpBtn" data-i18n-aria="help.aria" data-i18n-title="help.aria">${ICONS.help}</button>
    <div class="lang" role="group" data-i18n-aria="lang.aria">
      <button type="button" data-lang="es">ES</button><button type="button" data-lang="en">EN</button>
    </div>
    <button type="button" class="icon-btn lang-mini" id="langMini" data-i18n-aria="lang.toggle" data-i18n-title="lang.toggle"></button>
  </div>
</header>

<main class="main">
  <div class="stage-col">
    <div class="stage" id="stage">
      <div class="readout mono" id="readout" aria-live="off"></div>
      <button type="button" class="tap-hint" id="tapHint"><span class="tap-ico">${ICONS.play}</span><span data-i18n="tapToListen"></span></button>
      <div class="med-ov" id="medOv" aria-live="off">
        <div class="med-ring" id="medRing"></div>
        <div class="med-txt" id="medTxt"></div>
        <div class="med-time mono" id="medTime"></div>
      </div>
      <div class="med-hint" id="medHint" role="status"><span class="med-hint-dot" aria-hidden="true"></span><span id="medHintTxt"></span></div>
    </div>
  </div>

  <!-- EXPLORE -->
  <section class="panel" data-view="explore">
    <div class="grab" aria-hidden="true"></div>
    <div class="phead">
      <div class="ptitle"><h1 class="serif" id="pName"></h1><div class="detail mono" id="pDetail"></div></div>
      <button type="button" class="icon-btn ghost chev" id="collapseBtn" data-i18n-aria="collapse" data-i18n-title="collapse">${ICONS.chevron}</button>
    </div>
    <div class="collapsible" id="presetArea">
      <div class="chips scroller" id="chips">
        ${CATEGORIES.map((c) => `<button type="button" class="chip" data-cat="${c}" data-i18n="cat.${c}"></button>`).join('')}
      </div>
      <div class="thumbs scroller" id="thumbs"></div>
    </div>
    <div class="controls">
      ${seg('modeSeg', [['chladni', 'mode.chladni'], ['water', 'mode.water'], ['mandala', 'mode.mandala'], ['xy', 'mode.xy']], 'mode')}
      <button type="button" class="btn primary play" id="playBtn"><span class="ico"></span><span class="lbl"></span></button>
    </div>
    ${volRow('volExplore')}
  </section>

  <!-- MEDITATE -->
  <section class="panel" data-view="meditate">
    <div class="phead">
      <div class="ptitle"><h1 class="serif" data-i18n="med.title"></h1><div class="detail mono" id="medDetail"></div></div>
    </div>
    <label class="field"><span class="lab" data-i18n="med.tone"></span>
      <span class="select"><select id="medPreset">${presetOptions()}</select></span>
    </label>
    <div class="field"><span class="lab" data-i18n="sess.title"></span>${sessionBlock('meditate')}</div>
    <button type="button" class="btn primary wide" id="medBtn"></button>
    ${volRow('volMeditate')}
    <p class="hint" data-i18n="med.hint"></p>
  </section>

  <!-- STUDIO -->
  <section class="panel studio" data-view="studio">
    <div class="subtabs" role="tablist">
      <button type="button" data-sub="shape">${ICONS.shape}<span data-i18n="sub.shape"></span></button>
      <button type="button" data-sub="sound">${ICONS.sound}<span data-i18n="sub.sound"></span></button>
      <button type="button" data-sub="analysis">${ICONS.analysis}<span data-i18n="sub.analysis"></span></button>
      <button type="button" data-sub="output">${ICONS.output}<span data-i18n="sub.output"></span></button>
      <button type="button" data-sub="midi">${ICONS.midi}<span data-i18n="sub.midi"></span></button>
    </div>

    <div class="pane" data-pane="shape">
      ${section('st.visual', seg('modeSeg2', [['chladni', 'mode.chladni'], ['water', 'mode.water'], ['mandala', 'mode.mandala'], ['xy', 'mode.xy']], 'mode'))}
      ${section('st.geometry', `<span class="select"><select id="geoSel"></select></span>
        <label class="row switch-row"><span data-i18n="st.rings"></span><span class="switch"><input type="checkbox" id="ringsChk"><i></i></span></label>`)}
      ${section('st.canvas', seg('canvasSeg', [['dark', 'st.canvasDark'], ['light', 'st.canvasLight']], 'canvas'))}
      ${section('st.particles', `<div class="lab-row"><span data-i18n="st.density"></span><span class="mono val" id="countVal"></span></div>
        ${seg('densSeg', [['auto', 'st.auto'], ['low', 'st.low'], ['mid', 'st.mid'], ['high', 'st.high']], 'dens')}
        <div class="lab-row"><span data-i18n="st.pointSize"></span><span class="mono val" id="sizeVal"></span></div>
        ${range('sizeRange', 0.5, 2, 0.05)}`)}
    </div>

    <div class="pane" data-pane="sound">
      ${section('st.audio', `<span class="select"><select id="tuningSel"><option value="440"></option><option value="432"></option></select></span>
        <button type="button" class="btn outline wide" id="soundBtn"><span class="ico"></span><span class="lbl"></span></button>
        <div class="seg" id="srcSeg" role="group">
          <button type="button" data-src="tone" data-i18n="st.tone"></button>
          <button type="button" data-src="mic"><span data-i18n="st.mic"></span></button>
          <button type="button" data-src="file"><span data-i18n="st.file"></span></button>
        </div>
        <div class="file-row" id="fileRow">
          <label class="btn ghost-b">${ICONS.file}<span data-i18n="st.chooseFile"></span><input type="file" id="fileInput" accept="audio/*" hidden></label>
          <span class="mono small" id="fileName"></span>
        </div>
        <p class="hint" id="srcStatus"></p>`)}
      ${section('sess.title', sessionBlock('studio'))}
      ${section('st.toneSection', `<div class="lab-row"><span data-i18n="st.frequency"></span><span class="mono val" id="freqVal"></span></div>
        ${range('freqRange', 0, 1, 0.0005)}
        <div class="freq-tools">
          <input type="number" id="freqNum" class="num mono" min="20" max="4000" step="0.01" inputmode="decimal">
          <button type="button" class="btn sq" id="phiDown" data-i18n-title="st.goldenDown">÷φ</button>
          <button type="button" class="btn sq" id="phiUp" data-i18n-title="st.goldenUp">×φ</button>
          <button type="button" class="btn sq" id="octDown" data-i18n-title="st.octDown">−8va</button>
          <button type="button" class="btn sq" id="octUp" data-i18n-title="st.octUp">+8va</button>
        </div>
        <div class="lab-row"><span data-i18n="st.waveform"></span></div>
        ${seg('waveSeg', [['sine', 'st.sine'], ['soft', 'st.soft'], ['triangle', 'st.triangle']], 'wave')}
        <div class="lab-row"><span data-i18n="st.volume"></span></div>
        ${volRow('volStudio')}`)}
    </div>

    <div class="pane" data-pane="analysis">
      ${section('st.spectrum', `<div class="meters">
          <div class="meter"><span class="lab" data-i18n="st.detected"></span><span class="big mono" id="detFreq">—</span></div>
          <div class="meter"><span class="lab" data-i18n="st.note"></span><span class="big mono" id="detNote">—</span></div>
        </div>
        <canvas class="spec" id="specCv" height="120"></canvas>
        <div class="lab-row"><span data-i18n="st.peaks"></span><span class="mono val" id="detPeaks">—</span></div>
        <button type="button" class="btn outline wide" id="snapBtn" data-i18n="st.snap"></button>`)}
      ${section('st.range', `<div class="lab-row"><span data-i18n="st.rangeLo"></span><span class="mono val" id="loVal"></span></div>
        ${range('loRange', 0, 1, 0.001)}
        <div class="lab-row"><span data-i18n="st.rangeHi"></span><span class="mono val" id="hiVal"></span></div>
        ${range('hiRange', 0, 1, 0.001)}`)}
      ${section('st.response', `<div class="lab-row"><span data-i18n="st.sensitivity"></span><span class="mono val" id="sensVal"></span></div>
        ${range('sensRange', -100, -30, 1)}`)}
    </div>

    <div class="pane" data-pane="output">
      ${section('st.export', `<p class="hint" data-i18n="st.exportHint"></p>
        <label class="row switch-row"><span data-i18n="st.exportGeo"></span><span class="switch"><input type="checkbox" id="expGeo"><i></i></span></label>
        <label class="row switch-row"><span data-i18n="st.exportCaption"></span><span class="switch"><input type="checkbox" id="expCap"><i></i></span></label>
        <button type="button" class="btn primary wide" id="exportBtn">${ICONS.output}<span data-i18n="st.exportPng"></span></button>`)}
    </div>

    <div class="pane" data-pane="midi">
      ${section('midi.title', `<div class="midi-status"><span class="dot" id="midiDot"></span><span id="midiStatus"></span></div>
        <button type="button" class="btn primary wide" id="midiBtn" data-i18n="midi.connect"></button>
        <div class="lab-row"><span data-i18n="midi.devices"></span><span class="mono val" id="midiDevices">—</span></div>
        <div class="lab-row"><span data-i18n="midi.last"></span><span class="mono val" id="midiLast">—</span></div>
        <p class="hint" data-i18n="midi.hint"></p>`)}
    </div>
  </section>
</main>

<div class="modal" id="helpModal" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
    <div class="modal-h"><h2 class="serif" id="helpTitle" data-i18n="help.title"></h2>
      <button type="button" class="icon-btn" id="helpClose" data-i18n-aria="help.close">${ICONS.close}</button></div>
    <div class="modal-b" data-i18n-html="help.body"></div>
  </div>
</div>
<div class="dn-modal" id="donateModal" hidden>
  <div class="dn-backdrop" data-dn-close></div>
  <div class="dn-card" role="dialog" aria-modal="true" aria-labelledby="dnTitle" aria-describedby="dnText">
    <button type="button" class="dn-x" id="donateClose" data-i18n-aria="help.close" data-i18n-title="help.close">${ICONS.close}</button>
    <div class="dn-bolt" aria-hidden="true">${ICONS.bolt}</div>
    <h2 class="serif dn-title" id="dnTitle" data-i18n="donate.label"></h2>
    <div class="dn-qr"><img src="/donate-qr.svg" width="640" height="640" data-i18n-alt="donate.qrAlt" alt="" decoding="async"></div>
    <p class="dn-text" id="dnText" data-i18n="donate.text"></p>
    <div class="dn-addr" role="group" data-i18n-aria="donate.addr">
      <span class="mono dn-addr-txt" title="${LN_ADDRESS}"><span class="a1">${LN_ADDRESS.slice(0, -8)}</span><span class="a2">${LN_ADDRESS.slice(-8)}</span></span>
      <button type="button" class="dn-copy" id="donateCopy" data-i18n-aria="donate.copyAria">${ICONS.copy}<span data-i18n="donate.copy"></span></button>
    </div>
    <a class="btn primary wide dn-open" id="donateOpen" href="lightning:${LN_ADDRESS}">${ICONS.bolt}<span data-i18n="donate.open"></span></a>
  </div>
</div>
<div class="toast" id="toast" role="status"></div>
`;
}
