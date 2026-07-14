import type { HandData } from './useHandTracking';

export const CANVAS_W = 800;
export const CANVAS_H = 560;

const GAP = 16;
const PW = (CANVAS_W - GAP * 3) / 2;   // panel width  ~384
const PH = (CANVAS_H - GAP * 3) / 2;   // panel height ~264

export interface Panel {
  id: number;
  label: string;
  color: string;           // bright lit color
  dimColor: string;        // unlit color
  x: number; y: number; w: number; h: number;
}

export const PANELS: Panel[] = [
  { id: 0, label: 'Red',    color: '#ef4444', dimColor: '#450a0a', x: GAP,           y: GAP,           w: PW, h: PH },
  { id: 1, label: 'Blue',   color: '#3b82f6', dimColor: '#172554', x: GAP * 2 + PW,  y: GAP,           w: PW, h: PH },
  { id: 2, label: 'Yellow', color: '#eab308', dimColor: '#422006', x: GAP,           y: GAP * 2 + PH,  w: PW, h: PH },
  { id: 3, label: 'Green',  color: '#22c55e', dimColor: '#052e16', x: GAP * 2 + PW,  y: GAP * 2 + PH,  w: PW, h: PH },
];

export type Phase =
  | 'demo'        // CPU showing the sequence
  | 'input'       // player's turn
  | 'success'     // brief celebration before next round
  | 'fail'        // brief wrong-answer flash
  | 'gameover';   // final screen

export interface GameState {
  phase: Phase;
  round: number;          // 1-based; sequence length = round + 1
  sequence: number[];     // full sequence so far
  demoStep: number;       // which step of sequence is currently being shown
  demoLit: boolean;       // is the current demo panel lit?
  demoTimer: number;      // ms until next demo transition
  demoAudioStep: number;  // last step index that has had audio fired (-1 = none)
  inputStep: number;      // next expected input index
  litPanel: number | null;// panel currently lit (demo or player slap)
  slapFlash: number | null; // panel flashing from a player slap (timer reset each slap)
  slapFlashTimer: number;
  score: number;
  highScore: number;
  phaseTimer: number;     // ms until phase transition (success/fail)
  cooldowns: number[];    // per-panel cooldown ms remaining
}

// How long each step is shown during demo (gets faster as rounds increase)
function demoPanelOnMs(round: number)  { return Math.max(600 - round * 18, 250); }
function demoPanelOffMs(round: number) { return Math.max(220 - round * 4,  100); }

function randomPanel(): number { return Math.floor(Math.random() * 4); }

function addSequenceStep(seq: number[]): number[] {
  return [...seq, randomPanel()];
}

export function initialGameState(): GameState {
  const sequence = addSequenceStep(addSequenceStep([])); // start with length 2
  return {
    phase: 'demo',
    round: 1,
    sequence,
    demoStep: 0,
    demoLit: true,
    demoTimer: demoPanelOnMs(1),
    demoAudioStep: -1,
    inputStep: 0,
    litPanel: sequence[0],
    slapFlash: null,
    slapFlashTimer: 0,
    score: 0,
    highScore: 0,
    phaseTimer: 0,
    cooldowns: [0, 0, 0, 0],
  };
}

const HIT_VY = 0.012;   // downward velocity threshold for a slap
const SLAP_COOLDOWN = 500; // ms between hits on same panel
const SLAP_FLASH_MS = 280;
const SUCCESS_HOLD_MS = 900;
const FAIL_HOLD_MS = 1100;

function panelContains(p: Panel, nx: number, ny: number): boolean {
  const px = nx * CANVAS_W;
  const py = ny * CANVAS_H;
  return px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h;
}

export interface UpdateResult {
  state: GameState;
  events: GameEvent[];
}

export type GameEvent =
  | { type: 'panel'; index: number }
  | { type: 'correct' }
  | { type: 'win' }
  | { type: 'fail' }
  | { type: 'slap' };

