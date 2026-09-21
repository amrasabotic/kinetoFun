let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function whiteNoise(ctx: AudioContext, dur: number): AudioBufferSourceNode {
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

export function initAudio() { getCtx(); }

// Whoosh on launch
export function playLaunch() {
  const ctx = getCtx();
  const noise = whiteNoise(ctx, 0.2);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(300, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.14);
  filter.Q.value = 1.5;
  const gain = ctx.createGain();
  noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.55, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  noise.start(ctx.currentTime);
  noise.onended = () => { filter.disconnect(); gain.disconnect(); };
}

// Thud on block hit
export function playHit() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.09);
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.9, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.13);
  osc.onended = () => gain.disconnect();
}

// Crack on block break
export function playBreak() {
  const ctx = getCtx();
  const noise = whiteNoise(ctx, 0.1);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = 900;
  const gain = ctx.createGain();
  noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.75, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  noise.start(ctx.currentTime);
  noise.onended = () => { filter.disconnect(); gain.disconnect(); };
}

// Pig squeal on death
export function playOink() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(420, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.14);
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  osc.onended = () => gain.disconnect();
}

// Happy ascending jingle on level complete
export function playWin() {
  const ctx = getCtx();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.13;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.start(t); osc.stop(t + 0.36);
    osc.onended = () => gain.disconnect();
  });
}

// Descending sad tones on game over
export function playLose() {
  const ctx = getCtx();
  [392, 330, 294, 262].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc.start(t); osc.stop(t + 0.46);
    osc.onended = () => gain.disconnect();
  });
}

// Elastic snap when bird pulled back
export function playStretch() {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.07);
  osc.onended = () => gain.disconnect();
}
