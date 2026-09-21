// ── Constants ─────────────────────────────────────────────────────────────────

export const COLS = 10;
export const ROWS = 22; // top 2 are hidden spawn buffer
export const VISIBLE_ROWS = 20;

// ── Piece types ───────────────────────────────────────────────────────────────

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Color per piece type (index 1–7 maps to board cell value)
export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#06b6d4', // cyan
  O: '#eab308', // yellow
  T: '#a855f7', // purple
  S: '#22c55e', // green
  Z: '#ef4444', // red
  J: '#3b82f6', // blue
  L: '#f97316', // orange
};

// Board cell value 0 = empty; 1–7 = locked piece (index into PIECE_TYPE_LIST)
export const PIECE_TYPE_LIST: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Cell value → color string
export function cellColor(cell: number): string {
  if (cell === 0) return '';
  return PIECE_COLORS[PIECE_TYPE_LIST[cell - 1]];
}

// ── Tetromino shapes (all rotations pre-computed) ─────────────────────────────

// Base shapes (rotation 0)
const BASE_SHAPES: Record<PieceType, number[][]> = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

function rotateCW(matrix: number[][]): number[][] {
  const n = matrix.length;
  const m = matrix[0].length;
  const result: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < m; c++) {
      result[c][n - 1 - r] = matrix[r][c];
    }
  }
  return result;
}

function buildRotations(base: number[][]): number[][][] {
  const rotations: number[][][] = [base];
  for (let i = 0; i < 3; i++) {
    rotations.push(rotateCW(rotations[rotations.length - 1]));
  }
  return rotations;
}

const ALL_ROTATIONS: Record<PieceType, number[][][]> = {
  I: buildRotations(BASE_SHAPES.I),
  O: buildRotations(BASE_SHAPES.O),
  T: buildRotations(BASE_SHAPES.T),
  S: buildRotations(BASE_SHAPES.S),
  Z: buildRotations(BASE_SHAPES.Z),
  J: buildRotations(BASE_SHAPES.J),
  L: buildRotations(BASE_SHAPES.L),
};

export interface Piece {
  type:     PieceType;
  rotation: number; // 0–3
}

export function pieceMatrix(piece: Piece): number[][] {
  return ALL_ROTATIONS[piece.type][piece.rotation % ALL_ROTATIONS[piece.type].length];
}

// ── Board ─────────────────────────────────────────────────────────────────────

export type Board = number[][];

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// ── Collision / placement ─────────────────────────────────────────────────────

export function isValid(board: Board, piece: Piece, pos: { x: number; y: number }): boolean {
  const matrix = pieceMatrix(piece);
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = pos.y + r;
      const nc = pos.x + c;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
      if (board[nr][nc] !== 0) return false;
    }
  }
  return true;
}

export function placePiece(board: Board, piece: Piece, pos: { x: number; y: number }): Board {
  const matrix = pieceMatrix(piece);
  const cellVal = PIECE_TYPE_LIST.indexOf(piece.type) + 1;
  const newBoard = board.map(row => [...row]);
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nr = pos.y + r;
      const nc = pos.x + c;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        newBoard[nr][nc] = cellVal;
      }
    }
  }
  return newBoard;
}

export function clearLines(board: Board): { newBoard: Board; linesCleared: number } {
  const remaining = board.filter(row => row.some(c => c === 0));
  const linesCleared = ROWS - remaining.length;
  const newRows = Array.from({ length: linesCleared }, () => Array(COLS).fill(0));
  return { newBoard: [...newRows, ...remaining], linesCleared };
}

export function ghostRow(board: Board, piece: Piece, pos: { x: number; y: number }): number {
  let gy = pos.y;
  while (isValid(board, piece, { x: pos.x, y: gy + 1 })) gy++;
  return gy;
}

// ── Bag randomizer ────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Bag = PieceType[];

export function newBag(): Bag {
  return shuffle([...PIECE_TYPE_LIST]);
}

export function drawFromBag(bag: Bag): { piece: PieceType; bag: Bag } {
  if (bag.length === 0) {
    const fresh = newBag();
    return { piece: fresh[0], bag: fresh.slice(1) };
  }
  return { piece: bag[0], bag: bag.slice(1) };
}

// ── Spawn ─────────────────────────────────────────────────────────────────────

