// Weather & Seasons rules: what each picture means, which answers are right, chapters and scoring. No drawing, so it runs headless in tests.
(function (root) {
  // Every weather and season the window can show, with the words used in questions.
  const WEATHER = {
    sunny: { name: 'Sunny', says: 'The sun is shining and it is hot' },
    rainy: { name: 'Rainy', says: 'It is raining' },
    snowy: { name: 'Snowy', says: 'It is snowing and very cold' },
    windy: { name: 'Windy', says: 'The wind is blowing hard' },
    foggy: { name: 'Foggy', says: 'It is foggy and hard to see' },
    stormy: { name: 'Stormy', says: 'There is thunder and lightning' },
  };
  const SEASONS = {
    spring: { name: 'Spring', clue: 'Blossom on the trees, flowers and baby animals', next: 'summer' },
    summer: { name: 'Summer', clue: 'Long sunny days, green trees and trips to the beach', next: 'autumn' },
    autumn: { name: 'Autumn', clue: 'Leaves turn orange and fall from the trees', next: 'winter' },
    winter: { name: 'Winter', clue: 'Bare trees, snow and frosty mornings', next: 'spring' },
  };
  // Things to wear or carry; `for` lists the only weather each one is right for, and `why` is said after a pick.
  const ITEMS = {
    sunhat: { name: 'Sun hat', for: ['sunny'], why: 'A sun hat shades your head from the hot sun.' },
    sunglasses: { name: 'Sunglasses', for: ['sunny'], why: 'Sunglasses protect your eyes from bright sunshine.' },
    suncream: { name: 'Sun cream', for: ['sunny'], why: 'Sun cream stops the sun burning your skin.' },
    shorts: { name: 'Shorts and T-shirt', for: ['sunny'], why: 'Light clothes keep you cool on a hot day.' },
    sandals: { name: 'Sandals', for: ['sunny'], why: 'Sandals keep your feet cool when it is hot.' },
    raincoat: { name: 'Raincoat', for: ['rainy'], why: 'A raincoat keeps your body dry in the rain.' },
    wellies: { name: 'Wellies', for: ['rainy'], why: 'Wellies keep your feet dry in puddles.' },
    umbrella: { name: 'Umbrella', for: ['rainy'], why: 'An umbrella keeps the rain off your head.' },
    woollyhat: { name: 'Woolly hat', for: ['snowy'], why: 'A woolly hat keeps your head warm in the cold.' },
    mittens: { name: 'Mittens', for: ['snowy'], why: 'Mittens keep your hands warm in the snow.' },
    scarf: { name: 'Scarf', for: ['snowy'], why: 'A scarf keeps your neck warm when it is freezing.' },
    snowboots: { name: 'Snow boots', for: ['snowy'], why: 'Snow boots keep your feet warm and dry in snow.' },
    puffercoat: { name: 'Warm coat', for: ['snowy'], why: 'A thick, warm coat keeps the cold out.' },
  };
  // Things to do; `for` lists the weather or season they suit.
  const ACTIVITIES = {
    kite: { name: 'Fly a kite', for: ['windy'], why: 'A kite needs wind to fly high.' },
    snowman: { name: 'Build a snowman', for: ['snowy', 'winter'], why: 'You need snow to build a snowman.' },
    puddles: { name: 'Jump in puddles', for: ['rainy'], why: 'Rain makes puddles to splash in.' },
    beach: { name: 'Play at the beach', for: ['sunny', 'summer'], why: 'Sunny summer days are perfect for the beach.' },
    leaves: { name: 'Jump in the leaves', for: ['autumn'], why: 'In autumn the leaves fall into big piles.' },
    flowers: { name: 'Pick flowers', for: ['spring'], why: 'Flowers start to grow and bloom in spring.' },
    inside: { name: 'Stay inside', for: ['stormy'], why: 'Inside is the safest place in a thunderstorm.' },
    sledge: { name: 'Ride a sledge', for: ['snowy', 'winter'], why: 'A sledge slides down snowy hills.' },
  };

  // kinds: question types in a chapter; options: answer cards shown.
  const CHAPTERS = [
    { name: 'Weather words', kinds: ['name'], weathers: ['sunny', 'rainy', 'snowy', 'windy'], options: 3, count: 6 },
    { name: 'Dress for the weather', kinds: ['wear'], options: 3, count: 6 },
    { name: 'More weather', kinds: ['name'], weathers: ['sunny', 'rainy', 'snowy', 'windy', 'foggy', 'stormy'], options: 4, count: 7 },
    { name: 'The four seasons', kinds: ['season'], options: 4, count: 6 },
    { name: 'Fun outside', kinds: ['activity'], options: 3, count: 7 },
    { name: 'Pick two', kinds: ['pick2'], options: 4, count: 6 },
    { name: 'Season circle', kinds: ['next', 'season'], options: 4, count: 7 },
    { name: 'Weather wizard', kinds: ['name', 'wear', 'season', 'activity', 'pick2', 'next'], weathers: ['sunny', 'rainy', 'snowy', 'windy', 'foggy', 'stormy'], options: 4, count: 10 },
  ];
  const WEAR_WEATHER = ['sunny', 'rainy', 'snowy'];

  function rng(seed) {
    let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function shuffle(a, random) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  }
  const pick = (a, random) => a[Math.floor(random() * a.length)];

  // A question: the scene in the window, the sentence, the answer cards and how many must be picked.
  function makeQuestion(kind, ch, random) {
    const n = ch.options;
    if (kind === 'name') {
      const w = pick(ch.weathers, random);
      const wrong = shuffle(ch.weathers.filter((x) => x !== w), random).slice(0, n - 1);
      return {
        kind, scene: { weather: w, season: w === 'snowy' ? 'winter' : w === 'sunny' ? 'summer' : 'autumn' },
        text: 'Look out of the window. What is the weather like?',
        options: shuffle([w, ...wrong], random).map((id) => ({ type: 'weather', id, label: WEATHER[id].name, right: id === w, why: id === w ? `Yes! ${WEATHER[id].says}.` : `Not ${WEATHER[id].name.toLowerCase()}. Look again at the sky.` })),
        need: 1,
      };
    }
    if (kind === 'wear' || kind === 'pick2') {
      const w = pick(WEAR_WEATHER, random);
      const good = Object.keys(ITEMS).filter((k) => ITEMS[k].for.includes(w));
      const bad = Object.keys(ITEMS).filter((k) => !ITEMS[k].for.includes(w));
      const need = kind === 'pick2' ? 2 : 1;
      // Wrong cards come from different weathers, so no two wrong answers look like the same idea.
      const others = WEAR_WEATHER.filter((x) => x !== w);
      const wrong = [];
      for (let k = 0; wrong.length < n - need; k++) {
        const from = others[k % others.length], cands = shuffle(bad.filter((b) => ITEMS[b].for.includes(from) && !wrong.includes(b)), random);
        if (cands.length) wrong.push(cands[0]);
      }
      const right = shuffle(good, random).slice(0, need);
      const text = need === 2 ? `${WEATHER[w].says}. Pick TWO things Pip needs.` : `${WEATHER[w].says}. What should Pip wear?`;
      return {
        kind, scene: { weather: w, season: w === 'snowy' ? 'winter' : w === 'sunny' ? 'summer' : 'spring' }, text, need,
        options: shuffle([...right, ...wrong], random).map((id) => ({ type: 'item', id, label: ITEMS[id].name, right: right.includes(id), why: right.includes(id) ? ITEMS[id].why : `${ITEMS[id].name} is for ${WEATHER[ITEMS[id].for[0]].name.toLowerCase()} days, not today.` })),
      };
    }
    if (kind === 'season') {
      const s = pick(Object.keys(SEASONS), random);
      return {
        kind, scene: { weather: s === 'winter' ? 'snowy' : s === 'summer' ? 'sunny' : s === 'autumn' ? 'windy' : 'sunny', season: s, clues: true },
        text: 'Look at the tree and the garden. Which season is it?', need: 1,
        options: shuffle([s, ...shuffle(Object.keys(SEASONS).filter((x) => x !== s), random).slice(0, n - 1)], random)
          .map((id) => ({ type: 'season', id, label: SEASONS[id].name, right: id === s, why: id === s ? `Yes! ${SEASONS[id].clue}.` : `${SEASONS[id].name} looks different: ${SEASONS[id].clue.toLowerCase()}.` })),
      };
    }
    if (kind === 'next') {
      const s = pick(Object.keys(SEASONS), random), ans = SEASONS[s].next;
      return {
        kind, scene: { wheel: s }, text: `After ${SEASONS[s].name.toLowerCase()} comes...`, need: 1,
        options: shuffle(Object.keys(SEASONS), random).map((id) => ({ type: 'season', id, label: SEASONS[id].name, right: id === ans, why: id === ans ? `Yes! ${SEASONS[s].name}, then ${SEASONS[ans].name.toLowerCase()}.` : id === s ? `It is ${SEASONS[s].name.toLowerCase()} now. What comes next?` : `Follow the circle: ${SEASONS[s].name.toLowerCase()} is followed by ${SEASONS[ans].name.toLowerCase()}.` })),
      };
    }
    // activity: about a weather or a season.
    const topics = ['windy', 'snowy', 'rainy', 'sunny', 'stormy', 'autumn', 'spring'];
    const topic = pick(topics, random);
    const good = Object.keys(ACTIVITIES).filter((k) => ACTIVITIES[k].for.includes(topic));
    const right = pick(good, random);
    const wrong = shuffle(Object.keys(ACTIVITIES).filter((k) => !ACTIVITIES[k].for.includes(topic) && !(topic === 'snowy' && ACTIVITIES[k].for.includes('winter'))), random).slice(0, n - 1);
    const isSeason = !!SEASONS[topic];
    const text = topic === 'stormy' ? 'Thunder and lightning! What is the safest thing to do?' : isSeason ? `It is ${topic}. What is fun to do?` : `${WEATHER[topic].says}. What is fun to do?`;
    return {
      kind, scene: isSeason ? { weather: topic === 'autumn' ? 'windy' : 'sunny', season: topic } : { weather: topic, season: topic === 'snowy' ? 'winter' : topic === 'sunny' ? 'summer' : 'autumn' },
      text, need: 1,
      options: shuffle([right, ...wrong], random).map((id) => ({ type: 'activity', id, label: ACTIVITIES[id].name, right: id === right, why: id === right ? ACTIVITIES[id].why : `Not today. ${ACTIVITIES[id].why}` })),
    };
  }

  function createRound(chapter, opts = {}) {
    const ch = CHAPTERS[chapter], random = opts.seed != null ? rng(opts.seed) : Math.random;
    const qs = [];
    let guard = 0;
    while (qs.length < ch.count && guard++ < 500) {
      const kind = ch.kinds[qs.length % ch.kinds.length];
      const q = makeQuestion(kind, ch, random);
      // No two questions in a row show the same window.
      const last = qs[qs.length - 1];
      if (last && JSON.stringify(last.scene) === JSON.stringify(q.scene) && last.kind === q.kind) continue;
      qs.push(q);
    }
    return { chapter, ch, qs, i: 0, picked: [], mistakes: 0, firstTry: 0, wrongThis: false, score: 0, over: false };
  }

  const current = (g) => g.qs[g.i];

  // Choosing a card: 'right' (still more to pick), 'done' (question solved), 'wrong', or null if already picked.
  function choose(g, index) {
    const q = current(g);
    if (!q || g.over || g.picked.includes(index)) return null;
    const o = q.options[index];
    if (!o.right) { g.mistakes++; g.wrongThis = true; return 'wrong'; }
    g.picked.push(index);
    if (g.picked.length < q.need) return 'right';
    if (!g.wrongThis) { g.firstTry++; g.score += 100; } else g.score += 40;
    return 'done';
  }
  function next(g) {
    g.i++; g.picked = []; g.wrongThis = false;
    if (g.i >= g.qs.length) g.over = true;
  }
  function result(g) {
    const n = g.qs.length, share = g.firstTry / n;
    const stars = share >= 0.95 ? 3 : share >= 0.75 ? 2 : share >= 0.5 ? 1 : 0;
    return { score: g.score, firstTry: g.firstTry, questions: n, mistakes: g.mistakes, stars };
  }

  root.SEASONS_GAME = { WEATHER, SEASONS, ITEMS, ACTIVITIES, CHAPTERS, WEAR_WEATHER, makeQuestion, createRound, current, choose, next, result, rng };
})(typeof window !== 'undefined' ? window : globalThis);
