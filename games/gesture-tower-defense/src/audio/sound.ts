/** All game audio is synthesized with the Web Audio API — no external sound files. */

let ctx: AudioContext | null = null;
let musicVol = 0.5;
let sfxVol = 0.7;
let musicNodes: { stop: () => void } | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setVolumes(music: number, sfx: number) {
  musicVol = music;
  sfxVol = sfx;
}

export function unlockAudio() {
  getCtx();
}

function tone(freq: number, durationSec: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
  const c = getCtx();
  const now = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, now);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, now + durationSec);
  const vol = (opts.gain ?? 0.5) * sfxVol;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.05);
}

function noiseBurst(durationSec: number, gain = 0.15, delay = 0) {
  const c = getCtx();
  const now = c.currentTime + delay;
  const bufferSize = Math.floor(c.sampleRate * durationSec);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gainNode = c.createGain();
  gainNode.gain.setValueAtTime(gain * sfxVol, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
  source.connect(gainNode).connect(c.destination);
  source.start(now);
}

export function playHoverTick() {
  tone(660, 0.06, { type: 'sine', gain: 0.18 });
}

export function playConfirm() {
  tone(523.25, 0.09, { type: 'triangle', gain: 0.35 });
  tone(783.99, 0.14, { type: 'triangle', gain: 0.28, delay: 0.06 });
}

export function playPlaceTower() {
  tone(392, 0.08, { type: 'square', gain: 0.2 });
  tone(523.25, 0.1, { type: 'square', gain: 0.2, delay: 0.05 });
}

export function playSellTower() {
  tone(392, 0.12, { type: 'sawtooth', gain: 0.15, slideTo: 220 });
}

export function playShoot(kind: 'blaster' | 'cannon' | 'frost') {
  if (kind === 'cannon') noiseBurst(0.12, 0.22);
  else if (kind === 'frost') tone(1200, 0.07, { type: 'sine', gain: 0.14, slideTo: 900 });
  else tone(880, 0.05, { type: 'square', gain: 0.1 });
}

export function playEnemyHit() {
  tone(200, 0.05, { type: 'square', gain: 0.08 });
}

export function playEnemyDeath() {
  tone(300, 0.1, { type: 'sawtooth', gain: 0.16, slideTo: 80 });
}

export function playBaseHit() {
  tone(120, 0.3, { type: 'sawtooth', gain: 0.28 });
  noiseBurst(0.2, 0.2);
}

export function playWaveStart() {
  tone(440, 0.1, { type: 'triangle', gain: 0.22 });
  tone(660, 0.14, { type: 'triangle', gain: 0.2, delay: 0.08 });
}

export function playVictory() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.32, delay: i * 0.11 }));
}

export function playDefeat() {
  const notes = [392, 349.23, 293.66];
  notes.forEach((f, i) => tone(f, 0.3, { type: 'sawtooth', gain: 0.2, delay: i * 0.16 }));
}

export function playHandLost() {
  tone(140, 0.3, { type: 'sine', gain: 0.2 });
}

/** Soft ambient background pad. Call stopMusic() to end. */
export function startMusic() {
  stopMusic();
  const c = getCtx();
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 196;
  osc2.frequency.value = 246.94;
  gain.gain.value = 0;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(c.destination);
  gain.gain.linearRampToValueAtTime(0.05 * musicVol, c.currentTime + 1.5);
  osc1.start();
  osc2.start();

  const lfoId = window.setInterval(() => {
    const now = c.currentTime;
    const target = 0.035 + Math.random() * 0.03;
    gain.gain.linearRampToValueAtTime(target * musicVol, now + 3);
  }, 3000);

  musicNodes = {
    stop: () => {
      window.clearInterval(lfoId);
      gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
      osc1.stop(c.currentTime + 0.9);
      osc2.stop(c.currentTime + 0.9);
    },
  };
}

export function stopMusic() {
  musicNodes?.stop();
  musicNodes = null;
}
