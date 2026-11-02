// Ludo rules, board geometry and computer players. No drawing, so it runs headless in tests.
(function (root) {
  const COLORS = ['red', 'blue', 'green', 'yellow'];
  // The shared loop of 52 squares, clockwise from Red's start; [row, col] on a 15x15 grid.
  const TRACK = [
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14],
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7],
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
  ];
  const START = { red: 0, blue: 13, green: 26, yellow: 39 };
  const HOME_COLUMN = {
    red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    green: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  };
  const BASE = {
    red: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
    blue: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    green: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
    yellow: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
  };
  const HOME_CELL = { red: [7, 6.2], blue: [6.2, 7], green: [7, 7.8], yellow: [7.8, 7] };
  // Steps: -1 in base, 0..50 round the loop, 51..55 up the home column, 56 home.
  const LAST_TRACK = 50, HOME = 56;
  // Start squares and the star eight squares past each are safe from capture.
  const SAFE = new Set(COLORS.flatMap((c) => [START[c], (START[c] + 8) % 52]));

  const trackIndex = (color, step) => (START[color] + step) % 52;
  function cellOf(color, step, token) {
    if (step < 0) return BASE[color][token || 0];
    if (step <= LAST_TRACK) return TRACK[trackIndex(color, step)];
    if (step < HOME) return HOME_COLUMN[color][step - LAST_TRACK - 1];
    return HOME_CELL[color];
  }

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // seats: [{ color, type: 'human' | 'cpu', name }] in play order.
  function createGame(seats, opts = {}) {
    const tokens = {};
    const n = opts.pawns || 4;
    for (const s of seats) tokens[s.color] = Array(n).fill(-1);
    return {
      seats, tokens, turn: 0, dice: null, sixes: 0, phase: 'roll', winner: null, level: opts.level || 'clever',
      random: opts.seed != null ? rng(opts.seed) : Math.random, turns: 0,
      stats: Object.fromEntries(seats.map((s) => [s.color, { captures: 0, home: 0, sixes: 0 }])),
      events: [],
    };
  }

  const current = (g) => g.seats[g.turn];

  function targetOf(g, color, t) {
    const from = g.tokens[color][t];
    if (from >= HOME) return null;
    if (from < 0) return g.dice === 6 ? 0 : null;
    const to = from + g.dice;
    return to > HOME ? null : to;
  }

  function legalMoves(g) {
    if (g.phase !== 'move') return [];
    const color = current(g).color, out = [];
    for (let t = 0; t < g.tokens[color].length; t++) {
      const to = targetOf(g, color, t);
      if (to != null) out.push({ token: t, from: g.tokens[color][t], to });
    }
    return out;
  }

  function passTurn(g) {
    g.turn = (g.turn + 1) % g.seats.length;
    g.sixes = 0; g.dice = null; g.phase = 'roll'; g.turns++;
    g.events.push({ type: 'turn', color: current(g).color });
  }

  function roll(g, forced) {
    if (g.phase !== 'roll') return null;
    const v = forced || 1 + Math.floor(g.random() * 6);
    const color = current(g).color;
    g.dice = v;
    g.events.push({ type: 'roll', color, value: v });
    if (v === 6) { g.sixes++; g.stats[color].sixes++; }
    if (g.sixes === 3) {
      g.events.push({ type: 'three-sixes', color });
      passTurn(g);
      return v;
    }
    g.phase = 'move';
    if (legalMoves(g).length === 0) {
      g.events.push({ type: 'no-moves', color });
      if (v === 6) { g.phase = 'roll'; g.dice = null; } else passTurn(g);
    }
    return v;
  }

  // Opponent tokens on a loop square; none can be hit on a safe square.
  function victimsAt(g, color, step) {
    if (step < 0 || step > LAST_TRACK) return [];
    const idx = trackIndex(color, step);
    if (SAFE.has(idx)) return [];
    const out = [];
    for (const s of g.seats) {
      if (s.color === color) continue;
      g.tokens[s.color].forEach((st, t) => { if (st >= 0 && st <= LAST_TRACK && trackIndex(s.color, st) === idx) out.push({ color: s.color, token: t }); });
    }
    return out;
  }

  function move(g, token) {
    const m = legalMoves(g).find((x) => x.token === token);
    if (!m) return null;
    const color = current(g).color;
    const path = [];
    if (m.from < 0) path.push(0);
    else for (let s = m.from + 1; s <= m.to; s++) path.push(s);
    g.tokens[color][token] = m.to;
    const captured = victimsAt(g, color, m.to);
    for (const v of captured) { g.tokens[v.color][v.token] = -1; g.stats[color].captures++; }
    const reachedHome = m.to === HOME;
    if (reachedHome) g.stats[color].home++;
    g.events.push({ type: 'move', color, token, from: m.from, to: m.to, path, captured, home: reachedHome });
    if (g.tokens[color].every((s) => s === HOME)) {
      g.winner = color; g.phase = 'over';
      g.events.push({ type: 'win', color });
      return m;
    }
    // A six, a capture or a token home earns another roll.
    if (g.dice === 6 || captured.length || reachedHome) { g.phase = 'roll'; g.dice = null; g.events.push({ type: 'again', color }); }
    else passTurn(g);
    return m;
  }

  // How many opponent tokens could land on this loop square next turn.
  function danger(g, color, step) {
    if (step < 0 || step > LAST_TRACK) return 0;
    const idx = trackIndex(color, step);
    if (SAFE.has(idx)) return 0;
    let n = 0;
    for (const s of g.seats) {
      if (s.color === color) continue;
      for (const st of g.tokens[s.color]) {
        if (st < 0) { if (trackIndex(s.color, 0) === idx) n += 0.3; continue; }
        if (st > LAST_TRACK) continue;
        const gap = (idx - trackIndex(s.color, st) + 52) % 52;
        if (gap >= 1 && gap <= 6 && st + gap <= LAST_TRACK) n++;
      }
    }
    return n;
  }

  function scoreMove(g, m) {
    const color = current(g).color;
    let v = m.to - Math.max(0, m.from) * 0.1;
    if (m.to === HOME) v += 60;
    if (m.from < 0) v += 35;
    if (m.to > LAST_TRACK && m.from <= LAST_TRACK) v += 25;
    v += victimsAt(g, color, m.to).reduce((s, x) => s + 50 + g.tokens[x.color][x.token], 0);
    if (m.to <= LAST_TRACK && SAFE.has(trackIndex(color, m.to))) v += 12;
    v -= danger(g, color, m.to) * (18 + m.to * 0.4);
    if (m.from >= 0) v += danger(g, color, m.from) * (12 + m.from * 0.3);
    return v;
  }

  function aiChoose(g) {
    const moves = legalMoves(g);
    if (!moves.length) return null;
    // Easy computers make the best move only some of the time.
    if (g.level === 'easy' && g.random() < 0.55) return moves[Math.floor(g.random() * moves.length)].token;
    let best = moves[0], bestV = -Infinity;
    for (const m of moves) { const v = scoreMove(g, m); if (v > bestV) { bestV = v; best = m; } }
    return best.token;
  }

  // Moves that look the same to a player (all from base, or all on one square) count as one choice.
  function distinctMoves(g) {
    const seen = new Set();
    return legalMoves(g).filter((m) => { const k = m.from + ':' + m.to; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  function progress(g, color) { return g.tokens[color].reduce((s, st) => s + Math.max(0, st + 1), 0); }

  root.Ludo = { COLORS, TRACK, START, HOME_COLUMN, BASE, HOME_CELL, SAFE, LAST_TRACK, HOME, cellOf, trackIndex,
    createGame, current, legalMoves, distinctMoves, roll, move, aiChoose, danger, progress, victimsAt };
})(typeof window !== 'undefined' ? window : globalThis);
