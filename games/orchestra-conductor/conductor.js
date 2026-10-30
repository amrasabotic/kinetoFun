// Beat detection, tempo, songs and scoring, free of audio and rendering, so they can be tested headless.
// Hand height is 0 (top of the screen) to 1 (bottom); a downbeat is the bottom of a downward stroke.
(function (root) {
  const SECTIONS = [
    { id: 'drums',   name: 'Drums',   x0: 0,    x1: 0.25 },
    { id: 'strings', name: 'Strings', x0: 0.25, x1: 0.5 },
    { id: 'horns',   name: 'Horns',   x0: 0.5,  x1: 0.75 },
    { id: 'flutes',  name: 'Flutes',  x0: 0.75, x1: 1 },
  ];
  // A stroke must travel this far down, then come back up this much, to count as a beat.
  const MIN_STROKE = 0.05, TURN = 0.015, MIN_GAP = 0.25;
  const SOFT = 0.11, LOUD = 0.17;
  const CUE_HOLD = 0.5;

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "E4:1 D4:0.5" -> notes with a start beat and a length in beats; "R" is a rest.
  function parse(tune) {
    let at = 0;
    return tune.trim().split(/\s+/).map((tok) => {
      const [n, len] = tok.split(':'), beats = Number(len || 1);
      const midi = n === 'R' ? null : 12 * (Number(n.slice(-1)) + 1) + NOTE[n[0]] + (n[1] === '#' ? 1 : 0);
      const note = { at, beats, midi };
      at += beats;
      return note;
    }).filter((n) => n.midi !== null);
  }

  const TUNES = {
    twinkle: 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2',
    mary: 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4',
    jacques: 'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2',
    joy: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2',
    farm: 'G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:3 D4 G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:4',
    bells: 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 F4 F4 F4:1.5 F4:0.5 F4 E4 E4 E4:0.5 E4:0.5 E4 D4 D4 E4 D4:2 G4:2',
  };

  // marks: [fromBeat, toBeat, slowest bpm, fastest bpm, dynamic or null]; cues: [beat, section].
  // Both are written for one pass of the tune; times plays it that often and stretches them to fit.
  const LEVELS = [
    { name: 'Twinkle Twinkle', times: 2, tune: 'twinkle', start: ['strings'], marks: [[0, 48, 70, 110, null]], cues: [[16, 'drums']] },
    { name: 'Mary Had a Little Lamb', times: 3, tune: 'mary', start: ['strings'], marks: [[0, 30, 80, 120, null]], cues: [[8, 'flutes']] },
    { name: 'Frere Jacques', times: 3, tune: 'jacques', start: ['strings', 'drums'], marks: [[0, 32, 85, 125, null]], cues: [[8, 'horns'], [16, 'flutes']] },
    { name: 'Loud and Soft', times: 3, tune: 'joy', start: ['strings'], marks: [[0, 16, 80, 120, 'p'], [16, 32, 80, 120, 'f']], cues: [[16, 'horns']] },
    { name: 'Down on the Farm', times: 3, tune: 'farm', start: ['strings'], marks: [[0, 32, 95, 140, null]], cues: [[4, 'drums'], [16, 'horns']] },
    { name: 'Slow Lullaby', times: 2, tune: 'twinkle', start: ['strings'], marks: [[0, 48, 55, 85, 'p']], cues: [[16, 'flutes']] },
    { name: 'Jingle Bells', times: 4, tune: 'bells', start: ['drums', 'strings'], marks: [[0, 32, 100, 145, 'f']], cues: [[8, 'horns'], [16, 'flutes']] },
    { name: 'Faster and Faster', times: 3, tune: 'jacques', start: ['strings'], marks: [[0, 16, 70, 100, null], [16, 32, 105, 145, null]], cues: [[8, 'drums'], [20, 'horns']] },
    { name: 'Ode to Joy', times: 3, tune: 'joy', start: ['strings'], marks: [[0, 8, 80, 115, 'p'], [8, 24, 80, 115, 'f'], [24, 32, 70, 105, 'p']], cues: [[8, 'drums'], [12, 'horns'], [24, 'flutes']] },
    { name: 'Grand Concert', times: 4, tune: 'bells', start: ['strings'], marks: [[0, 12, 85, 120, 'p'], [12, 32, 105, 150, 'f']], cues: [[4, 'drums'], [12, 'horns'], [20, 'flutes']] },
  ];

  function createConcert(levelIndex) {
    const lv = LEVELS[levelIndex], once = parse(TUNES[lv.tune]);
    const pass = once.reduce((m, n) => Math.max(m, n.at + n.beats), 0);
    const notes = [];
    for (let k = 0; k < lv.times; k++) for (const n of once) notes.push({ ...n, at: n.at + k * pass });
    const length = pass * lv.times;
    return {
      level: levelIndex, notes, length, pos: 0, next: 0, t: 0, done: false, events: [],
      tempo: 0, strength: 0, lastBeat: -1e9, playing: new Set(lv.start),
      stroke: { dir: 0, top: null, bottom: null, lastY: null },
      marks: lv.marks.map(([a, b, lo, hi, dyn]) => [a * lv.times, b * lv.times, lo, hi, dyn]),
      cues: lv.cues.map(([beat, section]) => ({ beat: beat * lv.times, section, hold: 0, state: 'waiting' })),
      inTempo: 0, timed: 0, dynHit: 0, dynTotal: 0, beats: 0,
    };
  }

  // Feeds one hand height sample; returns true when it completed a downbeat.
  function feed(c, y, t) {
    const s = c.stroke;
    if (s.lastY === null) { s.lastY = y; s.top = y; s.bottom = y; return false; }
    let beat = false;
    if (y > s.bottom) s.bottom = y;
    if (y < s.top) s.top = y;
    if (s.dir >= 0) {
      if (s.bottom - y >= TURN && s.bottom - s.top >= MIN_STROKE) {
        if (t - c.lastBeat >= MIN_GAP) {
          const amp = s.bottom - s.top, gap = t - c.lastBeat;
          if (gap < 2.5) { const bpm = Math.max(40, Math.min(200, 60 / gap)); c.tempo = c.tempo ? c.tempo * 0.5 + bpm * 0.5 : bpm; }
          c.strength = c.strength ? c.strength * 0.5 + amp * 0.5 : amp;
          c.lastBeat = t; c.beats++; beat = true;
          c.events.push({ type: 'beat', amp });
        }
        s.dir = -1; s.top = y;
      }
    } else if (y - s.top >= TURN) { s.dir = 1; s.bottom = y; }
    s.lastY = y;
    return beat;
  }

  // The orchestra follows the conductor; without beats it slows and waits.
  function playingTempo(c) {
    if (!c.tempo) return 0;
    const since = c.t - c.lastBeat, beatLen = 60 / c.tempo;
    if (since <= beatLen * 1.6) return c.tempo;
    return Math.max(0, c.tempo * (1 - (since - beatLen * 1.6) / 1.2));
  }
  const dynamicOf = (c) => (c.strength < SOFT ? 'p' : c.strength > LOUD ? 'f' : 'mf');

  function markAt(c, pos) { return c.marks.find((m) => pos >= m[0] && pos < m[1]) || null; }

  // hand: { x, y } in 0..1, or null. Notes due are pushed as events for the sound engine.
  function step(c, dt, hand) {
    if (c.done) return;
    c.t += dt;
    if (hand) feed(c, hand.y, c.t);
    const bpm = playingTempo(c), adv = (dt * bpm) / 60;
    if (adv > 0) {
      const mark = markAt(c, c.pos);
      if (mark) {
        c.timed += adv;
        if (c.tempo >= mark[2] && c.tempo <= mark[3]) c.inTempo += adv;
        if (mark[4]) { c.dynTotal += adv; if (dynamicOf(c) === mark[4]) c.dynHit += adv; }
      }
    }
    c.pos += adv;
    for (const cue of c.cues) {
      if (cue.state !== 'waiting') continue;
      const open = c.pos >= cue.beat - 2;
      const sec = SECTIONS.find((s) => s.id === cue.section);
      if (open && cue.hold === 0 && !cue.shown) { cue.shown = true; c.events.push({ type: 'cue', section: cue.section }); }
      if (open && hand && hand.x >= sec.x0 && hand.x < sec.x1 && bpm > 0) cue.hold += dt;
      if (cue.hold >= CUE_HOLD) { cue.state = 'hit'; c.playing.add(cue.section); c.events.push({ type: 'join', section: cue.section, hit: true }); }
      else if (c.pos >= cue.beat + 4) { cue.state = 'missed'; c.playing.add(cue.section); c.events.push({ type: 'join', section: cue.section, hit: false }); }
    }
    while (c.next < c.notes.length && c.notes[c.next].at <= c.pos) {
      const n = c.notes[c.next++];
      c.events.push({ type: 'note', midi: n.midi, beats: n.beats, seconds: bpm ? (n.beats * 60) / bpm : 0.4, at: n.at, sections: [...c.playing], loud: dynamicOf(c) });
    }
    if (c.pos >= c.length) { c.done = true; c.events.push({ type: 'done' }); }
  }

  function result(c) {
    const tempo = c.timed ? c.inTempo / c.timed : 0;
    const dyn = c.dynTotal ? c.dynHit / c.dynTotal : 1;
    const cues = c.cues.length ? c.cues.filter((q) => q.state === 'hit').length / c.cues.length : 1;
    const overall = tempo * 0.5 + dyn * 0.2 + cues * 0.3;
    const stars = overall >= 0.8 ? 3 : overall >= 0.6 ? 2 : 1;
    return { stars, tempo: Math.round(tempo * 100), dynamics: Math.round(dyn * 100), cues: c.cues.filter((q) => q.state === 'hit').length,
      cueCount: c.cues.length, seconds: Math.round(c.t), score: Math.round(overall * 200) + stars * 30 };
  }

  root.Conductor = { SECTIONS, LEVELS, TUNES, SOFT, LOUD, CUE_HOLD, parse, createConcert, feed, step, result, playingTempo, dynamicOf, markAt };
})(typeof window !== 'undefined' ? window : globalThis);
