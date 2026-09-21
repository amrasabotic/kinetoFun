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
  if (ambientGain && ctx) ambientGain.gain.setValueAtTime(m ? 0 : 0.04, ctx.currentTime);
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

function noiseBurst(dur: number, vol: number, filter: BiquadFilterType, freq: number, q = 1) {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
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
export function playThrow(power: number) {
  const c = a(); if (!c) return;
  noiseBurst(0.12, 0.18, 'highpass', 1400, 0.7);            // whoosh
  osc(260 + power * 220, 'sawtooth', 0.14, 0.16, c.currentTime, 120);
}

export function playCharge() {
  osc(220, 'square', 0.06, 0.07);
}

export function playHitBody() {
  const c = a(); if (!c) return;
  osc(300, 'sine', 0.12, 0.3, c.currentTime, 150);
  noiseBurst(0.09, 0.2, 'bandpass', 900, 1.1);
}

export function playHeadshot() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(880, 'triangle', 0.16, 0.32, t, 1320);
  osc(1320, 'sine', 0.22, 0.18, t + 0.02);
  noiseBurst(0.06, 0.16, 'highpass', 2600, 1);
}

export function playStick() {
  noiseBurst(0.1, 0.16, 'lowpass', 500, 0.8);   // spear into ground/wall
}

export function playCoin() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(880, 'square', 0.06, 0.16, t);
  osc(1320, 'square', 0.08, 0.14, t + 0.05);
}

export function playCombo(n: number) {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  const base = 460 + n * 70;
  osc(base, 'triangle', 0.15, 0.2, t);
  osc(base * 1.5, 'sine', 0.13, 0.09, t + 0.04);
}

export function playPowerup() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  [523, 659, 880, 1047].forEach((f, i) => osc(f, 'triangle', 0.2, 0.16, t + i * 0.06));
}

export function playHurt() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(320, 'sawtooth', 0.22, 0.3, t, 150);
  noiseBurst(0.12, 0.2, 'bandpass', 500, 0.7);
}

export function playDodge() {
  noiseBurst(0.16, 0.16, 'highpass', 1800, 0.6);
}

export function playEnemyThrow() {
  osc(200, 'sawtooth', 0.1, 0.1, undefined, 90);
}

export function playWaveClear() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => {
    osc(f, 'triangle', 0.3, 0.2, t + i * 0.08);
    osc(f * 2, 'sine', 0.2, 0.06, t + i * 0.08);
  });
}

export function playBossRoar() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(110, 'sawtooth', 0.7, 0.34, t, 60);
  osc(70, 'square', 0.8, 0.24, t + 0.05, 45);
  noiseBurst(0.5, 0.2, 'lowpass', 220, 0.6);
}

export function playBossHit() {
  osc(160, 'square', 0.1, 0.18, undefined, 90);
}

export function playStar(i: number) {
  osc(1000 + i * 320, 'sine', 0.3, 0.16, (ctx?.currentTime ?? 0) + i * 0.12);
}

export function playSuccess() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    osc(f, 'triangle', 0.45, 0.22, t + i * 0.08);
    osc(f * 2, 'sine', 0.3, 0.06, t + i * 0.08);
  });
}

export function playGameOver() {
  const c = a(); if (!c) return;
  const t = c.currentTime;
  osc(330, 'sawtooth', 0.4, 0.28, t, 220);
  osc(247, 'sawtooth', 0.5, 0.26, t + 0.18, 130);
  osc(165, 'sawtooth', 0.6, 0.24, t + 0.36, 90);
}

// ── Ambient battlefield wind ───────────────────────────────────────────────────
export function startAmbience() {
  if (!ctx || ambientNode) return;
  const dur = 3;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 460; filt.Q.value = 0.5;
  const g = ctx.createGain(); g.gain.value = muted ? 0 : 0.04;
  src.connect(filt); filt.connect(g); g.connect(ctx.destination);
  src.start();
  ambientNode = src; ambientGain = g;
}

export function stopAmbience() {
  ambientNode?.stop();
  ambientNode = null;
  ambientGain = null;
}
