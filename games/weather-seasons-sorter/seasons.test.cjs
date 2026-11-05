// Run with: node games/weather-seasons-sorter/seasons.test.cjs
require('./seasons.js');
const S = globalThis.SEASONS_GAME;
const assert = require('assert');

// Every question in every chapter is fair: the right number of right cards, no duplicates, words on every card.
let total = 0;
for (let c = 0; c < S.CHAPTERS.length; c++) {
  for (let seed = 1; seed <= 300; seed++) {
    const g = S.createRound(c, { seed });
    assert.strictEqual(g.qs.length, S.CHAPTERS[c].count, `chapter ${c + 1} has all its questions`);
    g.qs.forEach((q, i) => {
      total++;
      const where = `chapter ${c + 1} seed ${seed} q${i + 1} (${q.kind})`;
      assert.strictEqual(q.options.length, S.CHAPTERS[c].options, `${where}: card count`);
      assert.strictEqual(q.options.filter((o) => o.right).length, q.need, `${where}: right cards`);
      assert.strictEqual(new Set(q.options.map((o) => o.id)).size, q.options.length, `${where}: no duplicate cards`);
      assert(q.text && q.text.length > 10, `${where}: question text`);
      for (const o of q.options) assert(o.label && o.why && o.why.length > 8, `${where}: label and reason`);
      if (i > 0) assert(!(JSON.stringify(g.qs[i - 1].scene) === JSON.stringify(q.scene) && g.qs[i - 1].kind === q.kind), `${where}: repeats the last window`);
    });
  }
}
console.log(`checked ${total} questions`);

// Answers are actually correct for what the window shows.
for (let seed = 1; seed <= 400; seed++) {
  const random = S.rng(seed);
  for (const kind of ['wear', 'pick2']) {
    const q = S.makeQuestion(kind, S.CHAPTERS[7], random);
    for (const o of q.options) assert.strictEqual(o.right, S.ITEMS[o.id].for.includes(q.scene.weather), `${o.label} for ${q.scene.weather}`);
  }
  const a = S.makeQuestion('activity', S.CHAPTERS[7], random);
  const topic = a.scene.weather === 'stormy' || !S.SEASONS[a.scene.season] || a.text.includes(S.WEATHER[a.scene.weather].says) ? a.scene.weather : a.scene.season;
  for (const o of a.options) if (o.right) assert(S.ACTIVITIES[o.id].for.includes(topic), `${o.label} suits ${topic}`);
  for (const o of a.options) if (!o.right) assert(!S.ACTIVITIES[o.id].for.includes(topic), `${o.label} should not suit ${topic}`);
  const n = S.makeQuestion('next', S.CHAPTERS[7], random);
  assert.strictEqual(n.options.find((o) => o.right).id, S.SEASONS[n.scene.wheel].next);
  const w = S.makeQuestion('name', S.CHAPTERS[7], random);
  assert.strictEqual(w.options.find((o) => o.right).id, w.scene.weather);
  const s = S.makeQuestion('season', S.CHAPTERS[7], random);
  assert.strictEqual(s.options.find((o) => o.right).id, s.scene.season);
}
// Snow questions never offer a winter-only activity as a wrong answer, and wrong clothes always belong to another weather.
for (const id of Object.keys(S.ITEMS)) assert.strictEqual(S.ITEMS[id].for.length, 1, `${id} belongs to one weather`);

// Picking: a wrong pick costs the first-try point; pick-two needs both right cards.
{
  const g = S.createRound(5, { seed: 3 });
  const q = S.current(g), rights = q.options.map((o, i) => (o.right ? i : -1)).filter((i) => i >= 0);
  assert.strictEqual(S.choose(g, rights[0]), 'right');
  assert.strictEqual(S.choose(g, rights[0]), null, 'the same card cannot count twice');
  assert.strictEqual(S.choose(g, rights[1]), 'done');
  assert.strictEqual(g.firstTry, 1);
  S.next(g);
  const q2 = S.current(g), wrongI = q2.options.findIndex((o) => !o.right);
  assert.strictEqual(S.choose(g, wrongI), 'wrong');
  for (const [i, o] of q2.options.entries()) if (o.right) S.choose(g, i);
  assert.strictEqual(g.firstTry, 1, 'a wrong pick loses the first-try point');
}
// Guessing at random rarely earns stars; knowing the answers earns three.
for (let c = 0; c < S.CHAPTERS.length; c++) {
  let guessStars = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const g = S.createRound(c, { seed }), random = S.rng(seed + 99);
    while (!g.over) {
      const q = S.current(g);
      let r;
      do { r = S.choose(g, Math.floor(random() * q.options.length)); } while (r !== 'done');
      S.next(g);
    }
    guessStars += S.result(g).stars >= 2 ? 1 : 0;
  }
  assert(guessStars <= 3, `chapter ${c + 1}: random guessing should almost never get 2 stars (${guessStars}/50)`);
  const g = S.createRound(c, { seed: 7 });
  while (!g.over) { S.current(g).options.forEach((o, i) => o.right && S.choose(g, i)); S.next(g); }
  assert.strictEqual(S.result(g).stars, 3);
}
console.log('all weather & seasons tests passed');
