let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function tone(freq: number, type: OscillatorType, durationMs: number, gain = 0.3, detune = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value    = detune;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationMs / 1000);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + durationMs / 1000);
}

export function playShoot() {
  tone(440, 'sine', 120, 0.2);
}

export function playBounce() {
  tone(280, 'triangle', 80, 0.15);
}

export function playPop(count: number) {
  const c = getCtx();
  const now = c.currentTime;
  const freqs = count >= 6
    ? [523, 659, 784, 1047]
    : count >= 4
    ? [523, 659, 784]
    : [523, 659];
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.25, now + i * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.18);
  });
}

export function playLevelUp() {
  const c = getCtx();
  const now = c.currentTime;
  [523, 659, 784, 880, 1047].forEach((f, i) => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.3, now + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.22);
  });
}

export function playGameOver() {
  const c = getCtx();
  const now = c.currentTime;
  [400, 320, 250, 180].forEach((f, i) => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.2, now + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.28);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.28);
  });
}
