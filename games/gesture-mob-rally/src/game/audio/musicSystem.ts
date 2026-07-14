import type { EnvironmentDef } from '../../types';
import { getAudioContext, getMusicGain } from './audioSystem';

let timerId: number | null = null;
let currentEnvId: string | null = null;

function noteFreq(env: EnvironmentDef, degree: number): number {
  const scaleLen = env.musicScale.length;
  const octave = Math.floor(degree / scaleLen);
  const idx = ((degree % scaleLen) + scaleLen) % scaleLen;
  const semitones = env.musicScale[idx] + octave * 12;
  return env.musicRootHz * Math.pow(2, semitones / 12);
}

function scheduleNote(env: EnvironmentDef): void {
  const ctx = getAudioContext();
  const gain = getMusicGain();
  if (!ctx || !gain || currentEnvId !== env.id) return;

  const degree = Math.floor(Math.random() * 5) - 1;
  const freq = noteFreq(env, degree);
  const dur = 0.35 + Math.random() * 0.5;

  const osc = ctx.createOscillator();
  const noteGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  noteGain.gain.setValueAtTime(0, ctx.currentTime);
  noteGain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.04);
  noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(noteGain); noteGain.connect(gain);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);

  // Occasional bass root note for a fuller loop
  if (Math.random() < 0.3) {
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.value = env.musicRootHz / 2;
    bassGain.gain.setValueAtTime(0, ctx.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    bass.connect(bassGain); bassGain.connect(gain);
    bass.start(ctx.currentTime); bass.stop(ctx.currentTime + 0.6);
  }

  timerId = window.setTimeout(() => scheduleNote(env), env.musicTempoMs);
}

/** Switches the looping generative background music to a new environment's scale/tempo/root. */
export function setMusicEnvironment(env: EnvironmentDef): void {
  if (currentEnvId === env.id) return;
  currentEnvId = env.id;
  if (timerId !== null) { window.clearTimeout(timerId); timerId = null; }
  scheduleNote(env);
}

export function stopMusic(): void {
  currentEnvId = null;
  if (timerId !== null) { window.clearTimeout(timerId); timerId = null; }
}
