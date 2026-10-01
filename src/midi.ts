export type MidiStatus = 'unsupported' | 'idle' | 'connecting' | 'connected' | 'nodevices' | 'denied';

interface MidiInputLike {
  name?: string | null;
  manufacturer?: string | null;
  onmidimessage: ((e: { data: Uint8Array | null }) => void) | null;
}
interface MidiAccessLike {
  inputs: Map<string, MidiInputLike>;
  onstatechange: (() => void) | null;
}

/** Thin Web MIDI wrapper with graceful fallback. */
export class Midi {
  status: MidiStatus;
  devices: string[] = [];
  private access: MidiAccessLike | null = null;
  onNote: ((note: number, velocity: number) => void) | null = null;
  onChange: (() => void) | null = null;

  constructor() {
    this.status = 'requestMIDIAccess' in navigator ? 'idle' : 'unsupported';
  }

  async connect() {
    if (this.status === 'unsupported') return;
    this.status = 'connecting';
    this.onChange?.();
    try {
      const nav = navigator as unknown as { requestMIDIAccess: (o?: object) => Promise<MidiAccessLike> };
      this.access = await nav.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => this.bind();
      this.bind();
    } catch {
      this.status = 'denied';
      this.onChange?.();
    }
  }

  private bind() {
    if (!this.access) return;
    this.devices = [];
    this.access.inputs.forEach((input) => {
      this.devices.push([input.manufacturer, input.name].filter(Boolean).join(' ') || 'MIDI input');
      input.onmidimessage = (e) => {
        const d = e.data;
        if (!d || d.length < 3) return;
        const cmd = d[0] & 0xf0;
        if (cmd === 0x90 && d[2] > 0) this.onNote?.(d[1], d[2]);
      };
    });
    this.status = this.devices.length ? 'connected' : 'nodevices';
    this.onChange?.();
  }
}
