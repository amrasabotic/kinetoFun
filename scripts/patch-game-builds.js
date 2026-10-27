#!/usr/bin/env node
// Makes built games report the player's hand position to the platform.
// - Adds /kf-bridge.js to each built HTML entry page.
// - Wraps tasks-vision's detectForVideo/recognizeForVideo through window.__kfDetect and window.__kfTap.
// Idempotent: safe to run again. build-games.js runs it after every build.

const fs = require('fs');
const path = require('path');

const GAMES_OUT = path.resolve(__dirname, '..', 'public', 'games');
const BRIDGE_TAG = '<script src="/kf-bridge.js"></script>';
const SKIP = new Set(['node_modules']);

// The library registers its public methods as `X.prototype.detectForVideo=X.prototype.G`.
const TAP_RE = /(\w+)\.prototype\.(detectForVideo|recognizeForVideo)=\1\.prototype\.(\w+)(?![\w(])/g;
const OLD_TAP_RE = /(\w+)\.prototype\.(detectForVideo|recognizeForVideo)=function\(\.\.\.a\)\{const r=\1\.prototype\.(\w+)\.apply\(this,a\);globalThis\.__kfTap&&globalThis\.__kfTap\(r\);return r\}/g;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function patchGame(name) {
  const dir = path.join(GAMES_OUT, name);
  let pages = 0, taps = 0;
  for (const file of walk(dir)) {
    if (/\.html$/.test(file)) {
      let s = fs.readFileSync(file, 'utf8');
      if (!s.includes(BRIDGE_TAG)) {
        const out = /<head[^>]*>/i.test(s) ? s.replace(/<head[^>]*>/i, (m) => m + BRIDGE_TAG) : BRIDGE_TAG + s;
        fs.writeFileSync(file, out);
      }
      pages++;
    } else if (/\.m?js$/.test(file)) {
      const s = fs.readFileSync(file, 'utf8');
      if (!s.includes('.prototype.detectForVideo=') && !s.includes('.prototype.recognizeForVideo=')) continue;
      if (s.includes('__kfDetect')) continue;
      const wrap = (cls, method, impl) => {
        taps++;
        const run = `()=>${cls}.prototype.${impl}.apply(this,a)`;
        return `${cls}.prototype.${method}=function(...a){const r=globalThis.__kfDetect?globalThis.__kfDetect(this,a,${run}):${cls}.prototype.${impl}.apply(this,a);globalThis.__kfTap&&globalThis.__kfTap(r);return r}`;
      };
      // Builds patched before __kfDetect existed carry the older wrapper; upgrade it in place.
      const out = s
        .replace(OLD_TAP_RE, (_m, cls, method, impl) => wrap(cls, method, impl))
        .replace(TAP_RE, (_m, cls, method, impl) => wrap(cls, method, impl));
      fs.writeFileSync(file, out);
    }
  }
  return { pages, taps };
}

function patchAll(names) {
  const targets = names && names.length ? names : fs.readdirSync(GAMES_OUT, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const rows = [];
  for (const n of targets) {
    if (!fs.existsSync(path.join(GAMES_OUT, n))) continue;
    rows.push([n, patchGame(n)]);
  }
  return rows;
}

module.exports = { patchGame, patchAll };

if (require.main === module) {
  const rows = patchAll(process.argv.slice(2));
  for (const [n, r] of rows) console.log(`${n}: ${r.pages} page(s), ${r.taps} tap(s)`);
}
