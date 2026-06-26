let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
}

function ac(): AudioContext | null { return ctx; }

function osc(freq: number, type: OscillatorType, dur: number, vol = 0.3, startT?: number) {
  const a = ac(); if (!a) return;
  const t = startT ?? a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.connect(g); g.connect(a.destination);
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.01);
}

export function playDraw() {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const b = a.createBiquadFilter();
  const g = a.createGain();
  const buf = a.createBuffer(1, a.sampleRate * 0.06, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
  const src = a.createBufferSource();
  src.buffer = buf;
  b.type = 'bandpass'; b.frequency.value = 2200; b.Q.value = 1.5;
  src.connect(b); b.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  src.start(t); src.stop(t + 0.07);
}

export function playPop() {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  osc(260, 'sine', 0.12, 0.4, t);
  osc(520, 'sine', 0.08, 0.15, t + 0.01);
}

export function playVictory() {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  const chord = [523, 659, 784, 1047];
  chord.forEach((f, i) => {
    osc(f, 'triangle', 0.5, 0.22, t + i * 0.08);
    osc(f * 2, 'sine', 0.4, 0.06, t + i * 0.08);
  });
}

export function playStarSparkle(n: number) {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  for (let i = 0; i < n; i++) {
    osc(1200 + i * 300, 'sine', 0.25, 0.12, t + i * 0.07);
  }
}

export function playHeart() {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  osc(880, 'sine', 0.18, 0.25, t);
  osc(1320, 'sine', 0.15, 0.12, t + 0.04);
}

export function playFailure() {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  osc(300, 'sawtooth', 0.3, 0.3, t);
  osc(220, 'sawtooth', 0.3, 0.28, t + 0.15);
  osc(180, 'sawtooth', 0.3, 0.22, t + 0.30);
}

export function playReset() {
  const a = ac(); if (!a) return;
  osc(400, 'triangle', 0.15, 0.2);
}

export function playInkEmpty() {
  const a = ac(); if (!a) return;
  osc(180, 'triangle', 0.25, 0.25);
  osc(140, 'triangle', 0.20, 0.22, (a.currentTime) + 0.15);
}
