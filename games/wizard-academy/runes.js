// Recognises the six runes from one fingertip stroke, by shape features rather than templates,
// so it tolerates any start point, either direction, wobble and uneven proportions.
(function (root) {
  const N = 48;

  const RUNES = {
    circle:   { spell: 'fireball',  label: 'Circle' },
    vline:    { spell: 'frost',     label: 'Line down' },
    triangle: { spell: 'shield',    label: 'Triangle' },
    zigzag:   { spell: 'lightning', label: 'Zigzag' },
    hline:    { spell: 'gust',      label: 'Line across' },
    vshape:   { spell: 'arcane',    label: 'V' },
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function pathLength(pts) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += dist(pts[i - 1], pts[i]);
    return d;
  }

  function resample(pts, n) {
    const step = pathLength(pts) / (n - 1);
    const out = [{ x: pts[0].x, y: pts[0].y }];
    let acc = 0;
    const src = pts.map((p) => ({ x: p.x, y: p.y }));
    for (let i = 1; i < src.length; i++) {
      const d = dist(src[i - 1], src[i]);
      if (acc + d >= step && d > 0) {
        const t = (step - acc) / d;
        const q = { x: src[i - 1].x + t * (src[i].x - src[i - 1].x), y: src[i - 1].y + t * (src[i].y - src[i - 1].y) };
        out.push(q);
        src.splice(i, 0, q);
        acc = 0;
      } else {
        acc += d;
      }
    }
    while (out.length < n) out.push({ x: src[src.length - 1].x, y: src[src.length - 1].y });
    return out.slice(0, n);
  }

  function smooth(pts) {
    return pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const a = pts[i - 1], b = pts[i + 1];
      return { x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 };
    });
  }

  function angleBetween(ax, ay, bx, by) {
    let d = Math.atan2(by, bx) - Math.atan2(ay, ax);
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  // Sharp turns: local maxima of the turn measured across a window of k samples.
  function findCorners(p, k, minTurn) {
    const turns = [];
    for (let i = k; i < p.length - k; i++) {
      turns.push({ i, a: angleBetween(p[i].x - p[i - k].x, p[i].y - p[i - k].y, p[i + k].x - p[i].x, p[i + k].y - p[i].y) });
    }
    const corners = [];
    for (let j = 0; j < turns.length; j++) {
      const t = turns[j];
      if (Math.abs(t.a) < minTurn) continue;
      const prev = turns[j - 1], next = turns[j + 1];
      if (prev && Math.abs(prev.a) > Math.abs(t.a)) continue;
      if (next && Math.abs(next.a) >= Math.abs(t.a)) continue;
      const last = corners[corners.length - 1];
      if (last && t.i - last.i < k) {
        if (Math.abs(t.a) > Math.abs(last.a)) corners[corners.length - 1] = t;
        continue;
      }
      corners.push(t);
    }
    return corners;
  }

  function features(raw) {
    const p = smooth(resample(raw, N));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of p) { minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x); minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y); }
    const w = maxX - minX, h = maxY - minY, size = Math.max(w, h);
    const L = pathLength(p);
    const first = p[0], last = p[p.length - 1];
    let total = 0;
    for (let i = 2; i < p.length; i++) {
      total += angleBetween(p[i - 1].x - p[i - 2].x, p[i - 1].y - p[i - 2].y, p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    }
    return {
      p, w, h, size, L,
      gap: dist(first, last) / (size || 1),
      straight: dist(first, last) / (L || 1),
      dx: last.x - first.x, dy: last.y - first.y,
      totalTurn: total,
      corners: findCorners(p, 4, 0.95),
    };
  }

  // Returns { rune, spell } or { rune: null, reason: 'small' | 'unclear' | 'diagonal' }.
  function recognize(points, minSize) {
    if (!points || points.length < 6) return { rune: null, reason: 'small' };
    const f = features(points);
    if (f.size < (minSize || 0)) return { rune: null, reason: 'small' };
    const hit = (rune) => ({ rune, spell: RUNES[rune].spell });

    if (f.straight >= 0.8) {
      const ax = Math.abs(f.dx), ay = Math.abs(f.dy);
      if (ax >= 1.8 * ay) return hit('hline');
      if (ay >= 1.8 * ax) return hit('vline');
      return { rune: null, reason: 'diagonal' };
    }

    const closed = f.gap <= 0.4 && Math.abs(f.totalTurn) >= 3.3;
    if (closed) {
      const sharp = f.corners.filter((c) => Math.abs(c.a) >= 1.15).length;
      if (sharp >= 2 && sharp <= 3) return hit('triangle');
      if (sharp <= 1) return hit('circle');
      return { rune: null, reason: 'unclear' };
    }

    const c = f.corners;
    if (c.length === 1) {
      const at = c[0].i / (N - 1);
      if (Math.abs(c[0].a) >= 1.75 && at > 0.2 && at < 0.8) return hit('vshape');
      return { rune: null, reason: 'unclear' };
    }
    if (c.length >= 2) {
      let alternating = true;
      for (let i = 1; i < c.length; i++) if (Math.sign(c[i].a) === Math.sign(c[i - 1].a)) alternating = false;
      if (alternating) return hit('zigzag');
    }
    return { rune: null, reason: 'unclear' };
  }

  root.Runes = { RUNES, recognize, features };
})(typeof window !== 'undefined' ? window : globalThis);
