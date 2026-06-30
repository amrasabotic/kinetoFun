let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

export function initAudio(): void {
  if (ctx) return;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain(); masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.4;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);
    startAmbientMusic();
  } catch { /* ignore */ }
}

export function setMusicVolume(v: number): void { if (musicGain) musicGain.gain.value = v; }
export function setSfxVolume(v: number): void   { if (sfxGain)  sfxGain.gain.value   = v; }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15): void {
  if (!ctx || !sfxGain) return;
  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

export function playPickup(color: string): void {
  const freqMap: Record<string,number> = { blue:880, green:1100, purple:1320, gold:1760, rainbow:2200 };
  tone(freqMap[color] ?? 880, 0.1, 'sine', 0.1);
}

export function playBoost(): void {
  if (!ctx || !sfxGain) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch { /* ignore */ }
}

export function playDeath(): void {
  tone(120, 0.8, 'sawtooth', 0.2);
  setTimeout(() => tone(80, 0.6, 'sine', 0.15), 150);
}

export function playKill(): void {
  [880, 1100, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'square', 0.1), i * 60));
}

export function playPowerUp(): void {
  [440, 660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.1), i * 50));
}

export function playCombo(level: number): void {
  const freq = 440 * Math.pow(1.2, level);
  tone(freq, 0.15, 'square', 0.08);
}

export function playQuestComplete(): void {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.12), i * 80));
}

export function playClick(): void {
  tone(800, 0.05, 'square', 0.06);
}

// Ambient generative music
let musicOsc: OscillatorNode | null = null;
let musicAnimFrame = 0;
const SCALE = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];

function startAmbientMusic(): void {
  if (!ctx || !musicGain) return;
  scheduleNote();
}

function scheduleNote(): void {
  if (!ctx || !musicGain) return;
  const freq = SCALE[Math.floor(Math.random() * SCALE.length)] * (Math.random() > 0.5 ? 1 : 0.5);
  const dur  = 0.4 + Math.random() * 0.8;
  const wait = 0.3 + Math.random() * 1.2;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain); gain.connect(musicGain);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);

  musicAnimFrame = window.setTimeout(scheduleNote, wait * 1000);
}
