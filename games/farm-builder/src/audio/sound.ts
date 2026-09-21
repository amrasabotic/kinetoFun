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

/** Shared AudioContext + current sfx volume, for other synthesis modules (e.g. instruments.ts) to build on. */
export function getAudioContext(): AudioContext {
  return getCtx();
}

export function getSfxVolume(): number {
  return sfxVol;
}

export function unlockAudio() {
  getCtx();
}

function tone(freq: number, durationSec: number, opts: {
  type?: OscillatorType; gain?: number; delay?: number; slideTo?: number;
} = {}) {
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

export function playHoverTick() {
  tone(660, 0.06, { type: 'sine', gain: 0.18 });
}

export function playConfirm() {
  tone(523.25, 0.09, { type: 'triangle', gain: 0.35 });
  tone(783.99, 0.14, { type: 'triangle', gain: 0.28, delay: 0.06 });
}

/** Cheerful chime for a correct sort. */
export function playCorrect() {
  tone(587.33, 0.1, { type: 'triangle', gain: 0.3 });
  tone(880, 0.18, { type: 'triangle', gain: 0.32, delay: 0.08 });
  tone(1174.66, 0.16, { type: 'triangle', gain: 0.22, delay: 0.16 });
}

/** Gentle "try again" nudge — soft, never harsh, no punishment tone. */
export function playTryAgain() {
  tone(300, 0.14, { type: 'sine', gain: 0.14, slideTo: 240 });
}

export function playStar() {
  tone(1046.5, 0.16, { type: 'triangle', gain: 0.3 });
}

export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.32, delay: i * 0.11 }));
}

export function playUnlock() {
  tone(392, 0.1, { type: 'square', gain: 0.2 });
  tone(523.25, 0.22, { type: 'square', gain: 0.22, delay: 0.09 });
}

export function playHandLost() {
  tone(140, 0.3, { type: 'sine', gain: 0.2 });
}

/** Soft ambient background pad — starts a slowly-evolving two-note drone. Call stopMusic() to end. */
export function startMusic() {
  stopMusic();
  const c = getCtx();
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.value = 220;
  osc2.frequency.value = 277.18;
  gain.gain.value = 0;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(c.destination);
  gain.gain.linearRampToValueAtTime(0.06 * musicVol, c.currentTime + 1.5);
  osc1.start();
  osc2.start();

  const lfoId = window.setInterval(() => {
    const now = c.currentTime;
    const target = 0.04 + Math.random() * 0.04;
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

/** Speaks a short word aloud via the browser's built-in speech synthesis (Audio Narration setting). */
export function speak(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  utter.pitch = 1.1;
  utter.volume = sfxVol;
  window.speechSynthesis.speak(utter);
}
