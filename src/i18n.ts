import type { Lang } from './state';

const es = {
  'tab.explore': 'Explorar',
  'tab.meditate': 'Meditar',
  'tab.studio': 'Estudio',
  'help.aria': 'Ayuda',
  'lang.aria': 'Idioma',
  'lang.toggle': 'Idioma: Español — cambiar a English',
  'theme.toDark': 'Activar modo oscuro',
  'theme.toLight': 'Activar modo claro',
  'cat.geo': 'Geometría sagrada',
  'cat.solfeggio': 'Solfeggio',
  'cat.creation': 'Números de la creación',
  'cat.fibonacci': 'Fibonacci',
  'cat.intention': 'Intenciones',
  'mode.chladni': 'Chladni',
  'mode.water': 'Agua',
  'mode.mandala': 'Mandala',
  'mode.xy': 'XY',
  'play': 'Reproducir',
  'pause': 'Pausar',
  'tapToListen': 'Toca para escuchar',
  'collapse': 'Mostrar u ocultar presets',
  'custom': 'Personalizada',
  // meditate
  'med.title': 'Meditación',
  'med.inhale': 'Inhala',
  'med.exhale': 'Exhala',
  'med.breathe': 'Respira',
  'med.done': 'Sesión completada',
  'med.duration': 'Duración',
  'med.min': 'min',
  'med.start': 'Comenzar',
  'med.stop': 'Finalizar',
  'med.tone': 'Frecuencia',
  'med.hint': 'Inhala mientras el anillo se expande y exhala cuando se contrae (5,5 s cada fase). El tono entra y sale suavemente.',
  // studio
  'sub.shape': 'Forma',
  'sub.sound': 'Sonido',
  'sub.analysis': 'Análisis',
  'sub.output': 'Salida',
  'sub.midi': 'MIDI',
  'st.visual': 'Visualización',
  'st.geometry': 'Geometría',
  'st.geoPreset': 'Del preset',
  'st.geoNone': 'Ninguna',
  'st.rings': 'Anillos de fondo',
  'st.particles': 'Partículas',
  'st.density': 'Densidad',
  'st.auto': 'Auto',
  'st.low': 'Baja',
  'st.mid': 'Media',
  'st.high': 'Alta',
  'st.pointSize': 'Tamaño de partícula',
  'st.canvas': 'Lienzo',
  'st.canvasDark': 'Oscuro',
  'st.canvasLight': 'Claro',
  'st.audio': 'Audio',
  'st.tuning': 'Afinación',
  'st.playSound': 'Reproducir el sonido',
  'st.pauseSound': 'Pausar el sonido',
  'st.tone': 'Tono',
  'st.mic': 'Mic',
  'st.file': 'Archivo',
  'st.chooseFile': 'Elegir archivo de audio…',
  'st.noFile': 'Ningún archivo',
  'st.micOn': 'Micrófono activo — la forma sigue la frecuencia dominante.',
  'st.micDenied': 'No se pudo acceder al micrófono.',
  'st.fileHint': 'La forma sigue la frecuencia dominante del archivo.',
  'st.toneSection': 'Tono',
  'st.frequency': 'Frecuencia',
  'st.waveform': 'Onda',
  'st.sine': 'Seno',
  'st.soft': 'Suave',
  'st.triangle': 'Triángulo',
  'st.volume': 'Volumen',
  'st.goldenUp': 'Multiplicar por φ (1.618)',
  'st.goldenDown': 'Dividir por φ (1.618)',
  'st.octUp': 'Subir una octava',
  'st.octDown': 'Bajar una octava',
  'st.range': 'Rango',
  'st.spectrum': 'Espectro',
  'st.rangeLo': 'Rango bajo',
  'st.rangeHi': 'Rango alto',
  'st.response': 'Respuesta',
  'st.sensitivity': 'Umbral',
  'st.detected': 'Detectada',
  'st.peaks': 'Picos',
  'st.note': 'Nota',
  'st.snap': 'Llevar el tono al pico',
  'st.noSignal': 'sin señal',
  'st.export': 'Exportar',
  'st.exportPng': 'Descargar PNG',
  'st.exportGeo': 'Incluir geometría',
  'st.exportCaption': 'Incluir leyenda (frecuencia y nota)',
  'st.exportHint': 'Guarda una captura del lienzo a resolución completa de tu pantalla.',
  'st.exported': 'Imagen guardada',
  'midi.title': 'Entrada MIDI',
  'midi.connect': 'Conectar MIDI',
  'midi.unsupported': 'Este navegador no admite Web MIDI (prueba Chrome o Edge en escritorio/Android). El resto de la app funciona igual.',
  'midi.idle': 'Sin conectar',
  'midi.connecting': 'Solicitando acceso…',
  'midi.connected': 'Conectado',
  'midi.noDevices': 'Conectado, pero no hay dispositivos. Enchufa un teclado MIDI.',
  'midi.denied': 'Acceso MIDI denegado.',
  'midi.devices': 'Dispositivos',
  'midi.last': 'Última nota',
  'midi.hint': 'Cada nota (note-on) fija la frecuencia según la afinación de referencia actual (La = 440 o 432).',
  'readout.audio': 'audio',
  'readout.peaks': 'picos',
  'readout.modes': 'modos',
  // help
  'help.title': '¿Qué es Áurea?',
  'help.close': 'Cerrar',
  'help.body': `
<p><strong>Áurea</strong> genera un tono en tiempo real en tu navegador y te muestra la <em>cimática</em> que produce: miles de partículas doradas se mueven hacia las líneas nodales de una placa de Chladni que vibra a esa frecuencia, con la geometría sagrada del preset superpuesta.</p>
<h3>Explorar</h3>
<p>Elige una categoría (geometría sagrada, Solfeggio, números de la creación, Fibonacci, intenciones) y un preset. Debajo ves la frecuencia exacta y la nota más cercana con su desviación en cents (¢). Cambia entre los modos <strong>Chladni</strong>, <strong>Agua</strong> (interferencia de ondas), <strong>Mandala</strong> (simetría radial) y <strong>XY</strong> (figura de Lissajous de osciloscopio). Pulsa <strong>Reproducir</strong>.</p>
<h3>Meditar</h3>
<p>Elige 5, 10 o 20 minutos y pulsa Comenzar. Sigue el anillo: inhala cuando se expande, exhala cuando se contrae. El tono entra y sale con un fundido suave.</p>
<h3>Estudio</h3>
<p><strong>Forma</strong>: modo, geometría y partículas. <strong>Sonido</strong>: afinación La = 440/432, fuente (tono, micrófono o archivo), frecuencia exacta y multiplicador áureo ×φ / ÷φ. <strong>Análisis</strong>: frecuencia detectada, nota y picos del espectro (FFT). <strong>Salida</strong>: descarga una imagen PNG. <strong>MIDI</strong>: toca notas en un teclado MIDI para fijar la frecuencia.</p>
<h3>Privacidad y uso</h3>
<p>Todo ocurre en tu dispositivo: sin cuentas, sin servidor. El micrófono solo se usa si lo activas y nunca sale del navegador. Usa auriculares a volumen moderado. Áurea es una herramienta artística y de relajación, no un tratamiento médico.</p>
<p>El botón de luna/sol de la cabecera cambia toda la interfaz a modo oscuro o claro; tu elección se recuerda.</p>
<p class="muted">Atajos: <kbd>Espacio</kbd> reproducir/pausar · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> pestañas · <kbd>D</kbd> modo oscuro · <kbd>?</kbd> ayuda</p>`,
};

