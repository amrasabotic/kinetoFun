let ctx: AudioContext | null = null;
let muted = false;
let ambientGain: GainNode | null = null;
let ambientNode: AudioBufferSourceNode | null = null;

export function initAudio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (ambientGain && ctx) {
    ambientGain.gain.setValueAtTime(m ? 0 : 0.05, ctx.currentTime);
  }
}

function a(): AudioContext | null {
  if (muted) return null;
  return ctx;
}

function osc(freq: number, type: OscillatorType, dur: number, vol = 0.3, startT?: number, endFreq?: number) {
  const c = a(); if (!c) return;
  const t = startT ?? c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}

function noiseBurst(dur: number, vol: number, filter: 'lowpass' | 'bandpass' | 'highpass', freq: number, q = 1) {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const b = c.createBiquadFilter(); b.type = filter; b.frequency.value = freq; b.Q.value = q;
  const g = c.createGain();
  src.connect(b); b.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t); src.stop(t + dur + 0.02);
}

// ── Gameplay SFX ─────────────────────────────────────────────────────────────
export function playShot() {
  const c = a(); if (!c) return;
  noiseBurst(0.22, 0.5, 'lowpass', 900, 0.8);   // muffled suppressed crack
  osc(180, 'sawtooth', 0.12, 0.25, c.currentTime, 60);
}

export function playEmpty() {
  noiseBurst(0.05, 0.25, 'highpass', 3000, 1);
  osc(420, 'square', 0.04, 0.12);
}

export function playHitBody() {
  const c = a(); if (!c) return;
  osc(330, 'sine', 0.12, 0.3, c.currentTime, 180);
  noiseBurst(0.08, 0.2, 'bandpass', 1200, 1.2);
}

export function playHeadshot() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(880, 'triangle', 0.16, 0.32, t, 1320);
  osc(1320, 'sine', 0.2, 0.18, t + 0.02);
  noiseBurst(0.06, 0.18, 'highpass', 2600, 1);
}

export function playMiss() {
  noiseBurst(0.1, 0.18, 'bandpass', 700, 0.8);  // dust thud
}

export function playPenalty() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(300, 'sawtooth', 0.3, 0.3, t, 120);
  osc(220, 'sawtooth', 0.35, 0.26, t + 0.12, 90);
}

export function playCombo(n: number) {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  const base = 520 + n * 90;
  osc(base, 'triangle', 0.16, 0.22, t);
  osc(base * 1.5, 'sine', 0.14, 0.1, t + 0.04);
}

export function playZoom() {
  osc(660, 'square', 0.05, 0.16);
  osc(990, 'square', 0.04, 0.1, (ctx?.currentTime ?? 0) + 0.05);
}

export function playSteady() {
  const c = a(); if (!c) return;
  osc(523, 'sine', 0.5, 0.12, c.currentTime, 784);
}

export function playBeep() {
  osc(1000, 'sine', 0.08, 0.2);
}

export function playSuccess() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    osc(f, 'triangle', 0.45, 0.22, t + i * 0.09);
    osc(f * 2, 'sine', 0.35, 0.06, t + i * 0.09);
  });
}

export function playFail() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(330, 'sawtooth', 0.4, 0.28, t, 220);
  osc(247, 'sawtooth', 0.5, 0.26, t + 0.18, 130);
  osc(165, 'sawtooth', 0.6, 0.24, t + 0.36, 90);
}

export function playStar(i: number) {
  osc(1000 + i * 320, 'sine', 0.3, 0.16, (ctx?.currentTime ?? 0) + i * 0.12);
}

// ── Ambient wind loop ────────────────────────────────────────────────────────
export function startAmbience() {
  if (!ctx || ambientNode) return;
  const dur = 3;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 520; filt.Q.value = 0.4;
  const g = ctx.createGain(); g.gain.value = muted ? 0 : 0.05;
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start();
  ambientNode = src; ambientGain = g;
}

export function stopAmbience() {
  ambientNode?.stop();
  ambientNode = null;
  ambientGain = null;
}
