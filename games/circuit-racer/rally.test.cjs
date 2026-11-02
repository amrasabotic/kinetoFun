// Run with: node games/circuit-racer/rally.test.cjs
require('./rally.js');
const R = globalThis.Rally;
const assert = require('assert');
const DT = 1 / 60;

function run(level, pickHand, maxT = 240) {
  const race = R.createRace(level);
  let offroadTime = 0;
  while (!race.done && race.t < maxT) {
    R.step(race, DT, pickHand(race));
    if (race.player.offroad) offroadTime += DT;
    race.events.length = 0;
  }
  return { race, r: R.result(race), offroadTime };
}

// Hand held still in the middle: the car must drive itself and stay on the road through every bend.
for (let i = 0; i < R.LEVELS.length; i++) {
  const { race, offroadTime } = run(i, () => ({ x: 0.5, fist: false }));
  assert(race.done, `level ${i}: centred hand never finished`);
  assert(offroadTime < 1, `level ${i}: centred hand left the road for ${offroadTime.toFixed(1)}s`);
}

// Hand to one side moves the car there quickly.
{
  const race = R.createRace(0);
  for (let k = 0; k < 30; k++) R.step(race, DT, { x: 0.8, fist: false });
  assert(race.player.x > 0.5, `car only reached x=${race.player.x.toFixed(2)} after 0.5s`);
}

// Fist with nitro is faster than no fist.
{
  const a = R.createRace(0), b = R.createRace(0);
  a.rivals = []; b.rivals = []; a.traffic = []; b.traffic = [];
  for (let k = 0; k < 400; k++) { R.step(a, DT, { x: 0.5, fist: true }); R.step(b, DT, { x: 0.5, fist: false }); }
  assert(a.player.z > b.player.z + 5, 'boost did not help');
}

// A player at human pace: sees ~0.3s late, jittery hand, dodges traffic, chases coins, boosts on straights.
function humanBot(seed) {
  let s = seed;
  const noise = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
  const history = [];
  return (race) => {
    const p = race.player;
    const ahead = race.traffic.concat(race.rivals).filter((c) => c.z - p.z > 0 && c.z - p.z < 25);
    const blocked = (lane) => ahead.some((c) => Math.abs(c.x - lane) < 0.45);
    const coin = race.pickups.find((k) => !k.taken && k.z - p.z > 2 && k.z - p.z < 30);
    let lane = coin && !blocked(coin.x) ? coin.x : R.LANES.find((l) => !blocked(l)) ?? 0;
    lane += R.curveAt(race, p.z) * 0.13;
    history.push((lane / 1.15) / 2 + 0.5 + noise() * 0.04);
    const seen = history.length > 18 ? history[history.length - 18] : 0.5;
    const straight = Math.abs(R.curveAt(race, p.z)) < 0.1;
    return { x: seen, fist: straight && p.nitro > 0.2 };
  };
}

const out = [];
for (let i = 0; i < R.LEVELS.length; i++) {
  const positions = [1, 2, 3].map((seed) => run(i, humanBot(seed + i * 10)).r);
  out.push(`${R.LEVELS[i].name}: positions ${positions.map((r) => r.position).join(',')} time ${positions[0].seconds}s coins ${positions[0].coins} bumps ${positions[0].bumps}`);
  assert(positions.some((r) => r.position <= 3), `level ${i}: a careful player can never reach the podium`);
  for (const r of positions) assert(r.seconds > 35 && r.seconds < 120, `level ${i}: race took ${r.seconds}s`);
}
const lazy = run(0, () => ({ x: 0.5, fist: false })).r;
out.push(`Palm Coast, hand still in the middle: position ${lazy.position}`);
assert(lazy.position > 1, 'winning without steering is too easy');
console.log(out.join('\n'));
console.log('all rally tests passed');
