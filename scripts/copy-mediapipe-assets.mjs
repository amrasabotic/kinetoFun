// Copies the MediaPipe Tasks Vision WASM runtime from node_modules into
// public/, so TV screens load hand tracking from our own origin instead of a
// third-party CDN.
//
// The files are ~33 MB and fully determined by the pinned package version, so
// they are generated on every dev/build run and never committed. The output
// folder carries the version so the files can be cached as immutable: an
// upgrade lands at a new URL instead of fighting a stale cache on a TV.
//
// The hand model (public/mediapipe/models/*.task) is not in the npm package
// and is committed alongside the code instead.

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@mediapipe", "tasks-vision");

if (!existsSync(pkgDir)) {
  console.error("[mediapipe] @mediapipe/tasks-vision is not installed; run npm install.");
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const target = join(root, "public", "mediapipe", `tasks-vision-${version}`, "wasm");

if (existsSync(join(target, "vision_wasm_internal.wasm"))) {
  console.log(`[mediapipe] WASM ${version} already in place.`);
} else {
  rmSync(target, { recursive: true, force: true });
  cpSync(join(pkgDir, "wasm"), target, { recursive: true });
  console.log(`[mediapipe] Copied WASM ${version} to public/mediapipe/tasks-vision-${version}/wasm.`);
}

// ES bundle for games that import the library at runtime, wrapped like patch-game-builds.js does.
const TAP_RE = /(\w+)\.prototype\.(detectForVideo|recognizeForVideo)=\1\.prototype\.(\w+)/g;
const bundle = readFileSync(join(pkgDir, "vision_bundle.mjs"), "utf8").replace(
  TAP_RE,
  (_m, cls, method, impl) =>
    `${cls}.prototype.${method}=function(...a){const r=globalThis.__kfDetect?globalThis.__kfDetect(this,a,()=>${cls}.prototype.${impl}.apply(this,a)):${cls}.prototype.${impl}.apply(this,a);globalThis.__kfTap&&globalThis.__kfTap(r);return r}`,
);
writeFileSync(join(root, "public", "mediapipe", `tasks-vision-${version}`, "vision_bundle.mjs"), bundle);
console.log(`[mediapipe] Wrote hand-reporting bundle ${version}.`);
