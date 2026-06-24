export type DrumSound =
  | 'hihat' | 'crash' | 'snare' | 'rimshot'
  | 'kick' | 'tom' | 'floortom' | 'cowbell';

export type GameMode = 'freeplay' | 'easy' | 'medium' | 'hard';

export interface DrumPad {
  id: number;
  label: string;
  sound: DrumSound;
  // normalized positions (0–1) on the canvas
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  // visual
  color: string;
  glow: string;
  hand: 'left' | 'right';
  // runtime state
  hitTime: number;       // timestamp of last hit (ms), 0 = never
  cooldownMs: number;
}

export interface BeatNote {
  time: number;       // ms from song start when the note should be hit
  padId: number;
  // runtime state
  hit: 'none' | 'perfect' | 'good' | 'miss';
  active: boolean;    // currently falling on screen
}

export interface GameState {
  mode: GameMode;
  pads: DrumPad[];
  score: number;
  combo: number;
  maxCombo: number;
  totalNotes: number;
  hitNotes: number;
  songTime: number;       // ms elapsed since song start
  songDuration: number;   // ms total song length
  notes: BeatNote[];      // rhythm mode only
  phase: 'playing' | 'finished';
  hitFeedback: { text: string; color: string; timestamp: number } | null;
}

// ─── Canvas dimensions ────────────────────────────────────────────────────────
export const CANVAS_W = 800;
export const CANVAS_H = 600;

// ─── Hit detection ────────────────────────────────────────────────────────────
export const HIT_VELOCITY_THRESHOLD = 6;   // canvas px/frame downward
export const PAD_COOLDOWN_MS = 130;

// ─── Rhythm timing windows ────────────────────────────────────────────────────
const PERFECT_WINDOW_MS = 45;
const GOOD_WINDOW_MS = 90;
const MISS_WINDOW_MS = 150; // after this, note is auto-missed

// ─── Pad definitions ─────────────────────────────────────────────────────────
// Canvas is 800×600. Pads live in bottom 58% (y 0.38–0.96).
// Left half (x 0.02–0.49): left-hand pads
// Right half (x 0.51–0.98): right-hand pads
// Each half has 4 pads in a 2×2 grid.

const PAD_DEFS: Omit<DrumPad, 'hitTime'>[] = [
  // ── Left hand ──
  { id: 0, label: 'Hi-Hat',    sound: 'hihat',   xMin: 0.02, xMax: 0.25, yMin: 0.38, yMax: 0.65, color: '#06b6d4', glow: '#67e8f9', hand: 'left',  cooldownMs: PAD_COOLDOWN_MS },
  { id: 1, label: 'Crash',     sound: 'crash',   xMin: 0.26, xMax: 0.49, yMin: 0.38, yMax: 0.65, color: '#eab308', glow: '#fde047', hand: 'left',  cooldownMs: PAD_COOLDOWN_MS },
  { id: 2, label: 'Snare',     sound: 'snare',   xMin: 0.02, xMax: 0.25, yMin: 0.68, yMax: 0.96, color: '#ef4444', glow: '#fca5a5', hand: 'left',  cooldownMs: PAD_COOLDOWN_MS },
  { id: 3, label: 'Rim Shot',  sound: 'rimshot', xMin: 0.26, xMax: 0.49, yMin: 0.68, yMax: 0.96, color: '#f97316', glow: '#fdba74', hand: 'left',  cooldownMs: PAD_COOLDOWN_MS },
  // ── Right hand ──
  { id: 4, label: 'Kick',      sound: 'kick',    xMin: 0.51, xMax: 0.74, yMin: 0.38, yMax: 0.65, color: '#a855f7', glow: '#d8b4fe', hand: 'right', cooldownMs: PAD_COOLDOWN_MS },
  { id: 5, label: 'Tom',       sound: 'tom',     xMin: 0.75, xMax: 0.98, yMin: 0.38, yMax: 0.65, color: '#3b82f6', glow: '#93c5fd', hand: 'right', cooldownMs: PAD_COOLDOWN_MS },
  { id: 6, label: 'Floor Tom', sound: 'floortom',xMin: 0.51, xMax: 0.74, yMin: 0.68, yMax: 0.96, color: '#22c55e', glow: '#86efac', hand: 'right', cooldownMs: PAD_COOLDOWN_MS },
  { id: 7, label: 'Cowbell',   sound: 'cowbell', xMin: 0.75, xMax: 0.98, yMin: 0.68, yMax: 0.96, color: '#ec4899', glow: '#f9a8d4', hand: 'right', cooldownMs: PAD_COOLDOWN_MS },
];

export function makePads(): DrumPad[] {
  return PAD_DEFS.map(p => ({ ...p, hitTime: 0 }));
}

// ─── Beat patterns ────────────────────────────────────────────────────────────

