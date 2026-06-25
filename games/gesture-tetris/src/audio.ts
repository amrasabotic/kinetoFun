let ctx: AudioContext | null = null;

export function initAudio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
}

function getCtx(): AudioContext | null {
  return ctx;
}

function tone(
  freq:      number,
  duration:  number,
  type:      OscillatorType = 'square',
  gain      = 0.15,
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

function chord(freqs: number[], duration: number, gain = 0.1) {
  freqs.forEach(f => tone(f, duration, 'sine', gain));
}

export function playMove() {
  tone(200, 35, 'square', 0.06);
}

export function playRotate() {
  tone(330, 55, 'sine', 0.10, 220);
}

export function playLock() {
  tone(110, 80, 'triangle', 0.12);
}

export function playSoftDrop() {
  tone(90, 25, 'sine', 0.07);
}

export function playLineClear(lines: number) {
  if (lines >= 4) {
    // Tetris fanfare — ascending arp + chord
    const notes = [261, 329, 392, 523, 659, 784, 1046, 880];
    notes.forEach((f, i) => {
      const c = getCtx();
      if (!c) return;
      const osc = c.createOscillator();
      const vol = c.createGain();
      osc.connect(vol);
      vol.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, c.currentTime + i * 0.045);
      vol.gain.setValueAtTime(0, c.currentTime + i * 0.045);
      vol.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.045 + 0.01);
      vol.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.045 + 0.12);
      osc.start(c.currentTime + i * 0.045);
      osc.stop(c.currentTime + i * 0.045 + 0.15);
    });
  } else {
    // Single/double/triple — ascending arp
    const basePitch = lines === 1 ? 440 : lines === 2 ? 523 : 659;
    const count = lines + 1;
    for (let i = 0; i < count; i++) {
      const c = getCtx();
      if (!c) return;
      const osc = c.createOscillator();
      const vol = c.createGain();
      osc.connect(vol);
      vol.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(basePitch * Math.pow(1.25, i), c.currentTime + i * 0.06);
      vol.gain.setValueAtTime(0, c.currentTime + i * 0.06);
      vol.gain.linearRampToValueAtTime(0.14, c.currentTime + i * 0.06 + 0.01);
      vol.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.06 + 0.1);
      osc.start(c.currentTime + i * 0.06);
      osc.stop(c.currentTime + i * 0.06 + 0.15);
    }
  }
}

export function playLevelUp() {
  tone(523, 120, 'sine', 0.12, 330);
  setTimeout(() => tone(659, 120, 'sine', 0.12), 110);
  setTimeout(() => tone(784, 200, 'sine', 0.15), 220);
}

export function playGameOver() {
  const notes = [440, 330, 261, 196, 165];
  notes.forEach((f, i) => {
    setTimeout(() => tone(f, 180, 'sawtooth', 0.10), i * 160);
  });
}

export function playHold() {
  chord([330, 415], 80, 0.08);
}
