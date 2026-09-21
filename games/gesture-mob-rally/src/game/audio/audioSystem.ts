let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGainNode: GainNode | null = null;
let sfxGainNode: GainNode | null = null;

export function initAudio(): void {
  if (ctx) return;
  try {
    ctx = new AudioContext();
    masterGain = ctx.createGain(); masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    musicGainNode = ctx.createGain(); musicGainNode.gain.value = 0.35;
    musicGainNode.connect(masterGain);
    sfxGainNode = ctx.createGain(); sfxGainNode.gain.value = 0.7;
    sfxGainNode.connect(masterGain);
  } catch { /* ignore — audio is optional */ }
}

export function getAudioContext(): AudioContext | null { return ctx; }
export function getMusicGain(): GainNode | null { return musicGainNode; }

export function setMusicVolume(v: number): void { if (musicGainNode) musicGainNode.gain.value = v; }
export function setSfxVolume(v: number): void { if (sfxGainNode) sfxGainNode.gain.value = v; }

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.14): void {
  if (!ctx || !sfxGainNode) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(sfxGainNode);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

function noiseBurst(dur: number, vol = 0.12): void {
  if (!ctx || !sfxGainNode) return;
  try {
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain); gain.connect(sfxGainNode);
    src.start();
  } catch { /* ignore */ }
}

export function playGatePick(op: 'add' | 'multiply'): void {
  if (op === 'multiply') [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'sine', 0.11), i * 55));
  else tone(880, 0.14, 'sine', 0.12);
}

export function playCrowdGrow(): void { tone(660, 0.1, 'triangle', 0.08); }
export function playObstacleHit(): void { noiseBurst(0.25, 0.16); tone(140, 0.3, 'sawtooth', 0.12); }
export function playCombatClash(): void { noiseBurst(0.08, 0.1); }
export function playChargeActivate(): void {
  [220, 330, 440, 660].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.1), i * 60));
}
export function playBossHit(): void { tone(200, 0.1, 'square', 0.1); }
export function playBossTelegraph(): void { tone(140, 0.4, 'sawtooth', 0.08); }
export function playCastleHit(): void { noiseBurst(0.15, 0.1); tone(110, 0.2, 'square', 0.08); }
export function playCastleCollapse(): void {
  noiseBurst(0.9, 0.22);
  [180, 140, 100, 70].forEach((f, i) => setTimeout(() => tone(f, 0.5, 'sawtooth', 0.14), i * 120));
}
export function playVictory(): void {
  [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.13), i * 90));
}
export function playDefeat(): void {
  [330, 260, 196, 130].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sawtooth', 0.12), i * 140));
}
export function playCoin(): void { tone(1320, 0.08, 'square', 0.09); }
export function playPowerUp(): void {
  [440, 660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.1), i * 45));
}
export function playPause(): void { tone(440, 0.12, 'triangle', 0.08); }
export function playClick(): void { tone(700, 0.05, 'square', 0.06); }