function repeat(pattern: { time: number; padId: number }[], bars: number, barMs: number): BeatNote[] {
  const notes: BeatNote[] = [];
  for (let b = 0; b < bars; b++) {
    for (const n of pattern) {
      notes.push({
        time: b * barMs + n.time,
        padId: n.padId,
        hit: 'none',
        active: false,
      });
    }
  }
  return notes.sort((a, b) => a.time - b.time);
}

// Easy: 80 BPM, 4/4, 8 bars. Beat = 750ms. Bar = 3000ms.
// Kick on 1 & 3, Snare on 2 & 4, Hi-Hat on every beat.
const EASY_BEAT_MS = 750;
const EASY_BAR_MS = EASY_BEAT_MS * 4;
const EASY_PATTERN = [
  { time: 0,                   padId: 4 }, // kick beat 1
  { time: EASY_BEAT_MS * 0,   padId: 0 }, // hi-hat beat 1
  { time: EASY_BEAT_MS * 1,   padId: 2 }, // snare beat 2
  { time: EASY_BEAT_MS * 1,   padId: 0 }, // hi-hat beat 2
  { time: EASY_BEAT_MS * 2,   padId: 4 }, // kick beat 3
  { time: EASY_BEAT_MS * 2,   padId: 0 }, // hi-hat beat 3
  { time: EASY_BEAT_MS * 3,   padId: 2 }, // snare beat 4
  { time: EASY_BEAT_MS * 3,   padId: 0 }, // hi-hat beat 4
];

// Medium: 110 BPM. Beat = 545ms. Bar = 2182ms. 10 bars.
// Adds toms and 8th-note hi-hats.
const MED_BEAT_MS = Math.round(60000 / 110);
const MED_8TH = MED_BEAT_MS / 2;
const MED_BAR_MS = MED_BEAT_MS * 4;
const MED_PATTERN = [
  { time: 0,                  padId: 4 }, // kick 1
  { time: 0,                  padId: 0 }, // hihat
  { time: MED_8TH,            padId: 0 }, // hihat 8th
  { time: MED_BEAT_MS,        padId: 2 }, // snare 2
  { time: MED_BEAT_MS,        padId: 0 }, // hihat
  { time: MED_BEAT_MS + MED_8TH, padId: 0 }, // hihat 8th
  { time: MED_BEAT_MS * 2,    padId: 4 }, // kick 3
  { time: MED_BEAT_MS * 2,    padId: 0 }, // hihat
  { time: MED_BEAT_MS * 2 + MED_8TH, padId: 5 }, // tom
  { time: MED_BEAT_MS * 3,    padId: 2 }, // snare 4
  { time: MED_BEAT_MS * 3,    padId: 0 }, // hihat
  { time: MED_BEAT_MS * 3 + MED_8TH, padId: 6 }, // floor tom
];

// Hard: 140 BPM. Beat = 429ms. Bar = 1714ms. 12 bars.
// Syncopated kicks, crashes, cowbell, 16th hi-hats.
const HARD_BEAT_MS = Math.round(60000 / 140);
const HARD_16TH = HARD_BEAT_MS / 4;
const HARD_BAR_MS = HARD_BEAT_MS * 4;
const HARD_PATTERN = [
  { time: 0,                           padId: 4 }, // kick 1
  { time: 0,                           padId: 1 }, // crash on 1
  { time: HARD_16TH,                   padId: 0 }, // hihat 16th
  { time: HARD_16TH * 2,              padId: 0 }, // hihat 16th
  { time: HARD_16TH * 3,              padId: 4 }, // kick syncopation
  { time: HARD_BEAT_MS,               padId: 2 }, // snare 2
  { time: HARD_BEAT_MS + HARD_16TH,  padId: 0 }, // hihat
  { time: HARD_BEAT_MS + HARD_16TH * 2, padId: 5 }, // tom
  { time: HARD_BEAT_MS * 2,           padId: 4 }, // kick 3
  { time: HARD_BEAT_MS * 2,           padId: 0 }, // hihat
  { time: HARD_BEAT_MS * 2 + HARD_16TH * 2, padId: 7 }, // cowbell
  { time: HARD_BEAT_MS * 2 + HARD_16TH * 3, padId: 4 }, // kick
  { time: HARD_BEAT_MS * 3,           padId: 2 }, // snare 4
  { time: HARD_BEAT_MS * 3,           padId: 0 }, // hihat
  { time: HARD_BEAT_MS * 3 + HARD_16TH * 2, padId: 6 }, // floor tom
  { time: HARD_BEAT_MS * 3 + HARD_16TH * 3, padId: 3 }, // rimshot
];

