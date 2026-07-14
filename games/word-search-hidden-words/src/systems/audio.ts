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
  hoverTick: () => tone(880, 40, 'sine', 0.05),
  letterSelect: () => tone(520, 80, 'triangle', 0.12),
  pathConnect: () => tone(660, 60, 'triangle', 0.1),
  wordFound: () => {
    tone(523, 120, 'sine', 0.15);
    tone(659, 120, 'sine', 0.15, 90);
    tone(784, 180, 'sine', 0.15, 180);
  },
  failFade: () => tone(220, 220, 'sawtooth', 0.1),
  victory: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 220, 'sine', 0.16, i * 110));
  },
};