type Dict = typeof es;

const en: Dict = {
  'tab.explore': 'Explore',
  'tab.meditate': 'Meditate',
  'tab.studio': 'Studio',
  'help.aria': 'Help',
  'lang.aria': 'Language',
  'lang.toggle': 'Language: English — switch to Español',
  'theme.toDark': 'Switch to dark mode',
  'theme.toLight': 'Switch to light mode',
  'cat.geo': 'Sacred geometry',
  'cat.solfeggio': 'Solfeggio',
  'cat.creation': 'Creation numbers',
  'cat.fibonacci': 'Fibonacci',
  'cat.intention': 'Intentions',
  'mode.chladni': 'Chladni',
  'mode.water': 'Water',
  'mode.mandala': 'Mandala',
  'mode.xy': 'XY',
  'play': 'Play',
  'pause': 'Pause',
  'tapToListen': 'Tap to listen',
  'collapse': 'Show or hide presets',
  'custom': 'Custom',
  'med.title': 'Meditation',
  'med.inhale': 'Inhale',
  'med.exhale': 'Exhale',
  'med.breathe': 'Breathe',
  'med.done': 'Session complete',
  'med.duration': 'Duration',
  'med.min': 'min',
  'med.start': 'Start',
  'med.stop': 'Finish',
  'med.tone': 'Frequency',
  'med.hint': 'Breathe in while the ring expands and out while it contracts (5.5 s each). The tone fades in and out softly.',
  'sub.shape': 'Shape',
  'sub.sound': 'Sound',
  'sub.analysis': 'Analysis',
  'sub.output': 'Output',
  'sub.midi': 'MIDI',
  'st.visual': 'Visualization',
  'st.geometry': 'Geometry',
  'st.geoPreset': "Preset's own",
  'st.geoNone': 'None',
  'st.rings': 'Background rings',
  'st.particles': 'Particles',
  'st.density': 'Density',
  'st.auto': 'Auto',
  'st.low': 'Low',
  'st.mid': 'Medium',
  'st.high': 'High',
  'st.pointSize': 'Particle size',
  'st.canvas': 'Canvas',
  'st.canvasDark': 'Dark',
  'st.canvasLight': 'Light',
  'st.audio': 'Audio',
  'st.tuning': 'Tuning',
  'st.playSound': 'Play the sound',
  'st.pauseSound': 'Pause the sound',
  'st.tone': 'Tone',
  'st.mic': 'Mic',
  'st.file': 'File',
  'st.chooseFile': 'Choose audio file…',
  'st.noFile': 'No file',
  'st.micOn': 'Microphone on — the shape follows the dominant frequency.',
  'st.micDenied': 'Could not access the microphone.',
  'st.fileHint': "The shape follows the file's dominant frequency.",
  'st.toneSection': 'Tone',
  'st.frequency': 'Frequency',
  'st.waveform': 'Wave',
  'st.sine': 'Sine',
  'st.soft': 'Soft',
  'st.triangle': 'Triangle',
  'st.volume': 'Volume',
  'st.goldenUp': 'Multiply by φ (1.618)',
  'st.goldenDown': 'Divide by φ (1.618)',
  'st.octUp': 'One octave up',
  'st.octDown': 'One octave down',
  'st.range': 'Range',
  'st.spectrum': 'Spectrum',
  'st.rangeLo': 'Low range',
  'st.rangeHi': 'High range',
  'st.response': 'Response',
  'st.sensitivity': 'Threshold',
  'st.detected': 'Detected',
  'st.peaks': 'Peaks',
  'st.note': 'Note',
  'st.snap': 'Snap tone to peak',
  'st.noSignal': 'no signal',
  'st.export': 'Export',
  'st.exportPng': 'Download PNG',
  'st.exportGeo': 'Include geometry',
  'st.exportCaption': 'Include caption (frequency and note)',
  'st.exportHint': 'Saves a snapshot of the canvas at your screen’s full resolution.',
  'st.exported': 'Image saved',
  'midi.title': 'MIDI input',
  'midi.connect': 'Connect MIDI',
  'midi.unsupported': 'This browser does not support Web MIDI (try Chrome or Edge on desktop/Android). Everything else works the same.',
  'midi.idle': 'Not connected',
  'midi.connecting': 'Requesting access…',
  'midi.connected': 'Connected',
  'midi.noDevices': 'Connected, but no devices found. Plug in a MIDI keyboard.',
  'midi.denied': 'MIDI access denied.',
  'midi.devices': 'Devices',
  'midi.last': 'Last note',
  'midi.hint': 'Each note-on sets the frequency using the current reference tuning (A = 440 or 432).',
  'readout.audio': 'audio',
  'readout.peaks': 'peaks',
  'readout.modes': 'modes',
  'help.title': 'What is Áurea?',
  'help.close': 'Close',
  'help.body': `
<p><strong>Áurea</strong> generates a tone in real time in your browser and shows you the <em>cymatics</em> it creates: thousands of golden particles drift towards the nodal lines of a Chladni plate vibrating at that frequency, with the preset's sacred geometry drawn on top.</p>
<h3>Explore</h3>
<p>Pick a category (sacred geometry, Solfeggio, creation numbers, Fibonacci, intentions) and a preset. Below you see the exact frequency and the nearest note with its deviation in cents (¢). Switch between <strong>Chladni</strong>, <strong>Water</strong> (wave interference), <strong>Mandala</strong> (radial symmetry) and <strong>XY</strong> (oscilloscope Lissajous figure). Press <strong>Play</strong>.</p>
<h3>Meditate</h3>
<p>Choose 5, 10 or 20 minutes and press Start. Follow the ring: breathe in as it expands, out as it contracts. The tone fades in and out softly.</p>
<h3>Studio</h3>
<p><strong>Shape</strong>: mode, geometry and particles. <strong>Sound</strong>: A = 440/432 tuning, source (tone, microphone or file), exact frequency and the golden multiplier ×φ / ÷φ. <strong>Analysis</strong>: detected frequency, note and spectral peaks (FFT). <strong>Output</strong>: download a PNG image. <strong>MIDI</strong>: play notes on a MIDI keyboard to set the frequency.</p>
<h3>Privacy &amp; use</h3>
<p>Everything runs on your device: no accounts, no server. The microphone is only used if you turn it on and never leaves the browser. Use headphones at a moderate volume. Áurea is an artistic and relaxation tool, not a medical treatment.</p>
<p>The moon/sun button in the header switches the whole interface to dark or light mode; your choice is remembered.</p>
<p class="muted">Shortcuts: <kbd>Space</kbd> play/pause · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> tabs · <kbd>D</kbd> dark mode · <kbd>?</kbd> help</p>`,
};

export type I18nKey = keyof Dict;
const DICTS: Record<Lang, Dict> = { es, en };

let current: Lang = 'es';
export const setLang = (l: Lang) => (current = l);
export const t = (k: I18nKey): string => DICTS[current][k] ?? k;

/** Apply translations to elements with data-i18n / data-i18n-title / data-i18n-aria / data-i18n-html. */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as I18nKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml as I18nKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as I18nKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as I18nKey));
  });
}