export function makeNotes(mode: GameMode): BeatNote[] {
  if (mode === 'freeplay') return [];
  if (mode === 'easy')   return repeat(EASY_PATTERN, 8, EASY_BAR_MS);
  if (mode === 'medium') return repeat(MED_PATTERN, 10, MED_BAR_MS);
  return repeat(HARD_PATTERN, 12, HARD_BAR_MS);
}

export function songDuration(mode: GameMode): number {
  if (mode === 'freeplay') return 0;
  if (mode === 'easy')   return EASY_BAR_MS * 8 + 2000;
  if (mode === 'medium') return MED_BAR_MS * 10 + 2000;
  return HARD_BAR_MS * 12 + 2000;
}

// ─── Initial state ────────────────────────────────────────────────────────────

export function initialGameState(mode: GameMode): GameState {
  return {
    mode,
    pads: makePads(),
    score: 0,
    combo: 0,
    maxCombo: 0,
    totalNotes: makeNotes(mode).length,
    hitNotes: 0,
    songTime: 0,
    songDuration: songDuration(mode),
    notes: makeNotes(mode),
    phase: 'playing',
    hitFeedback: null,
  };
}

// ─── Hit detection ────────────────────────────────────────────────────────────

export function checkPadHit(
  pad: DrumPad,
  handX: number,
  handY: number,
  vy: number,
  now: number
): boolean {
  if (now - pad.hitTime < pad.cooldownMs) return false;
  if (vy < HIT_VELOCITY_THRESHOLD) return false;
  if (handX < pad.xMin || handX > pad.xMax) return false;
  if (handY < pad.yMin || handY > pad.yMax) return false;
  return true;
}

// ─── Rhythm scoring ───────────────────────────────────────────────────────────

export function scoreHit(
  state: GameState,
  padId: number,
  now: number
): GameState {
  if (state.mode === 'freeplay') {
    return {
      ...state,
      pads: state.pads.map(p => p.id === padId ? { ...p, hitTime: now } : p),
    };
  }

  // Find the closest unresolved note for this pad within GOOD window
  let bestIdx = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < state.notes.length; i++) {
    const n = state.notes[i];
    if (n.padId !== padId || n.hit !== 'none') continue;
    const diff = Math.abs(n.time - state.songTime);
    if (diff <= GOOD_WINDOW_MS && diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }

  let scoreAdd = 0;
  let combo = state.combo;
  let hitNotes = state.hitNotes;
  let feedbackText = '';
  let feedbackColor = '#ffffff';

  if (bestIdx >= 0) {
    const isPerfect = bestDiff <= PERFECT_WINDOW_MS;
    combo += 1;
    hitNotes += 1;
    if (isPerfect) {
      scoreAdd = 100 * Math.max(1, combo);
      feedbackText = 'PERFECT';
      feedbackColor = '#fde047';
    } else {
      scoreAdd = 50 * Math.max(1, combo);
      feedbackText = 'GOOD';
      feedbackColor = '#86efac';
    }
  } else {
    combo = 0;
    feedbackText = 'EARLY';
    feedbackColor = '#fca5a5';
  }

  const newNotes = state.notes.map((n, i) =>
    i === bestIdx ? { ...n, hit: (bestDiff <= PERFECT_WINDOW_MS ? 'perfect' : 'good') as BeatNote['hit'] } : n
  );

  return {
    ...state,
    pads: state.pads.map(p => p.id === padId ? { ...p, hitTime: now } : p),
    score: state.score + scoreAdd,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    hitNotes,
    notes: newNotes,
    hitFeedback: feedbackText ? { text: feedbackText, color: feedbackColor, timestamp: now } : state.hitFeedback,
  };
}

// ─── Frame step ───────────────────────────────────────────────────────────────

export function stepGame(state: GameState, deltaMs: number, now: number): GameState {
  if (state.phase === 'finished') return state;

  const newSongTime = state.songTime + deltaMs;

  // Auto-miss notes that have passed the window
  let combo = state.combo;
  const newNotes = state.notes.map(n => {
    if (n.hit !== 'none') return n;
    if (newSongTime - n.time > MISS_WINDOW_MS) {
      combo = 0;
      return { ...n, hit: 'miss' as BeatNote['hit'] };
    }
    return n;
  });

  // End of song
  const finished = state.mode !== 'freeplay' && newSongTime >= state.songDuration;

  // Clear old feedback after 600ms
  const hitFeedback = state.hitFeedback && now - state.hitFeedback.timestamp < 600
    ? state.hitFeedback
    : null;

  return {
    ...state,
    songTime: newSongTime,
    notes: newNotes,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    hitFeedback,
    phase: finished ? 'finished' : 'playing',
  };
}

// ─── Accuracy helper ─────────────────────────────────────────────────────────

export function accuracy(state: GameState): number {
  if (state.totalNotes === 0) return 100;
  return Math.round((state.hitNotes / state.totalNotes) * 100);
}
