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

type Curve = [number, number][];

// One synthesized voice: pitch and filter follow time curves, with optional vibrato, tremolo and noise breath.
function voice(o: {
  dur: number; delay?: number; type?: OscillatorType; pitch: Curve; gain?: number;
  filter?: { type: BiquadFilterType; freq: Curve; q?: number };
  vibrato?: [number, number]; tremolo?: [number, number]; noise?: number; env?: Curve;
}) {
  const c = getCtx();
  const t0 = c.currentTime + (o.delay ?? 0);
  const out = c.createGain();
  const vol = (o.gain ?? 0.5) * sfxVol;
  const env = o.env ?? [[0, 0], [0.05, 1], [0.8, 0.8], [1, 0]];
  out.gain.setValueAtTime(0, t0);
  for (const [k, v] of env) out.gain.linearRampToValueAtTime(Math.max(0, v * vol), t0 + k * o.dur);
  let dest: AudioNode = out;
  if (o.filter) {
    const f = c.createBiquadFilter();
    f.type = o.filter.type; f.Q.value = o.filter.q ?? 1;
    o.filter.freq.forEach(([k, v], i) => (i ? f.frequency.linearRampToValueAtTime(v, t0 + k * o.dur) : f.frequency.setValueAtTime(v, t0)));
    f.connect(out); dest = f;
  }
  let amp: AudioNode = dest;
  if (o.tremolo) {
    const tg = c.createGain(); tg.gain.value = 1 - o.tremolo[1];
    const lfo = c.createOscillator(); lfo.frequency.value = o.tremolo[0];
    const depth = c.createGain(); depth.gain.value = o.tremolo[1];
    lfo.connect(depth).connect(tg.gain); lfo.start(t0); lfo.stop(t0 + o.dur + 0.05);
    tg.connect(dest); amp = tg;
  }
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sawtooth';
  o.pitch.forEach(([k, v], i) => (i ? osc.frequency.linearRampToValueAtTime(v, t0 + k * o.dur) : osc.frequency.setValueAtTime(v, t0)));
  if (o.vibrato) {
    const lfo = c.createOscillator(); lfo.frequency.value = o.vibrato[0];
    const depth = c.createGain(); depth.gain.value = o.vibrato[1];
    lfo.connect(depth).connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + o.dur + 0.05);
  }
  osc.connect(amp); osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  if (o.noise) {
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * o.dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const ng = c.createGain(); ng.gain.value = o.noise;
    src.connect(ng).connect(amp); src.start(t0);
  }
  out.connect(c.destination);
}

// Hiss and similar sounds are pure filtered noise.
function noiseBurst(dur: number, freq: number, type: BiquadFilterType, gain: number, delay = 0) {
  const c = getCtx();
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain * sfxVol, t0 + 0.08); g.gain.linearRampToValueAtTime(gain * sfxVol * 0.7, t0 + dur * 0.7); g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(f).connect(g).connect(c.destination); src.start(t0);
}

