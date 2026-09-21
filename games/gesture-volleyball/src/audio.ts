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

export function playHit() {
  tone(200, 55, 'triangle', 0.13);
  noiseHit(40, 0.05);
}

export function playSmash() {
  tone(270, 38, 'sawtooth', 0.16);
  tone(160, 85, 'triangle', 0.11, 70);
  noiseHit(60, 0.08);
}

export function playBlock() {
  tone(130, 75, 'triangle', 0.14);
  tone(190, 50, 'square', 0.06);
}

export function playAIHit() {
  tone(230, 50, 'triangle', 0.09);
  noiseHit(30, 0.04);
}

export function playAISmash() {
  tone(310, 35, 'sawtooth', 0.11);
  tone(190, 80, 'triangle', 0.08, 90);
}

export function playServe() {
  tone(440, 80, 'sine', 0.10);
  setTimeout(() => tone(660, 60, 'sine', 0.08), 90);
}

export function playPointScored() {
  tone(523, 100, 'sine', 0.12);
  setTimeout(() => tone(659, 100, 'sine', 0.12), 100);
  setTimeout(() => tone(784, 160, 'sine', 0.15), 200);
}

export function playPointLost() {
  tone(330, 100, 'sine', 0.10);
  setTimeout(() => tone(294, 120, 'sine', 0.10), 100);
  setTimeout(() => tone(247, 190, 'sine', 0.11), 220);
}

export function playGameOver() {
  [523, 494, 440, 392, 349].forEach((f, i) => {
    setTimeout(() => tone(f, 200, 'triangle', 0.10), i * 185);
  });
}
