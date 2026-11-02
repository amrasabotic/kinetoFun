// Run with: node games/gesture-ludo-king/ludo.test.cjs
require('./ludo.js');
const L = globalThis.Ludo;
const assert = require('assert');
const key = (c) => c.join(',');

// Board geometry: every colour walks 51 distinct loop squares, then turns into its own home column next to the last one.
for (const color of L.COLORS) {
  const cells = [];
  for (let s = 0; s <= L.HOME - 1; s++) cells.push(L.cellOf(color, s));
  assert.strictEqual(new Set(cells.map(key)).size, cells.length, `${color} visits a square twice`);
  for (let s = 1; s < cells.length; s++) {
    const [a, b] = [cells[s - 1], cells[s]];
    assert(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) <= 2, `${color} jumps between step ${s - 1} and ${s}`);
  }
}
assert.strictEqual(new Set(L.TRACK.map(key)).size, 52);
assert.strictEqual(L.SAFE.size, 8);

const seats = (types) => L.COLORS.map((color, i) => ({ color, type: types[i], name: color }));

// Rules: need a six to leave base; a six rolls again; three sixes lose the turn.
{
  const g = L.createGame(seats(['human', 'cpu', 'cpu', 'cpu']));
  L.roll(g, 3);
  assert.strictEqual(g.turn, 1, 'a 3 with everyone in base should pass the turn');
  g.turn = 0; g.phase = 'roll';
  L.roll(g, 6);
  assert.deepStrictEqual(L.legalMoves(g).map((m) => m.to), [0, 0, 0, 0]);
  assert.strictEqual(L.distinctMoves(g).length, 1);
  L.move(g, 0);
  assert.strictEqual(g.turn, 0); assert.strictEqual(g.phase, 'roll');
  L.roll(g, 6); L.move(g, 0);
  L.roll(g, 6);
  assert.strictEqual(g.turn, 1, 'third six should forfeit');
}

// Captures send the victim home and earn a roll; safe squares protect.
{
  const g = L.createGame(seats(['human', 'cpu', 'cpu', 'cpu']));
  g.tokens.red[0] = 3; g.tokens.blue[0] = 52 - 13 + 5; // blue on loop index 5
  assert.strictEqual(L.trackIndex('blue', g.tokens.blue[0]), 5);
  L.roll(g, 2); L.move(g, 0);
  assert.strictEqual(g.tokens.blue[0], -1, 'blue should be captured');
  assert.strictEqual(g.phase, 'roll'); assert.strictEqual(g.turn, 0);
  g.tokens.red[0] = 5; g.tokens.green[0] = 52 - 26 + 8; // green on the star at loop 8
  L.roll(g, 3); L.move(g, 0);
  assert.notStrictEqual(g.tokens.green[0], -1, 'star square should be safe');
}

// Exact roll to reach home; reaching home earns a roll.
{
  const g = L.createGame(seats(['human', 'cpu', 'cpu', 'cpu']));
  g.tokens.red = [54, -1, -1, -1];
  L.roll(g, 5);
  assert.strictEqual(L.legalMoves(g).length, 0);
  g.turn = 0; g.phase = 'roll';
  L.roll(g, 2); L.move(g, 0);
  assert.strictEqual(g.tokens.red[0], L.HOME); assert.strictEqual(g.turn, 0);
}

// Whole games between computers always end, and clever beats easy most of the time.
function play(types, levels, seed) {
  const g = L.createGame(seats(types), { seed });
  let guard = 0;
  while (g.phase !== 'over' && guard++ < 5000) {
    g.level = levels[g.turn];
    if (g.phase === 'roll') L.roll(g);
    else L.move(g, L.aiChoose(g));
    g.events.length = 0;
  }
  return g;
}
let cleverWins = 0, turns = 0;
const N = 300;
for (let s = 1; s <= N; s++) {
  const g = play(['cpu', 'cpu', 'cpu', 'cpu'], ['clever', 'easy', 'clever', 'easy'], s);
  assert(g.winner, `game ${s} never ended`);
  if (g.winner === 'red' || g.winner === 'green') cleverWins++;
  turns += g.turns;
}
console.log(`clever won ${cleverWins}/${N}; average ${Math.round(turns / N)} turns per game`);
assert(cleverWins / N > 0.6, 'clever computers should beat easy ones');

// Quick games with two pawns each are much shorter.
{
  let qt = 0;
  for (let s = 1; s <= 100; s++) {
    const g = L.createGame(seats(['cpu', 'cpu', 'cpu', 'cpu']), { seed: s, pawns: 2 });
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 5000) { if (g.phase === 'roll') L.roll(g); else L.move(g, L.aiChoose(g)); g.events.length = 0; }
    assert(g.winner); qt += g.turns;
  }
  console.log(`quick games: average ${Math.round(qt / 100)} turns`);
}
console.log('all ludo tests passed');
