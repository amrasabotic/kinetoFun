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

export const sfx = {
  select: () => tone(520, 60, 'triangle', 0.1),
  enterDigit: () => tone(660, 70, 'triangle', 0.12),
  erase: () => tone(300, 80, 'sawtooth', 0.08),
  conflict: () => tone(220, 160, 'sawtooth', 0.09),
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 220, 'sine', 0.16, i * 110));
  },
};