export function spawnPos(piece: Piece): { x: number; y: number } {
  const matrix = pieceMatrix(piece);
  const w = matrix[0].length;
  return { x: Math.floor((COLS - w) / 2), y: 0 };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const LINE_SCORES = [0, 100, 300, 500, 800];

export function calcScore(linesCleared: number, level: number): number {
  return (LINE_SCORES[linesCleared] ?? 0) * level;
}

export function calcLevel(totalLines: number): number {
  return Math.floor(totalLines / 10) + 1;
}

// Fall interval in ms per row (classic NES-style curve)
export function fallInterval(level: number): number {
  const lv = Math.min(level, 20);
  // frames at 60fps: [48,43,38,33,28,23,18,13,8,6,5,5,5,4,4,4,3,3,3,2,1]
  const frames = [48,43,38,33,28,23,18,13,8,6,5,5,5,4,4,4,3,3,3,2,1];
  return Math.round((frames[lv - 1] ?? 1) * (1000 / 60));
}

// ── Difficulty ────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'normal' | 'hard';

export function startingLevel(difficulty: Difficulty): number {
  if (difficulty === 'easy')   return 1;
  if (difficulty === 'normal') return 3;
  return 6;
}

// ── Wall-kick offsets (simple) ────────────────────────────────────────────────

const KICK_OFFSETS = [0, -1, 1, -2, 2];

export function tryRotate(
  board: Board,
  piece: Piece,
  pos: { x: number; y: number },
): { piece: Piece; pos: { x: number; y: number } } | null {
  const rotations = ALL_ROTATIONS[piece.type].length;
  const newPiece: Piece = { ...piece, rotation: (piece.rotation + 1) % rotations };
  for (const dx of KICK_OFFSETS) {
    const newPos = { x: pos.x + dx, y: pos.y };
    if (isValid(board, newPiece, newPos)) return { piece: newPiece, pos: newPos };
    // also try shifting up one row for floor kicks
    const newPosUp = { x: pos.x + dx, y: pos.y - 1 };
    if (isValid(board, newPiece, newPosUp)) return { piece: newPiece, pos: newPosUp };
  }
  return null;
}

// ── Game state ────────────────────────────────────────────────────────────────

export type GamePhase = 'playing' | 'lineClear' | 'gameOver';

export interface GameState {
  board:          Board;
  current:        Piece;
  currentPos:     { x: number; y: number };
  held:           Piece | null;
  canHold:        boolean;
  next:           Piece[];         // 3 preview pieces
  bag:            Bag;
  score:          number;
  lines:          number;
  level:          number;
  phase:          GamePhase;
  fallAccum:      number;          // ms accumulated toward next fall
  lineClearAccum: number;          // ms of line-clear flash animation
  lastCleared:    number;          // lines cleared in last lock (for audio)
  difficulty:     Difficulty;
  // move cooldown: ms remaining until next lateral step allowed
  moveCooldown:   number;
}

function makePiece(type: PieceType): Piece {
  return { type, rotation: 0 };
}

function drawNext(bag: Bag, count: number): { pieces: Piece[]; bag: Bag } {
  let b = bag;
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const { piece, bag: nb } = drawFromBag(b);
    pieces.push(makePiece(piece));
    b = nb;
  }
  return { pieces, bag: b };
}

export function initialGameState(difficulty: Difficulty): GameState {
  const level = startingLevel(difficulty);

  let bag = newBag();
  const { piece: firstType, bag: b1 } = drawFromBag(bag);
  bag = b1;
  const current = makePiece(firstType);
  const { pieces: next, bag: finalBag } = drawNext(bag, 3);

  return {
    board:          emptyBoard(),
    current,
    currentPos:     spawnPos(current),
    held:           null,
    canHold:        true,
    next,
    bag:            finalBag,
    score:          0,
    lines:          0,
    level,
    phase:          'playing',
    fallAccum:      0,
    lineClearAccum: 0,
    lastCleared:    0,
    difficulty,
    moveCooldown:   0,
  };
}

// ── Step game ─────────────────────────────────────────────────────────────────

export interface GestureInput {
  tiltDir:   'left' | 'right' | 'none';
  isRaised:  boolean;   // edge-triggered rotate
  isLowered: boolean;   // held soft-drop
  handDetected: boolean;
}

const LINE_CLEAR_ANIM_MS = 200;
const SOFT_DROP_MULTIPLIER = 8;
const MOVE_COOLDOWN_MS = 170;
const LOCK_DELAY_MS = 500;     // give player time to adjust after landing

