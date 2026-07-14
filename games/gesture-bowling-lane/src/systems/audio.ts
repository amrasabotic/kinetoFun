let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', gain = 0.15, delayMs = 0) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audioCtx.currentTime + delayMs / 1000;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(gain, start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.02);
}

function noiseBurst(durationMs: number, gain = 0.14, delayMs = 0) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const bufferSize = Math.floor(audioCtx.sampleRate * (durationMs / 1000));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const gainNode = audioCtx.createGain();
  const start = audioCtx.currentTime + delayMs / 1000;
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000);
  source.connect(gainNode).connect(audioCtx.destination);
  source.start(start);
}

export const sfx = {
  swingWhoosh: () => tone(300, 140, 'sawtooth', 0.05),
  release: () => tone(700, 70, 'triangle', 0.1),
  rollHum: () => tone(120, 400, 'sine', 0.03),
  pinCrash: (count: number) => {
    noiseBurst(220 + count * 20, 0.1 + Math.min(0.12, count * 0.015));
  },
  gutter: () => tone(140, 300, 'sawtooth', 0.08),
  strike: () => {
    tone(659, 130, 'sine', 0.16);
    tone(880, 160, 'sine', 0.16, 90);
    tone(1174, 220, 'sine', 0.16, 180);
  },
  spare: () => {
    tone(587, 130, 'sine', 0.14);
    tone(784, 180, 'sine', 0.14, 100);
  },
  gameOver: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 220, 'sine', 0.16, i * 110));
  },
};
