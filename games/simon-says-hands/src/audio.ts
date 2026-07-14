let _ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

export function initAudio() { getCtx(); }

// Each panel has a distinct sine tone
const PANEL_FREQS = [523, 659, 784, 880] as const; // C5 E5 G5 A5

export function playPanel(index: number, lit = true) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = PANEL_FREQS[index] ?? 523;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const dur = lit ? 0.45 : 0.12;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur + 0.01);
  osc.onended = () => gain.disconnect();
}

export function playCorrect() {
  // Short upward chirp
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.12);
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.16);
  osc.onended = () => gain.disconnect();
}

export function playWin() {
  // Ascending jingle: C5 E5 G5 C6
  const ctx = getCtx();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.35);
    osc.onended = () => gain.disconnect();
  });
}

export function playFail() {
  // Descending buzzer
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  osc.onended = () => gain.disconnect();
}

export function playSlap() {
  // Short thud confirming hand slap
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.07);
  osc.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
  osc.onended = () => gain.disconnect();
}
