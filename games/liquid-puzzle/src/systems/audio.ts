let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let droneNodes: { osc1: OscillatorNode; osc2: OscillatorNode } | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(ctx.destination);
  }
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.15, delayMs = 0) {
  const audioCtx = getCtx();
  if (!audioCtx || !sfxGain) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audioCtx.currentTime + delayMs / 1000;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  osc.connect(gainNode).connect(sfxGain);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.02);
}

function noiseBurst(durationMs: number, gain = 0.1, delayMs = 0, filterFreq = 4000) {
  const audioCtx = getCtx();
  if (!audioCtx || !sfxGain) return;
  const bufferSize = Math.floor(audioCtx.sampleRate * (durationMs / 1000));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gainNode = audioCtx.createGain();
  const start = audioCtx.currentTime + delayMs / 1000;
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  source.connect(filter).connect(gainNode).connect(sfxGain);
  source.start(start);
}

export const sfx = {
  gestureRecognized: () => tone(1400, 40, 'sine', 0.05),
  hover: () => tone(700, 40, 'sine', 0.04),
  select: () => {
    tone(880, 90, 'triangle', 0.12);
    tone(1320, 100, 'sine', 0.08, 40);
  },
  pour: () => {
    noiseBurst(360, 0.09, 0, 2200);
    tone(300, 200, 'sine', 0.05, 60);
  },
  splash: () => noiseBurst(180, 0.12, 0, 3200),
  glassClink: () => {
    tone(2200, 90, 'sine', 0.06);
    tone(3100, 70, 'sine', 0.04, 30);
  },
  error: () => {
    tone(160, 220, 'sawtooth', 0.1);
    noiseBurst(100, 0.06, 20, 900);
  },
  undo: () => tone(500, 120, 'triangle', 0.08),
  hint: () => {
    tone(660, 90, 'sine', 0.09);
    tone(990, 130, 'sine', 0.09, 90);
  },
  victory: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 240, 'sine', 0.15, i * 100));
  },
  starPop: () => tone(1600, 80, 'sine', 0.08),
};

/** Slow, quiet two-note ambient pad — deliberately minimal so it never competes with SFX; volume is entirely settings-driven. */
export function startAmbientMusic(volume: number) {
  const audioCtx = getCtx();
  if (!audioCtx || !musicGain) return;
  if (droneNodes) return;
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 196; // G3
  osc2.frequency.value = 246.94; // B3
  osc1.connect(musicGain);
  osc2.connect(musicGain);
  osc1.start();
  osc2.start();
  droneNodes = { osc1, osc2 };
  setMusicVolume(volume);
}

export function setMusicVolume(volume: number) {
  if (!musicGain || !ctx) return;
  musicGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)) * 0.08, ctx.currentTime + 0.3);
}

export function setSfxVolume(volume: number) {
  if (!sfxGain) return;
  sfxGain.gain.value = Math.max(0, Math.min(1, volume));
}

export function stopAmbientMusic() {
  if (!droneNodes) return;
  droneNodes.osc1.stop();
  droneNodes.osc2.stop();
  droneNodes = null;
}
