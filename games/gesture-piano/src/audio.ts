// Piano note frequencies: C4 through E5 (10 keys)
const FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25];

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function initAudio() {
  getCtx();
}

export function playNote(keyIndex: number, velocity = 0.6) {
  const ctx = getCtx();
  const freq = FREQUENCIES[keyIndex];
  if (!freq) return;

  const now = ctx.currentTime;

  // Piano-like tone: fundamental + octave harmonic + decay envelope
  const harmonics: [number, number][] = [
    [freq,     velocity],
    [freq * 2, velocity * 0.35],
    [freq * 3, velocity * 0.12],
  ];

  for (const [f, vol] of harmonics) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now);

    // Sharp attack, long piano decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(vol * 0.3, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.start(now);
    osc.stop(now + 1.8);
    osc.onended = () => { gain.disconnect(); };
  }
}