const CALLS: Record<string, () => void> = {
  Bee: () => voice({ dur: 1.4, pitch: [[0, 210], [0.5, 240], [1, 200]], vibrato: [7, 18], filter: { type: 'lowpass', freq: [[0, 1400]] }, gain: 0.35 }),
  Cow: () => voice({ dur: 1.5, pitch: [[0, 120], [0.3, 128], [1, 100]], vibrato: [5, 3], filter: { type: 'lowpass', freq: [[0, 250], [0.35, 900], [1, 350]], q: 4 }, gain: 0.7, env: [[0, 0], [0.15, 1], [0.8, 0.9], [1, 0]] }),
  Dog: () => [0, 0.32].forEach((d) => voice({ dur: 0.18, delay: d, type: 'square', pitch: [[0, 260], [0.3, 320], [1, 150]], filter: { type: 'lowpass', freq: [[0, 1600], [1, 500]] }, noise: 0.4, gain: 0.6, env: [[0, 0], [0.1, 1], [0.5, 0.7], [1, 0]] })),
  Elephant: () => voice({ dur: 1.1, pitch: [[0, 420], [0.2, 760], [0.7, 700], [1, 520]], vibrato: [11, 25], filter: { type: 'bandpass', freq: [[0, 1200], [0.5, 1800], [1, 1000]], q: 3 }, noise: 0.15, gain: 0.7 }),
  Frog: () => [0, 0.45].forEach((d) => voice({ dur: 0.32, delay: d, type: 'square', pitch: [[0, 180], [1, 140]], tremolo: [28, 0.9], filter: { type: 'lowpass', freq: [[0, 900]] }, gain: 0.55 })),
  Goat: () => voice({ dur: 0.9, pitch: [[0, 420], [0.3, 460], [1, 380]], tremolo: [22, 0.7], filter: { type: 'bandpass', freq: [[0, 900], [1, 700]], q: 2 }, gain: 0.7 }),
  Horse: () => voice({ dur: 1.3, pitch: [[0, 700], [0.15, 1100], [0.6, 800], [1, 400]], vibrato: [16, 60], filter: { type: 'bandpass', freq: [[0, 1500], [1, 800]], q: 1.5 }, noise: 0.1, gain: 0.55 }),
  Kitten: () => voice({ dur: 0.8, pitch: [[0, 560], [0.35, 820], [1, 520]], filter: { type: 'bandpass', freq: [[0, 700], [0.4, 1800], [1, 900]], q: 3 }, gain: 0.6, env: [[0, 0], [0.1, 1], [0.7, 0.8], [1, 0]] }),
  Lion: () => { voice({ dur: 1.6, pitch: [[0, 90], [0.3, 110], [1, 60]], vibrato: [9, 8], filter: { type: 'lowpass', freq: [[0, 300], [0.3, 800], [1, 250]], q: 2 }, noise: 0.6, gain: 0.9, env: [[0, 0], [0.25, 1], [0.7, 0.8], [1, 0]] }); },
  Monkey: () => { [0, 0.25].forEach((d) => voice({ dur: 0.2, delay: d, type: 'triangle', pitch: [[0, 450], [1, 650]], gain: 0.6 })); [0.55, 0.85].forEach((d) => voice({ dur: 0.25, delay: d, type: 'sawtooth', pitch: [[0, 900], [1, 1100]], filter: { type: 'lowpass', freq: [[0, 2200]] }, gain: 0.45 })); },
  Owl: () => [0, 0.55].forEach((d, i) => voice({ dur: i ? 0.6 : 0.4, delay: d, type: 'sine', pitch: [[0, 390], [0.3, 400], [1, 340]], gain: 0.7, env: [[0, 0], [0.2, 1], [0.7, 0.8], [1, 0]] })),
  Pig: () => [0, 0.3].forEach((d) => voice({ dur: 0.22, delay: d, type: 'square', pitch: [[0, 220], [1, 140]], filter: { type: 'bandpass', freq: [[0, 600], [1, 400]], q: 2 }, noise: 0.5, gain: 0.7 })),
  Rooster: () => [[0, 0.18, 520, 600], [0.2, 0.18, 680, 720], [0.4, 0.18, 720, 760], [0.6, 0.7, 820, 560]].forEach(([d, l, a, b]) =>
    voice({ dur: l, delay: d, pitch: [[0, a], [1, b]], vibrato: [14, 20], filter: { type: 'bandpass', freq: [[0, 1600]], q: 1.5 }, gain: 0.55 })),
  Snake: () => noiseBurst(1.3, 4500, 'highpass', 0.45),
  Wolf: () => voice({ dur: 2, type: 'triangle', pitch: [[0, 380], [0.3, 640], [0.8, 600], [1, 420]], vibrato: [5, 10], gain: 0.6, env: [[0, 0], [0.2, 1], [0.8, 0.9], [1, 0]] }),
};

/** Plays the synthesized call of an Animal Sounds animal by name; unknown names are silent. */
export function playAnimalCall(word: string) {
  try { CALLS[word]?.(); } catch { /* audio is optional */ }
}
