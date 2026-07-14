export type GameMode = 'freeplay' | 'easy' | 'medium' | 'hard';

export const NUM_KEYS = 10;

// Display names for keys
export const KEY_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C\'', 'D\'', 'E\''];

// One vivid color per key (Guitar-Hero style)
export const KEY_COLORS = [
  '#ef4444', // C  - red
  '#f97316', // D  - orange
  '#eab308', // E  - yellow
  '#22c55e', // F  - green
  '#06b6d4', // G  - cyan
  '#3b82f6', // A  - blue
  '#8b5cf6', // B  - violet
  '#ec4899', // C5 - pink
  '#f43f5e', // D5 - rose
  '#84cc16', // E5 - lime
];

export const CANVAS_W = 960;
export const CANVAS_H = 600;

// Y positions (canvas pixels)
export const HIT_LINE_Y = 495; // where bars must be caught
export const KEY_TOP_Y  = 502; // top of the piano key zone
export const KEY_H      = 88;  // height of piano key area

// Fingertip Y threshold: finger must be in the lower fraction of the camera frame
export const PRESS_Y_THRESHOLD = 0.64;

// Timing windows (milliseconds)
const PERFECT_WINDOW_MS = 65;
const GOOD_WINDOW_MS    = 130;
const MISS_WINDOW_MS    = 210;

// How long (ms) a bar takes to fall from top to hit line
export function fallDurationMs(mode: GameMode): number {
  if (mode === 'easy')   return 2600;
  if (mode === 'medium') return 2000;
  return 1500;
}

export interface PianoNote {
  time:     number;   // ms from song start when note should be hit
  keyIndex: number;   // 0–9
  hit:      'none' | 'perfect' | 'good' | 'miss';
}

export interface HitFeedback {
  text:      string;
  color:     string;
  timestamp: number;
  keyIndex:  number;
}

export interface GameState {
  mode:         GameMode;
  score:        number;
  combo:        number;
  maxCombo:     number;
  totalNotes:   number;
  hitNotes:     number;
  songTime:     number;   // ms elapsed since song start
  songDuration: number;   // ms
  notes:        PianoNote[];
  phase:        'playing' | 'finished';
  hitFeedback:  HitFeedback | null;
}

// ── Song patterns ─────────────────────────────────────────────────────────────
// Keys: 0=C4  1=D4  2=E4  3=F4  4=G4  5=A4  6=B4  7=C5  8=D5  9=E5

// Easy – Twinkle Twinkle Little Star (80 BPM, 750 ms/beat)
function makeTwinkle(): PianoNote[] {
  const beat = 750;
  // C C G G A A G  F F E E D D C  G G F F E E D  G G F F E E D  C C G G A A G  F F E E D D C
  const seq = [0,0,4,4,5,5,4, 3,3,2,2,1,1,0, 4,4,3,3,2,2,1, 4,4,3,3,2,2,1, 0,0,4,4,5,5,4, 3,3,2,2,1,1,0];
  return seq.map((k, i) => ({ time: 1200 + i * beat, keyIndex: k, hit: 'none' }));
}

// Medium – Ode to Joy (Beethoven, ~100 BPM, 600 ms/beat quarter)
function makeOdeToJoy(): PianoNote[] {
  const q = 600;   // quarter note
  const h = 1200;  // half note
  const dq = 900;  // dotted quarter
  const events: { t: number; k: number }[] = [];
  let t = 1200;

  function note(k: number, dur: number) { events.push({ t, k }); t += dur; }
  function rest(dur: number)             { t += dur; }

  // Phrase 1 (twice)
  for (let rep = 0; rep < 2; rep++) {
    // E E F G G F E D C C D E E. D. D
    note(2, q); note(2, q); note(3, q); note(4, q);
    note(4, q); note(3, q); note(2, q); note(1, q);
    note(0, q); note(0, q); note(1, q); note(2, q);
    if (rep === 0) {
      note(2, dq); note(1, dq); note(1, h);
    } else {
      note(1, dq); note(0, dq); note(0, h);
    }
    rest(300);
  }

  // Phrase 2
  // D D E C  D E F E C  D E F E D  C D G
  note(1, q); note(1, q); note(2, q); note(0, q);
  note(1, q); note(2, q); note(3, q); note(2, q);
  note(0, h);
  note(1, q); note(2, q); note(3, q); note(2, q);
  note(1, q); note(0, q); note(1, q); note(4, h);
  rest(300);

  // Phrase 1 reprise
  note(2, q); note(2, q); note(3, q); note(4, q);
  note(4, q); note(3, q); note(2, q); note(1, q);
  note(0, q); note(0, q); note(1, q); note(2, q);
  note(1, dq); note(0, dq); note(0, h);

  return events.map(e => ({ time: e.t, keyIndex: e.k, hit: 'none' as const }));
}

