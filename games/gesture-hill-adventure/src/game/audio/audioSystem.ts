/**
 * Web Audio API sound system.
 * All sounds are synthesised procedurally — no external assets needed.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let engineOsc: OscillatorNode | null = null;
let engineGainNode: GainNode | null = null;
let musicEnabled = true;
let soundEnabled = true;

/** Must be called once after a user gesture (click / tap). */
export function initAudio(): void {
  if (ctx) return;
  ctx = new AudioContext();

  masterGain = ctx.createGain();
  masterGain.gain.value = 0.7;
  masterGain.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(masterGain);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = 1.0;
  sfxGain.connect(masterGain);

  // Start ambient background music loop
  startBackgroundMusic();
}

export function setMusicEnabled(on: boolean): void {
  musicEnabled = on;
  if (musicGain) musicGain.gain.value = on ? 0.35 : 0;
}

export function setSoundEnabled(on: boolean): void {
  soundEnabled = on;
  if (sfxGain) sfxGain.gain.value = on ? 1.0 : 0;
}

// ── Background Music ──────────────────────────────────────────────────────────

function startBackgroundMusic(): void {
  if (!ctx || !musicGain) return;

  // Simple arpeggio loop using a few oscillators
  const notes = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];
  let step = 0;

  function playNote() {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = notes[step % notes.length];
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.28);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
    step++;
    setTimeout(playNote, 220);
  }
  playNote();
}

// ── Engine Sound ──────────────────────────────────────────────────────────────

export function updateEngineSound(speed: number, throttle: number): void {
  if (!ctx || !sfxGain) return;

  const baseFreq = 80 + speed * 0.3 + throttle * 40;
  const vol      = 0.04 + Math.abs(throttle) * 0.06;

  if (!engineOsc) {
    engineOsc      = ctx.createOscillator();
    engineGainNode = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = baseFreq;
    engineGainNode.gain.value = vol;
    engineOsc.connect(engineGainNode);
    engineGainNode.connect(sfxGain);
    engineOsc.start();
  } else {
    engineOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.05);
    engineGainNode!.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
  }
}

export function stopEngineSound(): void {
  if (engineOsc) {
    try { engineOsc.stop(); } catch { /* already stopped */ }
    engineOsc      = null;
    engineGainNode = null;
  }
}

// ── One-shot SFX helpers ──────────────────────────────────────────────────────

function playTone(
  freq: number, dur: number, type: OscillatorType = 'sine',
  vol = 0.18, attack = 0.01, decay = 0.15,
): void {
  if (!ctx || !sfxGain || !soundEnabled) return;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g); g.connect(sfxGain);
  osc.start(); osc.stop(ctx.currentTime + dur + decay);
}

function playNoise(dur: number, vol = 0.12, freq = 800): void {
  if (!ctx || !sfxGain || !soundEnabled) return;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src    = ctx.createBufferSource();
  const flt    = ctx.createBiquadFilter();
  const g      = ctx.createGain();
  src.buffer   = buffer;
  flt.type     = 'bandpass';
  flt.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(flt); flt.connect(g); g.connect(sfxGain);
  src.start(); src.stop(ctx.currentTime + dur);
}

export function playCoin():         void { playTone(880, 0.12, 'sine',     0.15); playTone(1320, 0.08, 'sine', 0.1); }
export function playFuel():         void { playTone(440, 0.22, 'triangle', 0.18); playTone(550,  0.18, 'triangle', 0.12); }
export function playJump():         void { playTone(220, 0.10, 'square',   0.12); }
export function playLanding():      void { playNoise(0.12, 0.2, 300); }
export function playFlip():         void { playTone(660, 0.14, 'triangle', 0.2); playTone(880, 0.1, 'triangle', 0.15); }
export function playBoost():        void { playNoise(0.3, 0.25, 600); playTone(220, 0.3, 'sawtooth', 0.1); }
export function playCrash():        void { playNoise(0.5, 0.35, 200); playTone(80, 0.4, 'sawtooth', 0.2); }
export function playUiClick():      void { playTone(660, 0.06, 'sine', 0.1); }
export function playPerfectLand():  void { playTone(528, 0.12, 'sine', 0.18); playTone(660, 0.1, 'sine', 0.14); playTone(880, 0.08, 'sine', 0.1); }
export function playCombo():        void { playTone(880, 0.08, 'triangle', 0.15); }
