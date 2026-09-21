import { getAudioContext, getSfxVolume } from './sound';
import type { InstrumentId } from '../data/instruments';

function tone(freq: number, durationSec: number, opts: {
  type?: OscillatorType; gain?: number; delay?: number; slideTo?: number; vibrato?: number;
} = {}) {
  const c = getAudioContext();
  const now = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, now);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, now + durationSec);

  if (opts.vibrato) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 6;
    lfoGain.gain.value = opts.vibrato;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + durationSec + 0.05);
  }

  const vol = (opts.gain ?? 0.5) * getSfxVolume();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.05);
}

function noiseBurst(durationSec: number, opts: { gain?: number; delay?: number; highpass?: number; bandpass?: number } = {}) {
  const c = getAudioContext();
  const now = c.currentTime + (opts.delay ?? 0);
  const bufferSize = Math.ceil(c.sampleRate * durationSec);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  if (opts.bandpass) {
    filter.type = 'bandpass';
    filter.frequency.value = opts.bandpass;
    filter.Q.value = 4;
  } else {
    filter.type = 'highpass';
    filter.frequency.value = opts.highpass ?? 1000;
  }

  const gain = c.createGain();
  const vol = (opts.gain ?? 0.4) * getSfxVolume();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start(now);
  source.stop(now + durationSec + 0.02);
}

export function playInstrumentSound(id: InstrumentId) {
  switch (id) {
    case 'drum':
      noiseBurst(0.18, { gain: 0.55, highpass: 80 });
      tone(90, 0.14, { type: 'sine', gain: 0.35 });
      break;
    case 'tambourine':
      noiseBurst(0.12, { gain: 0.3, bandpass: 6000 });
      noiseBurst(0.22, { gain: 0.18, bandpass: 9000, delay: 0.03 });
      break;
    case 'xylophone':
      tone(1046.5, 0.28, { type: 'triangle', gain: 0.35 });
      tone(1567.98, 0.2, { type: 'triangle', gain: 0.2, delay: 0.04 });
      break;
    case 'cymbal':
      noiseBurst(0.6, { gain: 0.28, highpass: 4000 });
      break;
    case 'maracas':
      noiseBurst(0.05, { gain: 0.3, highpass: 5000 });
      noiseBurst(0.05, { gain: 0.28, highpass: 5000, delay: 0.09 });
      noiseBurst(0.05, { gain: 0.22, highpass: 5000, delay: 0.18 });
      break;
    case 'piano':
      tone(523.25, 0.5, { type: 'sine', gain: 0.4 });
      tone(659.25, 0.4, { type: 'sine', gain: 0.22, delay: 0.02 });
      break;
    case 'guitar':
      tone(392, 0.45, { type: 'sawtooth', gain: 0.22, slideTo: 388 });
      tone(587.33, 0.35, { type: 'sawtooth', gain: 0.12, delay: 0.01 });
      break;
    case 'flute':
      tone(880, 0.55, { type: 'sine', gain: 0.32, vibrato: 6 });
      break;
    case 'violin':
      tone(659.25, 0.55, { type: 'sawtooth', gain: 0.22, vibrato: 10 });
      break;
    case 'trumpet':
      tone(523.25, 0.4, { type: 'square', gain: 0.22 });
      tone(659.25, 0.35, { type: 'sawtooth', gain: 0.14, delay: 0.01 });
      break;
  }
}
