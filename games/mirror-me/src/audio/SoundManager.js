// Procedural audio via Web Audio API — no external files needed
export class SoundManager {
  constructor() {
    this._ctx = null;
    this._muted = false;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _tone(freq, duration, type = 'sine', gain = 0.4, delay = 0) {
    if (this._muted) return;
    const ctx  = this._getCtx();
    const osc  = ctx.createOscillator();
    const amp  = ctx.createGain();
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    amp.gain.setValueAtTime(0, ctx.currentTime + delay);
    amp.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
  }

  countdown(number) {
    const freqs = { 3: 440, 2: 523, 1: 659 };
    this._tone(freqs[number] ?? 440, 0.18, 'square', 0.3);
  }

  go() {
    this._tone(880, 0.10, 'square', 0.4);
    this._tone(1046, 0.15, 'square', 0.4, 0.12);
    this._tone(1319, 0.25, 'square', 0.4, 0.25);
  }

  perfect() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.15, 'sine', 0.35, i * 0.08));
  }

  good() {
    this._tone(523, 0.12, 'sine', 0.3);
    this._tone(659, 0.18, 'sine', 0.3, 0.10);
  }

  miss() {
    this._tone(220, 0.10, 'sawtooth', 0.25);
    this._tone(165, 0.20, 'sawtooth', 0.25, 0.12);
  }

  combo(level) {
    const base = 440 + level * 60;
    this._tone(base, 0.08, 'sine', 0.3);
    this._tone(base * 1.5, 0.12, 'sine', 0.3, 0.10);
  }

  gameOver() {
    [659, 587, 523, 440, 330].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.3, i * 0.14));
  }

  tick() {
    this._tone(1200, 0.04, 'square', 0.15);
  }

  toggleMute() {
    this._muted = !this._muted;
    return this._muted;
  }

  get muted() { return this._muted; }
}
