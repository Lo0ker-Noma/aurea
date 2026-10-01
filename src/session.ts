/**
 * Shared "Continuous / Timer" session logic, used by Meditate and Studio.
 * One timer at a time (audio is shared); it belongs to the tab that started it.
 */
export type SessionScope = 'meditate' | 'studio';
export type TimerState = 'idle' | 'running' | 'paused';

export class SessionTimer {
  scope: SessionScope | null = null;
  state: TimerState = 'idle';
  private durMs = 0;
  private endAt = 0;
  private remaining = 0;

  active(scope?: SessionScope): boolean {
    return this.state !== 'idle' && (scope == null || this.scope === scope);
  }

  start(scope: SessionScope, minutes: number, now = performance.now()) {
    this.scope = scope;
    this.durMs = minutes * 60000;
    this.remaining = this.durMs;
    this.endAt = now + this.durMs;
    this.state = 'running';
  }

  pause(now = performance.now()) {
    if (this.state !== 'running') return;
    this.remaining = Math.max(0, this.endAt - now);
    this.state = 'paused';
  }

  resume(now = performance.now()) {
    if (this.state !== 'paused') return;
    this.endAt = now + this.remaining;
    this.state = 'running';
  }

  cancel() {
    this.state = 'idle';
    this.scope = null;
  }

  /** ms left (running/paused); null when idle. */
  left(now = performance.now()): number | null {
    if (this.state === 'running') return Math.max(0, this.endAt - now);
    if (this.state === 'paused') return this.remaining;
    return null;
  }

  /** Debug/test: make the current countdown end in `ms`. */
  setLeft(ms: number, now = performance.now()) {
    if (this.state === 'running') this.endAt = now + ms;
    else if (this.state === 'paused') this.remaining = ms;
  }

  due(now = performance.now()): boolean {
    return this.state === 'running' && now >= this.endAt;
  }
}