// Hard – Fast piano run (120 BPM, mix of quarters and eighths)
function makeHard(): PianoNote[] {
  const q  = 500;   // quarter  @120 BPM
  const e  = 250;   // eighth
  const h  = 1000;  // half
  const events: { t: number; k: number }[] = [];
  let t = 1200;

  function note(k: number, dur: number) { events.push({ t, k }); t += dur; }
  function rest(dur: number)             { t += dur; }

  // Simplified Für Elise opening motif (adapted to white keys)
  for (let rep = 0; rep < 2; rep++) {
    note(9, e); note(8, e); note(9, e); note(8, e); note(9, e); note(4, e); note(6, e); note(5, e);
    note(0, q); note(4, e); note(0, e); note(3, q); note(2, e); note(0, e);
    note(1, q); note(5, e); note(4, e); note(3, q); note(2, e); note(4, e);
    note(0, h);
    rest(250);
  }

  // Ascending / descending run
  for (const k of [0,1,2,3,4,5,6,7,8,9]) { note(k, e); }
  for (const k of [9,8,7,6,5,4,3,2,1,0]) { note(k, e); }

  // Chord-like simultaneous notes (strum in sequence)
  note(0, e); note(4, e); note(7, e); note(0, q);
  note(2, e); note(5, e); note(9, e); note(2, q);
  note(1, e); note(4, e); note(6, e); note(1, q);
  note(0, e); note(4, e); note(7, e); note(0, h);
  rest(250);

  // Final flurry
  for (const k of [0,2,4,5,4,2,0,2,4,7,9,7,4,2,0]) { note(k, e); }
  note(0, h); note(4, h); note(7, h);

  return events.map(ev => ({ time: ev.t, keyIndex: ev.k, hit: 'none' as const }));
}

export function makeNotes(mode: GameMode): PianoNote[] {
  if (mode === 'freeplay') return [];
  if (mode === 'easy')     return makeTwinkle();
  if (mode === 'medium')   return makeOdeToJoy();
  return makeHard();
}

export function songDuration(mode: GameMode): number {
  const notes = makeNotes(mode);
  if (notes.length === 0) return 0;
  return notes[notes.length - 1].time + 3000;
}

export function initialGameState(mode: GameMode): GameState {
  const notes = makeNotes(mode);
  return {
    mode,
    score:        0,
    combo:        0,
    maxCombo:     0,
    totalNotes:   notes.length,
    hitNotes:     0,
    songTime:     0,
    songDuration: songDuration(mode),
    notes,
    phase:        'playing',
    hitFeedback:  null,
  };
}

// ── Frame step ────────────────────────────────────────────────────────────────

export function stepGame(
  state:           GameState,
  deltaMs:         number,
  now:             number,
  newlyPressed:    Set<number>,
): GameState {
  if (state.phase === 'finished') return state;

  const newSongTime = state.songTime + deltaMs;
  let combo    = state.combo;
  let score    = state.score;
  let hitNotes = state.hitNotes;
  let feedback: HitFeedback | null = state.hitFeedback;

  // Score newly pressed keys
  const notes = state.notes.map(n => {
    if (n.hit !== 'none')               return n;
    if (!newlyPressed.has(n.keyIndex))  return n;
    const diff = Math.abs(n.time - newSongTime);
    if (diff > GOOD_WINDOW_MS)          return n;

    const isPerfect = diff <= PERFECT_WINDOW_MS;
    combo    += 1;
    hitNotes += 1;
    score    += (isPerfect ? 100 : 50) * Math.max(1, combo);
    feedback  = {
      text:      isPerfect ? 'PERFECT' : 'GOOD',
      color:     isPerfect ? '#fde047' : '#86efac',
      timestamp: now,
      keyIndex:  n.keyIndex,
    };
    return { ...n, hit: isPerfect ? 'perfect' as const : 'good' as const };
  });

  // Auto-miss notes that passed the window
  const finalNotes = notes.map(n => {
    if (n.hit !== 'none') return n;
    if (newSongTime - n.time > MISS_WINDOW_MS) {
      combo = 0;
      return { ...n, hit: 'miss' as const };
    }
    return n;
  });

  // Clear stale feedback
  if (feedback && now - feedback.timestamp > 650) feedback = null;

  const finished = state.mode !== 'freeplay' && newSongTime >= state.songDuration;

  return {
    ...state,
    songTime:    newSongTime,
    notes:       finalNotes,
    score,
    combo,
    maxCombo:    Math.max(state.maxCombo, combo),
    hitNotes,
    hitFeedback: feedback,
    phase:       finished ? 'finished' : 'playing',
  };
}

export function accuracy(state: GameState): number {
  if (state.totalNotes === 0) return 100;
  return Math.round((state.hitNotes / state.totalNotes) * 100);
}
