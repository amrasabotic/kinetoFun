let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function initAudio() { ctx(); }

// Angry car horn — sawtooth burst
export function playHorn() {
  const c = ctx();
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, c.currentTime);
  osc.frequency.setValueAtTime(185, c.currentTime + 0.12);
  osc.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.4, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.55);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.6);
  osc.onended = () => g.disconnect();
}

// Car swoosh through intersection
export function playCarPass() {
  const c = ctx();
  const len = Math.ceil(c.sampleRate * 0.18);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bpf = c.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.value = 1200; bpf.Q.value = 0.8;
  const g = c.createGain();
  src.connect(bpf); bpf.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.18, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  src.start(c.currentTime);
  src.onended = () => { bpf.disconnect(); g.disconnect(); };
}

// Pedestrian crossing beep-beep
export function playPedPass() {
  const c = ctx();
  [0, 0.14].forEach(offset => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = 'sine'; osc.frequency.value = 880;
    osc.connect(g); g.connect(c.destination);
    const t = c.currentTime + offset;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.start(t); osc.stop(t + 0.12);
    osc.onended = () => g.disconnect();
  });
}

// Phase change click
export function playPhaseChange() {
  const c = ctx();
  const osc = c.createOscillator();
  const g   = c.createGain();
  osc.type = 'sine'; osc.frequency.value = 660;
  osc.connect(g); g.connect(c.destination);
  g.gain.setValueAtTime(0.15, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
  osc.start(c.currentTime); osc.stop(c.currentTime + 0.08);
  osc.onended = () => g.disconnect();
}

// Strike alarm — harsh buzz
export function playStrike() {
  const c = ctx();
  [0, 0.18, 0.36].forEach(offset => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = 'square'; osc.frequency.value = 180;
    osc.connect(g); g.connect(c.destination);
    const t = c.currentTime + offset;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.start(t); osc.stop(t + 0.16);
    osc.onended = () => g.disconnect();
  });
}

// Game over descending tones
export function playGameOver() {
  const c = ctx();
  [392, 330, 262].forEach((freq, i) => {
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = 'triangle'; osc.frequency.value = freq;
    osc.connect(g); g.connect(c.destination);
    const t = c.currentTime + i * 0.22;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.start(t); osc.stop(t + 0.5);
    osc.onended = () => g.disconnect();
  });
}
