let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let ambientTimer: number | null = null;
let ambientOn = false;

export function initAudio(): void {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(masterGain);
  } catch {
    /* no audio available — game still fully playable */
  }
}

export function setMuted(muted: boolean): void {
  if (masterGain) masterGain.gain.value = muted ? 0 : 1;
}

export function setMusicVolume(v: number): void {
  if (musicGain) musicGain.gain.value = v;
}

export function setSfxVolume(v: number): void {
  if (sfxGain) sfxGain.gain.value = v;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0): void {
  if (!ctx || !sfxGain) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export function playMenuHover(): void {
  tone(660, 0.05, 'sine', 0.05);
}

export function playMenuSelect(): void {
  tone(880, 0.08, 'square', 0.08);
  tone(1320, 0.1, 'sine', 0.06, 0.05);
}

export function playOrb(chainIndex: number): void {
  const freq = 660 + Math.min(chainIndex, 12) * 40;
  tone(freq, 0.07, 'triangle', 0.1);
}

export function playPowerOrb(): void {
  [440, 660, 880, 1100].forEach((f, i) => tone(f, 0.14, 'sawtooth', 0.09, i * 0.05));
}

export function playGem(): void {
  tone(988, 0.1, 'sine', 0.1);
  tone(1318, 0.12, 'sine', 0.08, 0.04);
}

export function playTreasure(): void {
  [523, 659, 784, 988, 1318].forEach((f, i) => tone(f, 0.18, 'sine', 0.1, i * 0.06));
}

export function playEnemyDefeat(combo: number): void {
  const base = 300 + combo * 120;
  tone(base, 0.1, 'square', 0.12);
  tone(base * 1.5, 0.14, 'square', 0.08, 0.06);
}

export function playPlayerHit(): void {
  tone(180, 0.35, 'sawtooth', 0.18);
  tone(110, 0.4, 'sine', 0.12, 0.08);
}

export function playCountdownBeep(final: boolean): void {
  tone(final ? 1046 : 523, final ? 0.3 : 0.15, 'square', 0.12);
}

export function playLevelComplete(): void {
  [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'sine', 0.1, i * 0.09));
}

export function playGameOver(): void {
  [392, 349, 294, 220].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.12, i * 0.18));
}

export function playPowerModeEnd(): void {
  tone(220, 0.2, 'square', 0.1);
}

export function startAmbient(): void {
  if (!ctx || !musicGain || ambientOn) return;
  ambientOn = true;
  const scale = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392];
  const pulse = () => {
    if (!ambientOn || !ctx || !musicGain) return;
    const freq = scale[Math.floor(Math.random() * scale.length)] / 2;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(t0);
      osc.stop(t0 + 2.3);
    } catch {
      /* ignore */
    }
    ambientTimer = window.setTimeout(pulse, 1400 + Math.random() * 1200);
  };
  pulse();
}

export function stopAmbient(): void {
  ambientOn = false;
  if (ambientTimer !== null) {
    clearTimeout(ambientTimer);
    ambientTimer = null;
  }
}
