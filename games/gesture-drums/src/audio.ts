import type { DrumSound } from './gameLogic';

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function ramp(gain: GainNode, peak: number, attackMs: number, decayMs: number) {
  const ctx = gain.context;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + attackMs / 1000);
  gain.gain.exponentialRampToValueAtTime(0.001, now + (attackMs + decayMs) / 1000);
}

function whiteNoise(ctx: AudioContext, durationS: number): AudioBufferSourceNode {
  const bufLen = Math.ceil(ctx.sampleRate * durationS);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

export function playKick() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
  ramp(gain, 1.2, 2, 200);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
  osc.onended = () => { gain.disconnect(); };
}

export function playSnare() {
  const ctx = getCtx();
  // Tonal body
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  ramp(oscGain, 0.7, 1, 80);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
  osc.onended = () => oscGain.disconnect();

  // Noise rattle
  const noise = whiteNoise(ctx, 0.18);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.6;
  const noiseGain = ctx.createGain();
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  ramp(noiseGain, 0.8, 1, 120);
  noise.start(ctx.currentTime);
  noise.onended = () => { filter.disconnect(); noiseGain.disconnect(); };
}

export function playHiHat(open = false) {
  const ctx = getCtx();
  const noise = whiteNoise(ctx, open ? 0.4 : 0.08);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  ramp(gain, 0.5, 1, open ? 250 : 40);
  noise.start(ctx.currentTime);
  noise.onended = () => { filter.disconnect(); gain.disconnect(); };
}

export function playCrash() {
  const ctx = getCtx();
  const noise = whiteNoise(ctx, 1.2);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  const gain = ctx.createGain();
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  ramp(gain, 0.7, 3, 900);
  noise.start(ctx.currentTime);
  noise.onended = () => { filter.disconnect(); gain.disconnect(); };
}

export function playTom(freq = 180) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  ramp(gain, 1.0, 2, 200);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);
  osc.onended = () => gain.disconnect();
}

export function playRimShot() {
  const ctx = getCtx();
  // Click
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.002), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = i === 0 ? 1 : 0;
  const click = ctx.createBufferSource();
  click.buffer = buf;
  const cGain = ctx.createGain();
  cGain.gain.value = 0.9;
  click.connect(cGain);
  cGain.connect(ctx.destination);
  click.start(ctx.currentTime);
  click.onended = () => cGain.disconnect();

  // Mid resonance
  const osc = ctx.createOscillator();
  const oGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 800;
  osc.connect(oGain);
  oGain.connect(ctx.destination);
  ramp(oGain, 0.4, 1, 60);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.07);
  osc.onended = () => oGain.disconnect();
}

export function playCowbell() {
  const ctx = getCtx();
  const freqs = [562, 845];
  freqs.forEach(f => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    osc.connect(gain);
    gain.connect(ctx.destination);
    ramp(gain, 0.3, 1, 280);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => gain.disconnect();
  });
}

export function playDrum(sound: DrumSound) {
  switch (sound) {
    case 'kick':     playKick(); break;
    case 'snare':    playSnare(); break;
    case 'hihat':    playHiHat(false); break;
    case 'crash':    playCrash(); break;
    case 'tom':      playTom(180); break;
    case 'floortom': playTom(110); break;
    case 'rimshot':  playRimShot(); break;
    case 'cowbell':  playCowbell(); break;
  }
}

export function initAudio() {
  getCtx();
}