// Internal mutable-ish step state to avoid huge return objects
function spawnNext(state: GameState): GameState {
  const { pieces: [next0, ...rest], bag } = (() => {
    let b = state.bag;
    const out: Piece[] = [];
    for (let i = 0; i < 3 - state.next.length + 1; i++) {
      const { piece, bag: nb } = drawFromBag(b);
      out.push(makePiece(piece));
      b = nb;
    }
    return { pieces: [...state.next, ...out], bag: b };
  })();

  // Take first of next as new current, shift rest, refill to 3
  const newCurrent = next0;
  const remaining = rest;

  // Refill next to 3
  let bag2 = bag;
  const preview: Piece[] = [...remaining];
  while (preview.length < 3) {
    const { piece, bag: nb } = drawFromBag(bag2);
    preview.push(makePiece(piece));
    bag2 = nb;
  }

  const newPos = spawnPos(newCurrent);
  // Game over check: can't spawn
  if (!isValid(state.board, newCurrent, newPos)) {
    return { ...state, phase: 'gameOver' };
  }

  return {
    ...state,
    current:    newCurrent,
    currentPos: newPos,
    next:       preview,
    bag:        bag2,
    canHold:    true,
    fallAccum:  0,
  };
}

export function stepGame(
  state:    GameState,
  deltaMs:  number,
  gesture:  GestureInput,
): GameState {
  if (state.phase === 'gameOver') return state;

  // ── Line-clear animation phase ──────────────────────────────────────────────
  if (state.phase === 'lineClear') {
    const acc = state.lineClearAccum + deltaMs;
    if (acc >= LINE_CLEAR_ANIM_MS) {
      return spawnNext({ ...state, lineClearAccum: 0, phase: 'playing' });
    }
    return { ...state, lineClearAccum: acc };
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  let { board, current, currentPos, canHold, next, bag,
        score, lines, level, fallAccum, moveCooldown } = state;

  // Move cooldown tick
  moveCooldown = Math.max(0, moveCooldown - deltaMs);

  // Lateral movement from tilt (with cooldown)
  if (gesture.tiltDir !== 'none' && moveCooldown === 0) {
    const dx = gesture.tiltDir === 'left' ? -1 : 1;
    const newPos = { x: currentPos.x + dx, y: currentPos.y };
    if (isValid(board, current, newPos)) {
      currentPos = newPos;
    }
    moveCooldown = MOVE_COOLDOWN_MS;
  }

  // Rotate (edge-triggered)
  if (gesture.isRaised) {
    const result = tryRotate(board, current, currentPos);
    if (result) {
      current    = result.piece;
      currentPos = result.pos;
    }
  }

  // Fall accumulation (soft-drop speeds up)
  const interval = gesture.isLowered
    ? Math.max(16, Math.round(fallInterval(level) / SOFT_DROP_MULTIPLIER))
    : fallInterval(level);

  fallAccum += deltaMs;

  // Lock-delay: if piece is already resting, give LOCK_DELAY_MS before locking
  let lockAccum = (state as GameState & { lockAccum?: number }).lockAccum ?? 0;
  const isResting = !isValid(board, current, { x: currentPos.x, y: currentPos.y + 1 });

  while (fallAccum >= interval) {
    fallAccum -= interval;
    const newPos = { x: currentPos.x, y: currentPos.y + 1 };
    if (isValid(board, current, newPos)) {
      currentPos = newPos;
      lockAccum = 0;
    } else {
      // Can't fall further
      break;
    }
  }

  // Check if we need to lock
  const stillResting = !isValid(board, current, { x: currentPos.x, y: currentPos.y + 1 });
  if (stillResting) {
    if (isResting) {
      lockAccum += deltaMs;
    } else {
      lockAccum = 0;
    }
  } else {
    lockAccum = 0;
  }

  const shouldLock = stillResting && (lockAccum >= LOCK_DELAY_MS || gesture.isLowered);

  if (shouldLock) {
    const newBoard = placePiece(board, current, currentPos);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    const addScore = calcScore(linesCleared, level);
    const newLines = lines + linesCleared;
    const newLevel = Math.max(level, calcLevel(newLines));

    if (linesCleared > 0) {
      return {
        ...state,
        board:          clearedBoard,
        score:          score + addScore,
        lines:          newLines,
        level:          newLevel,
        phase:          'lineClear',
        lineClearAccum: 0,
        lastCleared:    linesCleared,
        fallAccum:      0,
        moveCooldown,
        current,
        currentPos,
        next,
        bag,
        canHold,
      } as GameState;
    }

    const spawned = spawnNext({
      ...state,
      board:       clearedBoard,
      score:       score + addScore,
      lines:       newLines,
      level:       newLevel,
      lastCleared: 0,
      fallAccum:   0,
      moveCooldown,
      current,
      currentPos,
      next,
      bag,
      canHold,
    } as GameState);
    return spawned;
  }

  return {
    ...state,
    current,
    currentPos,
    next,
    bag,
    canHold,
    score,
    lines,
    level,
    fallAccum,
    moveCooldown,
    lastCleared: 0,
    // store lockAccum in state (we cast to allow the extra field)
    ...(({ lockAccum } as unknown) as object),
  } as GameState;
}