export function updateGame(gs: GameState, hand: HandData, delta: number): UpdateResult {
  const events: GameEvent[] = [];
  let s = { ...gs };

  // Tick cooldowns
  s.cooldowns = s.cooldowns.map(c => Math.max(0, c - delta));

  // Tick slap flash
  if (s.slapFlash !== null) {
    s.slapFlashTimer -= delta;
    if (s.slapFlashTimer <= 0) s.slapFlash = null;
  }

  if (s.phase === 'demo') {
    // Fire audio exactly once per lit step (on first frame it's lit)
    if (s.demoLit && s.demoAudioStep !== s.demoStep) {
      s.demoAudioStep = s.demoStep;
      events.push({ type: 'panel', index: s.sequence[s.demoStep] });
    }
    s.demoTimer -= delta;
    if (s.demoTimer <= 0) {
      if (s.demoLit) {
        s.demoLit = false;
        s.litPanel = null;
        s.demoTimer = demoPanelOffMs(s.round);
      } else {
        s.demoStep++;
        if (s.demoStep >= s.sequence.length) {
          s.phase = 'input';
          s.inputStep = 0;
          s.litPanel = null;
        } else {
          s.demoLit = true;
          s.litPanel = s.sequence[s.demoStep];
          s.demoTimer = demoPanelOnMs(s.round);
        }
      }
    }
  } else if (s.phase === 'input') {
    if (hand.detected && hand.vy > HIT_VY) {
      for (const panel of PANELS) {
        if (s.cooldowns[panel.id] > 0) continue;
        if (!panelContains(panel, hand.x, hand.y)) continue;

        events.push({ type: 'slap' });
        s.cooldowns[panel.id] = SLAP_COOLDOWN;
        s.slapFlash = panel.id;
        s.slapFlashTimer = SLAP_FLASH_MS;
        s.litPanel = panel.id;

        if (panel.id === s.sequence[s.inputStep]) {
          // Correct hit
          events.push({ type: 'panel', index: panel.id });
          s.score += 50 * s.round;
          s.inputStep++;
          if (s.inputStep >= s.sequence.length) {
            // Completed sequence
            events.push({ type: 'win' });
            s.score += 100 * s.round; // completion bonus
            s.phase = 'success';
            s.phaseTimer = SUCCESS_HOLD_MS;
            s.litPanel = null;
          } else {
            events.push({ type: 'correct' });
          }
        } else {
          // Wrong hit
          events.push({ type: 'fail' });
          s.phase = 'fail';
          s.phaseTimer = FAIL_HOLD_MS;
          s.litPanel = null;
        }
        break; // only one panel per slap
      }
    }
  } else if (s.phase === 'success') {
    s.phaseTimer -= delta;
    if (s.phaseTimer <= 0) {
      s.round++;
      s.sequence = addSequenceStep(s.sequence);
      s.demoStep = 0;
      s.demoLit = true;
      s.demoAudioStep = -1;
      s.litPanel = s.sequence[0];
      s.demoTimer = demoPanelOnMs(s.round);
      s.inputStep = 0;
      s.phase = 'demo';
    }
  } else if (s.phase === 'fail') {
    s.phaseTimer -= delta;
    if (s.phaseTimer <= 0) {
      s.highScore = Math.max(s.highScore, s.score);
      s.phase = 'gameover';
    }
  }

  return { state: s, events };
}

export function restartGame(highScore: number): GameState {
  const sequence = addSequenceStep(addSequenceStep([]));
  return {
    phase: 'demo',
    round: 1,
    sequence,
    demoStep: 0,
    demoLit: true,
    demoTimer: demoPanelOnMs(1),
    demoAudioStep: -1,
    inputStep: 0,
    litPanel: sequence[0],
    slapFlash: null,
    slapFlashTimer: 0,
    score: 0,
    highScore,
    phaseTimer: 0,
    cooldowns: [0, 0, 0, 0],
  };
}
