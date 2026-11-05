// Battle rules, free of rendering and input, so they can run headless.
(function (root) {
  const FIELD = { w: 1280, h: 720 };
  const WIZ = { x: 640, y: 560 };
  const WARD_Y = 470;
  const SPAWN_Y = 150;
  const LANES = [240, 440, 640, 840, 1040];
  // Spell cards are easier than drawing from a sofa, so they hit a little softer.
  const CARD_POWER = 0.75;
  const COMBO_WINDOW = 3;

  const SPELLS = {
    fireball:  { name: 'Fireball',    rune: 'circle',   color: '#ff7a2f', recharge: 1.6, dmg: 40, learn: 1, text: 'Hits the closest enemy' },
    frost:     { name: 'Frost',       rune: 'vline',    color: '#7fd8ff', recharge: 3,   dmg: 15, freeze: 4, learn: 2, text: 'Freezes the closest enemy for 4 seconds' },
    shield:    { name: 'Shield',      rune: 'triangle', color: '#5cf0b0', recharge: 9,   heal: 15, block: 5, learn: 3, text: 'Blocks every attack for 5 seconds and heals you' },
    lightning: { name: 'Lightning',   rune: 'zigzag',   color: '#ffe14d', recharge: 4,   dmg: 40, chain: 3, learn: 4, text: 'Strikes the 3 closest enemies' },
    gust:      { name: 'Gust',        rune: 'hline',    color: '#c9d6ff', recharge: 6,   dmg: 12, push: 150, learn: 5, text: 'Hits every enemy and pushes them back' },
    arcane:    { name: 'Arcane Bolt', rune: 'vshape',   color: '#d27bff', recharge: 7,   dmg: 90, learn: 7, text: 'A huge blast at the toughest enemy' },
  };
  const SPELL_ORDER = ['fireball', 'frost', 'shield', 'lightning', 'gust', 'arcane'];

  const ENEMIES = {
    imp:    { name: 'Imp',             hp: 30,  speed: 38, melee: 5,  rate: 2.0, points: 10, r: 30 },
    archer: { name: 'Skeleton Archer', hp: 30,  speed: 34, shot: 5,   rate: 3.5, stopY: 270, points: 15, r: 30 },
    troll:  { name: 'Troll',           hp: 120, speed: 18.5, melee: 10, rate: 2.5, regen: 3, points: 40, r: 46 },
    wraith: { name: 'Wraith',          hp: 50,  speed: 50, melee: 6,  rate: 2.0, points: 20, r: 32 },
    dragon: { name: 'Shadow Dragon',   hp: 500, boss: true, points: 300, r: 110 },
  };

  // Spawn lists: [seconds, enemy, lane].
  const LEVELS = [
    { name: 'The Practice Yard', learn: 'fireball',
      spawns: [[1.2, 'imp', 2], [7.2, 'imp', 1], [13.2, 'imp', 3], [18, 'imp', 0], [21.6, 'imp', 4], [26.4, 'imp', 2]] },
    { name: 'Frozen Gate', learn: 'frost',
      spawns: [[1.2, 'imp', 1], [3.6, 'imp', 3], [9.6, 'imp', 2], [14.4, 'imp', 0], [15.6, 'imp', 4], [21.6, 'imp', 2], [24, 'imp', 1], [28.8, 'imp', 3]] },
    { name: 'Bone Archers', learn: 'shield',
      spawns: [[1.2, 'archer', 2], [4.8, 'imp', 0], [9.6, 'imp', 4], [13.2, 'archer', 1], [18, 'imp', 2], [21.6, 'archer', 3], [27, 'imp', 0]] },
    { name: 'Storm Clouds', learn: 'lightning',
      spawns: [[1.2, 'imp', 1], [1.9, 'imp', 2], [2.6, 'imp', 3], [10.8, 'archer', 0], [14.4, 'imp', 2], [15.1, 'imp', 3], [15.8, 'imp', 4],
        [24, 'archer', 4], [27.6, 'imp', 0], [28.3, 'imp', 1], [29, 'imp', 2]] },
    { name: 'Troll Bridge', learn: 'gust',
      spawns: [[1.2, 'troll', 2], [6, 'imp', 0], [7.2, 'imp', 4], [14.4, 'imp', 1], [15, 'imp', 3], [21.6, 'troll', 1], [26.4, 'imp', 2], [27.6, 'imp', 4]] },
    { name: 'Haunted Hall', learn: null, tip: 'Wraiths jump back when hurt. Finish them quickly!',
      spawns: [[1.2, 'wraith', 2], [6, 'imp', 0], [8.4, 'archer', 4], [12, 'wraith', 1], [16.8, 'imp', 3], [18, 'imp', 2], [22.8, 'wraith', 3],
        [27.6, 'archer', 0], [31.2, 'wraith', 4]] },
    { name: 'Arcane Tower', learn: 'arcane',
      spawns: [[1.2, 'troll', 1], [4.8, 'imp', 3], [9.6, 'troll', 3], [13.2, 'archer', 0], [16.8, 'wraith', 2], [21.6, 'troll', 2], [25.2, 'imp', 4],
        [26.4, 'imp', 0], [31.2, 'archer', 2]] },
    { name: 'Fire and Wind', learn: null, combo: 'firestorm', tip: 'Combo: Fireball, then Gust within 3 seconds, sets every enemy on fire.',
      spawns: [[1.2, 'imp', 0], [1.8, 'imp', 1], [2.4, 'imp', 2], [3, 'imp', 3], [3.6, 'imp', 4], [10.8, 'troll', 2], [13.2, 'archer', 1],
        [16.8, 'imp', 0], [17.4, 'imp', 2], [18, 'imp', 4], [24, 'wraith', 3], [26.4, 'archer', 0], [30, 'imp', 1], [30.6, 'imp', 3], [33, 'imp', 2]] },
    { name: 'The Shattering', learn: null, combo: 'shatter', tip: 'Combo: Lightning does double damage to frozen enemies.',
      spawns: [[1.2, 'troll', 2], [3.6, 'wraith', 0], [9, 'wraith', 4], [12, 'archer', 1], [13.2, 'archer', 3], [16.8, 'imp', 0], [17.4, 'imp', 1],
        [18, 'imp', 2], [23.4, 'imp', 1], [28.2, 'imp', 3], [33, 'imp', 2]] },
    { name: 'Shadow Dragon', learn: null, boss: true, tip: 'The dragon glows before it breathes fire. Raise a Shield!',
      spawns: [[1.2, 'dragon', 2], [4.8, 'imp', 0], [6, 'imp', 4]] },
  ];

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function unlockedSpells(levelIndex) {
    return SPELL_ORDER.filter((id) => SPELLS[id].learn <= levelIndex + 1);
  }

  function createBattle(levelIndex, seed) {
    const lv = LEVELS[levelIndex];
    return {
      level: levelIndex, t: 0, hp: 100, maxHp: 100,
      spawns: lv.spawns.map((s) => ({ at: s[0], type: s[1], lane: s[2] })).sort((a, b) => a.at - b.at),
      next: 0, enemies: [], arrows: [], uid: 1,
      ready: Object.fromEntries(SPELL_ORDER.map((id) => [id, 0])),
      unlocked: unlockedSpells(levelIndex),
      shieldUntil: 0, lastCast: null,
      kills: 0, points: 0, drawnCasts: 0, combos: 0, damageTaken: 0,
      events: [], over: null, rand: rng(seed || 1234 + levelIndex),
    };
  }

  function spawn(s, e, x, y) {
    const d = ENEMIES[e.type];
    const en = { id: s.uid++, type: e.type, x, y, hp: d.hp, maxHp: d.hp, freezeT: 0, atkT: d.rate || 0, lastHit: -99, blinked: false, attacking: false };
    if (d.boss) Object.assign(en, { breathT: 6, telegraph: 0, summonT: 0, phase: 1 });
    s.enemies.push(en);
    s.events.push({ type: 'spawn', id: en.id, enemy: e.type });
    return en;
  }

  function hurtPlayer(s, dmg, from) {
    if (s.t < s.shieldUntil) { s.events.push({ type: 'blocked', from }); return; }
    s.hp = Math.max(0, s.hp - dmg);
    s.damageTaken += dmg;
    s.events.push({ type: 'hurt', dmg, from });
  }

  function damage(s, en, amount, spell) {
    if (en.hp <= 0) return;
    const dealt = Math.round(amount);
    en.hp -= dealt;
    en.lastHit = s.t;
    s.events.push({ type: 'hit', id: en.id, dmg: dealt, spell, x: en.x, y: en.y });
    const d = ENEMIES[en.type];
    if (en.type === 'wraith' && !en.blinked && en.hp > 0 && en.hp < d.hp / 2) {
      en.blinked = true;
      const lanes = LANES.filter((x) => Math.abs(x - en.x) > 50);
      const fromX = en.x, fromY = en.y;
      en.x = lanes[Math.floor(s.rand() * lanes.length)];
      en.y = Math.max(SPAWN_Y, en.y - 125);
      en.attacking = false;
      s.events.push({ type: 'blink', id: en.id, fromX, fromY, x: en.x, y: en.y });
    }
    if (en.hp <= 0) {
      s.kills++;
      s.points += d.points;
      s.events.push({ type: 'kill', id: en.id, enemy: en.type, x: en.x, y: en.y });
    }
  }

  const alive = (s) => s.enemies.filter((e) => e.hp > 0);
  const byCloseness = (s) => alive(s).sort((a, b) => Math.hypot(a.x - WIZ.x, a.y - WIZ.y) - Math.hypot(b.x - WIZ.x, b.y - WIZ.y));

  function spellReady(s, id) {
    return s.unlocked.includes(id) && s.t >= s.ready[id];
  }

  // Returns { ok, reason, combo }; reason is 'locked' | 'recharging' | 'over'.
  function cast(s, id, quick) {
    if (s.over) return { ok: false, reason: 'over' };
    if (!s.unlocked.includes(id)) return { ok: false, reason: 'locked' };
    if (s.t < s.ready[id]) return { ok: false, reason: 'recharging', wait: s.ready[id] - s.t };
    const sp = SPELLS[id];
    const power = quick ? CARD_POWER : 1;
    s.ready[id] = s.t + sp.recharge;
    if (!quick) s.drawnCasts++;
    const targets = [];
    let combo = null;
    const near = byCloseness(s);

    if (id === 'fireball' && near[0]) targets.push(near[0]);
    if (id === 'frost' && near[0]) targets.push(near[0]);
    if (id === 'lightning') targets.push(...near.slice(0, sp.chain));
    if (id === 'gust') targets.push(...near);
    if (id === 'arcane' && near.length) targets.push(near.slice().sort((a, b) => b.hp - a.hp)[0]);

    if (id === 'gust' && s.lastCast && s.lastCast.id === 'fireball' && s.t - s.lastCast.t <= COMBO_WINDOW) combo = 'firestorm';
    s.events.push({ type: 'cast', spell: id, quick: !!quick, targets: targets.map((e) => ({ id: e.id, x: e.x, y: e.y })), combo });

    if (id === 'shield') {
      s.shieldUntil = s.t + sp.block;
      const heal = Math.round(sp.heal * power);
      s.hp = Math.min(s.maxHp, s.hp + heal);
      s.events.push({ type: 'heal', amount: heal });
    }
    for (const en of targets) {
      let dmg = sp.dmg * power;
      if (id === 'lightning' && en.freezeT > 0) { dmg *= 2; combo = combo || 'shatter'; }
      if (id === 'gust' && combo === 'firestorm') dmg += 25;
      if (id === 'frost') en.freezeT = sp.freeze;
      if (id === 'gust' && !ENEMIES[en.type].boss) {
        en.y = Math.max(SPAWN_Y, en.y - sp.push);
        en.attacking = false;
      }
      damage(s, en, dmg, id);
    }
    if (combo) { s.combos++; s.events.push({ type: 'combo', combo }); }
    s.lastCast = { id, t: s.t };
    return { ok: true, combo, targets: targets.length };
  }

  function stepDragon(s, en, dt) {
    if (en.phase === 1 && en.hp < en.maxHp / 2) { en.phase = 2; en.summonT = 0; s.events.push({ type: 'phase', id: en.id }); }
    if (en.telegraph > 0) {
      en.telegraph -= dt;
      if (en.telegraph <= 0) { s.events.push({ type: 'breath', id: en.id }); hurtPlayer(s, 15, 'dragon'); }
      return;
    }
    en.breathT -= dt;
    if (en.breathT <= 0) {
      en.telegraph = 1.6;
      en.breathT = en.phase === 2 ? 6 : 8;
      s.events.push({ type: 'telegraph', id: en.id });
    }
    if (en.phase === 2) {
      en.summonT -= dt;
      if (en.summonT <= 0) {
        en.summonT = 12;
        for (const lane of [0, 4]) spawn(s, { type: 'imp' }, LANES[lane], SPAWN_Y + 100);
        s.events.push({ type: 'summon', id: en.id });
      }
    }
  }

  function step(s, dt) {
    if (s.over) return;
    s.t += dt;
    while (s.next < s.spawns.length && s.spawns[s.next].at <= s.t) {
      const sp = s.spawns[s.next++];
      if (sp.type === 'dragon') spawn(s, sp, 640, 215);
      else spawn(s, sp, LANES[sp.lane], SPAWN_Y);
    }

    for (const en of s.enemies) {
      if (en.hp <= 0) continue;
      const d = ENEMIES[en.type];
      if (en.freezeT > 0) { en.freezeT = Math.max(0, en.freezeT - dt); continue; }
      if (d.boss) { stepDragon(s, en, dt); continue; }
      if (d.regen && s.t - en.lastHit > 3) en.hp = Math.min(en.maxHp, en.hp + d.regen * dt);
      const stopY = d.stopY || WARD_Y;
      if (en.y < stopY) {
        en.y = Math.min(stopY, en.y + d.speed * dt);
        en.attacking = false;
        continue;
      }
      if (!en.attacking) { en.attacking = true; en.atkT = d.shot ? 0.8 : 0.6; }
      en.atkT -= dt;
      if (en.atkT <= 0) {
        en.atkT = d.rate;
        if (d.shot) {
          s.arrows.push({ fromX: en.x, fromY: en.y, p: 0, dmg: d.shot });
          s.events.push({ type: 'shoot', id: en.id });
        } else {
          s.events.push({ type: 'strike', id: en.id });
          hurtPlayer(s, d.melee, en.type);
        }
      }
    }

    for (const a of s.arrows) {
      a.p += dt * 420 / Math.hypot(WIZ.x - a.fromX, WIZ.y - a.fromY);
      if (a.p >= 1 && !a.done) { a.done = true; hurtPlayer(s, a.dmg, 'arrow'); }
    }
    s.arrows = s.arrows.filter((a) => !a.done);
    s.enemies = s.enemies.filter((e) => e.hp > 0);

    if (s.hp <= 0) { s.over = 'lose'; s.events.push({ type: 'lose' }); }
    else if (s.next >= s.spawns.length && s.enemies.length === 0) { s.over = 'win'; s.events.push({ type: 'win' }); }
  }

  function result(s) {
    const hpLeft = Math.round(s.hp);
    const stars = s.over !== 'win' ? 0 : hpLeft >= 70 ? 3 : hpLeft >= 35 ? 2 : 1;
    const score = s.over === 'win' ? s.points + hpLeft * 2 + s.drawnCasts * 5 + s.combos * 25 : Math.round(s.points / 2);
    return { stars, score, hpLeft, kills: s.kills, drawn: s.drawnCasts, combos: s.combos };
  }

  root.WizardEngine = { FIELD, WIZ, WARD_Y, SPAWN_Y, LANES, SPELLS, SPELL_ORDER, ENEMIES, LEVELS, CARD_POWER, COMBO_WINDOW,
    createBattle, step, cast, spellReady, result, unlockedSpells };
})(typeof window !== 'undefined' ? window : globalThis);
