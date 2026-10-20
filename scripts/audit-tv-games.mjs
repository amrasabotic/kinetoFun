// Reports how ready each game in games/ is for the TV (no mouse, exit by hand).
// Usage: node scripts/audit-tv-games.mjs [--json] [name ...]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gamesDir = join(root, "games");
const SKIP_DIRS = new Set(["node_modules", "dist", "out", ".next", "build", ".vite", "coverage"]);
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".vue", ".svelte"]);

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const only = new Set(args.filter((a) => !a.startsWith("--")));

const registry = readFileSync(join(root, "src", "games", "registry.ts"), "utf8");
const registered = new Set([...registry.matchAll(/folder:\s*'([^']+)'/g)].map((m) => m[1]));

function sourceFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...sourceFiles(full));
    else if (SOURCE_EXT.has(extname(name)) && !name.endsWith(".d.ts") && stat.size < 2_000_000) files.push(full);
  }
  return files;
}

function framework(dir) {
  if (["vite.config.ts", "vite.config.js", "vite.config.mjs"].some((f) => existsSync(join(dir, f)))) return "vite";
  if (["next.config.js", "next.config.ts", "next.config.mjs"].some((f) => existsSync(join(dir, f)))) return "next";
  return "html";
}

function mediapipeSource(text) {
  if (text.includes("/mediapipe/tasks-vision-")) return "self-hosted";
  if (/cdn\.jsdelivr\.net\/npm\/@mediapipe\/tasks-vision/.test(text)) return "cdn tasks-vision";
  if (/@mediapipe\/(hands|pose|camera_utils)/.test(text)) return "cdn legacy";
  if (text.includes("@mediapipe/tasks-vision")) return "npm tasks-vision";
  return "none";
}

// How a player can leave by hand: GAME_EXIT, or an exit/quit function that reports GAME_COMPLETE.
function exitPath(text) {
  if (text.includes("GAME_EXIT")) return "GAME_EXIT";
  const viaComplete = /(?:function\s+|const\s+)\w*(?:exit|quit|leave)\w*[^{]*\{[\s\S]{0,400}?GAME_COMPLETE/i;
  return viaComplete.test(text) ? "exit via GAME_COMPLETE" : "none";
}

const rows = [];
for (const name of readdirSync(gamesDir).sort()) {
  const dir = join(gamesDir, name);
  if (!statSync(dir).isDirectory() || (only.size && !only.has(name))) continue;
  const text = sourceFiles(dir).map((f) => readFileSync(f, "utf8")).join("\n");
  rows.push({
    game: name,
    registered: registered.has(name),
    framework: framework(dir),
    complete: text.includes("GAME_COMPLETE"),
    exit: exitPath(text),
    dwell: /dwell/i.test(text),
    clickHandlers: (text.match(/onClick=|addEventListener\(\s*['"]click['"]/g) ?? []).length,
    mediapipe: mediapipeSource(text),
  });
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const mark = (b) => (b ? "yes" : "-");
  console.log("| game | registered | framework | GAME_COMPLETE | exit by hand | dwell | click handlers | MediaPipe |");
  console.log("|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    console.log(`| ${r.game} | ${mark(r.registered)} | ${r.framework} | ${mark(r.complete)} | ${r.exit} | ${mark(r.dwell)} | ${r.clickHandlers} | ${r.mediapipe} |`);
  }
  const count = (key) => rows.filter((r) => r[key]).length;
  console.log(`\n${rows.length} games · registered ${count("registered")} · GAME_COMPLETE ${count("complete")} · exit by hand ${rows.filter((r) => r.exit !== "none").length} · dwell ${count("dwell")}`);
}
