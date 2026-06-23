#!/usr/bin/env node
/**
 * Build all games and copy their output into public/games/[name]/.
 *
 * Game types detected automatically:
 *   PLAIN_HTML — no package.json, just static files → copied as-is
 *   VITE       — package.json with "vite" dep       → builds dist/ → public/games/[name]/
 *   NEXT       — package.json with "next" dep        → builds out/  → public/games/[name]/out/
 *
 * Usage:
 *   node scripts/build-games.js           (builds all games)
 *   node scripts/build-games.js dino-runner balloon-pop-adventure  (specific games)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAMES_SRC = path.join(ROOT, 'games');
const GAMES_OUT = path.join(ROOT, 'public', 'games');

function detectType(gameDir) {
  const pkgPath = path.join(gameDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'PLAIN_HTML';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['vite']) return 'VITE';
  if (deps['next']) return 'NEXT';
  return 'PLAIN_HTML';
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function run(cmd, cwd) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

function buildGame(name) {
  const gameDir = path.join(GAMES_SRC, name);
  if (!fs.existsSync(gameDir)) {
    console.error(`  ✗ Folder not found: ${gameDir}`);
    return false;
  }

  const type = detectType(gameDir);
  console.log(`\n▶ ${name} [${type}]`);

  try {
    if (type === 'PLAIN_HTML') {
      const dest = path.join(GAMES_OUT, name);
      fs.rmSync(dest, { recursive: true, force: true });
      copyDir(gameDir, dest);
      console.log(`  ✓ Copied to public/games/${name}/`);

    } else if (type === 'VITE') {
      run('npm install --prefer-offline', gameDir);
      run('npm run build', gameDir);
      const distDir = path.join(gameDir, 'dist');
      const dest = path.join(GAMES_OUT, name);
      fs.rmSync(dest, { recursive: true, force: true });
      copyDir(distDir, dest);
      console.log(`  ✓ Built → public/games/${name}/`);

    } else if (type === 'NEXT') {
      run('npm install --prefer-offline', gameDir);
      run('npm run build', gameDir);
      const outDir = path.join(gameDir, 'out');
      if (!fs.existsSync(outDir)) {
        console.error(`  ✗ No out/ directory found — is output: 'export' set in next.config?`);
        return false;
      }
      // Next.js games use basePath /games/[name]/out, so copy out/ into that sub-path
      const dest = path.join(GAMES_OUT, name, 'out');
      fs.rmSync(dest, { recursive: true, force: true });
      copyDir(outDir, dest);
      console.log(`  ✓ Built → public/games/${name}/out/`);
    }
    return true;
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    return false;
  }
}

// Determine which games to build
const allGames = fs.readdirSync(GAMES_SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const requested = process.argv.slice(2);
const targets = requested.length > 0 ? requested : allGames;

console.log(`\nBuilding ${targets.length} game(s) into public/games/…\n`);
fs.mkdirSync(GAMES_OUT, { recursive: true });

let passed = 0;
let failed = 0;
for (const name of targets) {
  if (buildGame(name)) passed++; else failed++;
}

console.log(`\n${'─'.repeat(40)}`);
console.log(`Done: ${passed} built, ${failed} failed`);
if (failed > 0) process.exit(1);
