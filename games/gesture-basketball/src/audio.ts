let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
}

function getCtx(): AudioContext | null { return ctx; }

function tone(
  freq:      number,
  duration:  number,
  type:      OscillatorType = 'sine',
  gain       = 0.15,
  startFreq?: number,
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.connect(vol);
  vol.connect(c.destination);
  osc.type = type;
  const now = c.currentTime;
  if (startFreq !== undefined) {
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(freq, now + duration / 1000);
  } else {
    osc.frequency.setValueAtTime(freq, now);
  }
  vol.gain.setValueAtTime(gain, now);
  vol.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
  osc.start(now);
  osc.stop(now + duration / 1000 + 0.01);
}

function noiseHit(duration: number, gain = 0.07) {
  const c = getCtx();
  if (!c) return;
  const len  = Math.ceil(c.sampleRate * duration / 1000);
  const buf  = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const vol  = c.createGain();
  src.connect(vol);
  vol.connect(c.destination);
  const now = c.currentTime;
  vol.gain.setValueAtTime(gain, now);
  vol.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
  src.start(now);
  src.stop(now + duration / 1000 + 0.01);
}

// Ball release: short swoosh
export function playShoot() {
  noiseHit(80, 0.08);
  tone(300, 50, 'triangle', 0.08, 500);
}

// Clean swish through net
export function playSwish() {
  // Net swish sound: descending noise + bright chord
  noiseHit(120, 0.12);
  tone(523, 120, 'sine', 0.14);
  setTimeout(() => tone(659, 100, 'sine', 0.13), 60);
  setTimeout(() => tone(784, 150, 'sine', 0.15), 120);
  setTimeout(() => tone(1047, 200, 'sine', 0.12), 200);
}

// Bank shot off backboard then in
export function playBank() {
  tone(180, 60, 'sawtooth', 0.14);   // board thud
  noiseHit(50, 0.09);
  setTimeout(() => {
    noiseHit(100, 0.10);
    tone(523, 110, 'sine', 0.12);
    setTimeout(() => tone(659, 100, 'sine', 0.11), 60);
    setTimeout(() => tone(784, 140, 'sine', 0.13), 120);
  }, 100);
}

// Rim hit then miss
export function playMissRim() {
  tone(220, 60, 'sawtooth', 0.16);
  noiseHit(80, 0.10);
}

// Ball misses completely — soft whoosh
export function playMissAir() {
  noiseHit(110, 0.06);
  tone(200, 100, 'sine', 0.06, 350);
}

// Crowd cheers on a great shot
export function playCrowdCheer() {
  // Simulated crowd: layered noise bursts
  for (let i = 0; i < 4; i++) {
    setTimeout(() => noiseHit(180, 0.05 + i * 0.01), i * 60);
  }
}

// Game over tune — descending sad or triumphant depending on score
export function playGameOver(score: number) {
  if (score >= 70) {
    // Triumphant fanfare
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => tone(f, 160, 'triangle', 0.12), i * 145);
    });
  } else {
    // Gentle descending
    [440, 392, 349, 294].forEach((f, i) => {
      setTimeout(() => tone(f, 200, 'sine', 0.10), i * 190);
    });
  }
}
