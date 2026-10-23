// Opens each registered game the way a TV shows it and reports text and buttons too small to read or hold.
// Usage: node scripts/audit-tv-sizes.mjs [--scale=1.5] [--out=dir] [--json] [name ...]
// Needs built games in public/games/ and a local Chrome (or set CHROME_PATH).

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const args = process.argv.slice(2);
const flag = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const asJson = args.includes("--json");
const only = new Set(args.filter((a) => !a.startsWith("--")));
// The Pi outputs 1080p; the game gets the screen divided by the scale (DEFAULT_TV_SCALE in use-tv-game-scale.ts is 2).
const scale = Number(flag("scale", "2"));
const VIEW_W = Math.round(1920 / scale);
const VIEW_H = Math.round(1080 / scale);
const outDir = flag("out", join(tmpdir(), `kf-tv-sizes-${scale}`));
const settleMs = Number(flag("wait", "6000"));

// On-screen pixels at the TV; roughly what stays readable and holdable from a sofa on a 1080p set.
const MIN_TEXT_PX = 24;
const MIN_TARGET_PX = 96;

const registry = readFileSync(join(root, "src", "games", "registry.ts"), "utf8");
const games = [...registry.matchAll(/'([^']+)':\s*\{\s*folder:\s*'[^']+',\s*indexPath:\s*'([^']+)'/g)]
  .map(([, id, path]) => ({ id, path }))
  .filter((g) => only.size === 0 || only.has(g.id));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".wasm": "application/wasm", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".task": "application/octet-stream" };

function serve() {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
    let file = join(publicDir, path);
    if (!file.startsWith(publicDir)) return res.writeHead(403).end();
    if (existsSync(join(file, "index.html"))) file = join(file, "index.html");
    if (!existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

function findChrome() {
  const candidates = [process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];
  const found = candidates.find((c) => c && existsSync(c));
  if (!found) throw new Error("No Chrome found; set CHROME_PATH.");
  return found;
}

async function launchChrome() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(findChrome(), ["--headless=new", `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), `kf-tv-audit-${port}`)}`, "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", "--mute-audio",
    "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      return { proc, port };
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  proc.kill();
  throw new Error("Chrome did not start.");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return new Promise((resolve) => { ws.onopen = () => resolve({ send, close: () => ws.close() }); });
}

// Runs inside the game page; sizes are CSS pixels of the 1280x720 viewport.
const MEASURE = `(() => {
  const W = innerWidth, H = innerHeight;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.right <= 0 || r.top >= H || r.left >= W) return null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) < 0.05) return null;
    }
    return r;
  };
  let chars = 0, smallChars = 0, minFont = Infinity;
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  for (let t; (t = walker.nextNode()); ) {
    const text = t.textContent.trim();
    if (!text || !t.parentElement || !visible(t.parentElement)) continue;
    const size = parseFloat(getComputedStyle(t.parentElement).fontSize);
    chars += text.length;
    minFont = Math.min(minFont, size);
    if (size < ${MIN_TEXT_PX / scale}) smallChars += text.length;
  }
  const targets = [...document.querySelectorAll("button, a[href], [role=button], [data-focusable], [data-dwell], [onclick]")]
    .map(visible).filter(Boolean).map((r) => Math.min(r.width, r.height));
  const canvas = [...document.querySelectorAll("canvas")].map(visible).filter(Boolean)
    .reduce((best, r) => Math.max(best, (Math.min(r.right, W) - Math.max(r.left, 0)) * (Math.min(r.bottom, H) - Math.max(r.top, 0))), 0);
  // Anything the player needs that ends up past the screen edge or behind a scrollbar.
  const doc = document.scrollingElement || document.documentElement;
  const scrolls = doc.scrollHeight > H + 4 || doc.scrollWidth > W + 4;
  const clipped = [...document.querySelectorAll("button, a[href], [role=button], [data-focusable], [data-dwell], h1, h2, h3, p")]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && (r.bottom > H + 2 || r.right > W + 2); }).length;
  return { scrolls, clipped, chars, smallChars, minFont: chars ? minFont : null, targets: targets.length,
    smallTargets: targets.filter((s) => s < ${MIN_TARGET_PX / scale}).length,
    minTarget: targets.length ? Math.min(...targets) : null, canvasCover: canvas / (W * H) };
})()`;

async function auditGame(port, base, game) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const page = await connect(target.webSocketDebuggerUrl);
  try {
    await page.send("Emulation.setDeviceMetricsOverride", { width: VIEW_W, height: VIEW_H, deviceScaleFactor: scale, mobile: false });
    await page.send("Page.enable");
    await page.send("Page.navigate", { url: base + game.path });
    await new Promise((r) => setTimeout(r, settleMs));
    const { result } = await page.send("Runtime.evaluate", { expression: MEASURE, returnByValue: true });
    const shot = await page.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(outDir, `${game.id}.png`), Buffer.from(shot.data, "base64"));
    return { id: game.id, ...result.value };
  } catch (err) {
    return { id: game.id, error: err.message };
  } finally {
    page.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => {});
  }
}

function verdict(r) {
  if (r.error) return "error";
  if (r.scrolls || r.clipped > 0) return "overflow";
  const textShare = r.chars ? r.smallChars / r.chars : 0;
  if (textShare > 0.3 || r.smallTargets > 0) return "fix";
  if (textShare > 0) return "check";
  return "ok";
}

mkdirSync(outDir, { recursive: true });
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const chrome = await launchChrome();
const results = [];
try {
  for (const game of games) {
    const r = await auditGame(chrome.port, base, game);
    r.verdict = verdict(r);
    results.push(r);
    if (!asJson) process.stderr.write(`${r.verdict.padEnd(6)} ${game.id}\n`);
  }
} finally {
  chrome.proc.kill();
  server.close();
}

const tv = (css) => (css == null ? "-" : `${Math.round(css * scale)}px`);
if (asJson) {
  console.log(JSON.stringify({ scale, minTextPx: MIN_TEXT_PX, minTargetPx: MIN_TARGET_PX, results }, null, 2));
} else {
  const order = { overflow: 0, fix: 1, error: 2, check: 3, ok: 4 };
  results.sort((a, b) => order[a.verdict] - order[b.verdict] || a.id.localeCompare(b.id));
  console.log(`\nScale ${scale}: game viewport ${VIEW_W}x${VIEW_H}, sizes as seen on a 1080p screen. Text under ${MIN_TEXT_PX}px, targets under ${MIN_TARGET_PX}px.`);
  console.log("verdict  game                             smallest text  small text  smallest target  small targets  canvas  off-screen");
  for (const r of results) {
    if (r.error) { console.log(`error    ${r.id.padEnd(32)} ${r.error}`); continue; }
    const share = r.chars ? `${Math.round((100 * r.smallChars) / r.chars)}%` : "-";
    console.log(`${r.verdict.padEnd(8)} ${r.id.padEnd(32)} ${tv(r.minFont).padEnd(14)} ${share.padEnd(11)} ${tv(r.minTarget).padEnd(16)} ${`${r.smallTargets}/${r.targets}`.padEnd(14)} ${`${Math.round(r.canvasCover * 100)}%`.padEnd(7)} ${r.scrolls ? "scrolls " : ""}${r.clipped || ""}`);
  }
  const count = (v) => results.filter((r) => r.verdict === v).length;
  console.log(`\noverflow ${count("overflow")}, fix ${count("fix")}, check ${count("check")}, ok ${count("ok")}, error ${count("error")}. Screenshots: ${outDir}`);
}
