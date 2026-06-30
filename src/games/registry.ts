/**
 * Maps each Supabase game `id` (the slug primary key) to its static-build
 * location under public/games/.
 *
 * IMPORTANT: The key must exactly match the `id` column in Supabase's `games`
 * table. If a game's folder name differs from its DB id, adjust the key here.
 *
 * A game present in this registry is assumed to have been built with
 * `npm run build:games [name]` before deployment. Unbuilt games will show
 * a blank iframe — run the build step first.
 */

export type GameEntry = {
  /** Subfolder name under games/ and public/games/ */
  folder: string;
  /** URL to the index.html served from public/games/ */
  indexPath: string;
};

export const GAME_REGISTRY: Record<string, GameEntry> = {
  // ── Next.js games (output: 'export' → out/ copied to public/games/[name]/out/) ──
  'dino-runner':     { folder: 'dino-runner',     indexPath: '/games/dino-runner/out/index.html' },
  'mouth-open-catch':{ folder: 'mouth-open-catch', indexPath: '/games/mouth-open-catch/out/index.html' },
  'happy-glass':     { folder: 'happy-glass',     indexPath: '/games/happy-glass/out/index.html' },
  'gesture-runner':  { folder: 'gesture-runner',  indexPath: '/games/gesture-runner/out/index.html' },
  'world-explorer':  { folder: 'world-explorer',  indexPath: '/games/world-explorer/out/index.html' },

  'cooking-chef':          { folder: 'cooking-chef',          indexPath: '/games/cooking-chef/out/index.html' },

  // ── Vite games (dist/ copied to public/games/[name]/) ────────────────────
  'gesture-tetris':        { folder: 'gesture-tetris',        indexPath: '/games/gesture-tetris/index.html' },
  'gesture-piano':         { folder: 'gesture-piano',         indexPath: '/games/gesture-piano/index.html' },
  'gesture-volleyball':    { folder: 'gesture-volleyball',    indexPath: '/games/gesture-volleyball/index.html' },
  'gesture-basketball':    { folder: 'gesture-basketball',    indexPath: '/games/gesture-basketball/index.html' },
  'gesture-love-balls':   { folder: 'gesture-love-balls',   indexPath: '/games/gesture-love-balls/index.html' },
  'the-sniper-code':       { folder: 'the-sniper-code',       indexPath: '/games/the-sniper-code/index.html' },
  'spear-stickman':        { folder: 'spear-stickman',        indexPath: '/games/spear-stickman/index.html' },
  'gesture-hill-adventure':{ folder: 'gesture-hill-adventure', indexPath: '/games/gesture-hill-adventure/index.html' },
  'gesture-snake-arena':   { folder: 'gesture-snake-arena',   indexPath: '/games/gesture-snake-arena/index.html' },
  'gesture-table-tennis':  { folder: 'gesture-table-tennis',  indexPath: '/games/gesture-table-tennis/index.html' },
  'connect-2-balls':       { folder: 'connect-2-balls',       indexPath: '/games/connect-2-balls/index.html' },
  'kingdom-clash':         { folder: 'kingdom-clash',         indexPath: '/games/kingdom-clash/index.html' },
  'gesture-drums':         { folder: 'gesture-drums',         indexPath: '/games/gesture-drums/index.html' },
  'slingshot-bird':        { folder: 'slingshot-bird',        indexPath: '/games/slingshot-bird/index.html' },
  'simon-says-hands':      { folder: 'simon-says-hands',      indexPath: '/games/simon-says-hands/index.html' },
  'traffic-controller':    { folder: 'traffic-controller',    indexPath: '/games/traffic-controller/index.html' },
  'bubble-shooter':        { folder: 'bubble-shooter',        indexPath: '/games/bubble-shooter/index.html' },
  'balloon-pop-adventure': { folder: 'balloon-pop-adventure', indexPath: '/games/balloon-pop-adventure/index.html' },
  'gesture-chef':          { folder: 'gesture-chef',          indexPath: '/games/gesture-chef/index.html' },
  'gesture-pong':          { folder: 'gesture-pong',          indexPath: '/games/gesture-pong/index.html' },
  'pizza-maker':           { folder: 'pizza-maker',           indexPath: '/games/pizza-maker/index.html' },
  'flags-game':            { folder: 'flags-game',            indexPath: '/games/flags-game/index.html' },
  'green-red-light':       { folder: 'green-red-light',       indexPath: '/games/green-red-light/index.html' },
  'mirror-me':             { folder: 'mirror-me',             indexPath: '/games/mirror-me/index.html' },
  'shield-hero':           { folder: 'shield-hero',           indexPath: '/games/shield-hero/index.html' },
  'block-breaker':         { folder: 'block-breaker',         indexPath: '/games/block-breaker/index.html' },
  'crossword-builder':     { folder: 'crossword-builder',     indexPath: '/games/crossword-builder/index.html' },
  'gesture-air-hockey':    { folder: 'gesture-air-hockey',    indexPath: '/games/gesture-air-hockey/index.html' },
  'mix-it-up':             { folder: 'mix-it-up',             indexPath: '/games/mix-it-up/index.html' },
  'neon-flow':             { folder: 'neon-flow',             indexPath: '/games/neon-flow/index.html' },
  'samurai-slice':         { folder: 'samurai-slice',         indexPath: '/games/samurai-slice/index.html' },
  'target-master':         { folder: 'target-master',         indexPath: '/games/target-master/index.html' },
  'word-adventure':        { folder: 'word-adventure',        indexPath: '/games/word-adventure/index.html' },

  // ── Plain HTML games (folder copied as-is to public/games/[name]/) ───────
  'color-artist-gesture-quest': { folder: 'color-artist-gesture-quest', indexPath: '/games/color-artist-gesture-quest/index.html' },
  'dance-freeze':               { folder: 'dance-freeze',               indexPath: '/games/dance-freeze/index.html' },
  'gesture-math-adventure':     { folder: 'gesture-math-adventure',     indexPath: '/games/gesture-math-adventure/index.html' },
  'gesture-road-builder':       { folder: 'gesture-road-builder',       indexPath: '/games/gesture-road-builder/index.html' },
  'goalkeeper-hero':            { folder: 'goalkeeper-hero',            indexPath: '/games/goalkeeper-hero/index.html' },
  'language-adventure':         { folder: 'language-adventure',         indexPath: '/games/language-adventure/index.html' },
  'monster-dodge':              { folder: 'monster-dodge',              indexPath: '/games/monster-dodge/index.html' },

  // ── New plain HTML games ──────────────────────────────────────────────────
  'air-coloring-book':      { folder: 'air-coloring-book',      indexPath: '/games/air-coloring-book/index.html' },
  'air-painting':           { folder: 'air-painting',           indexPath: '/games/air-painting/index.html' },
  'block-blast-gesture':    { folder: 'block-blast-gesture',    indexPath: '/games/block-blast-gesture/index.html' },
  'block-blast-gestures':   { folder: 'block-blast-gestures',   indexPath: '/games/block-blast-gestures/index.html' },
  'butterfly-catch':        { folder: 'butterfly-catch',        indexPath: '/games/butterfly-catch/index.html' },
  'catch-the-falling-stars':{ folder: 'catch-the-falling-stars',indexPath: '/games/catch-the-falling-stars/index.html' },
  'cookie-monster-game':    { folder: 'cookie-monster-game',    indexPath: '/games/cookie-monster-game/index.html' },
  'fish-catcher':           { folder: 'fish-catcher',           indexPath: '/games/fish-catcher/index.html' },
  'funny-face-contest':     { folder: 'funny-face-contest',     indexPath: '/games/funny-face-contest/index.html' },
  'gesture-ludo-king':      { folder: 'gesture-ludo-king',      indexPath: '/games/gesture-ludo-king/index.html' },
  'gesture-pop':            { folder: 'gesture-pop',            indexPath: '/games/gesture-pop/index.html' },
  'gesture-space-shooter':  { folder: 'gesture-space-shooter',  indexPath: '/games/gesture-space-shooter/index.html' },
  'gesture-brickbreaker':   { folder: 'gesture-brickbreaker',   indexPath: '/games/gesture-brickbreaker/index.html' },
  'gesture-dash-v2':        { folder: 'gesture-dash-v2',        indexPath: '/games/gesture-dash-v2/index.html' },
  'gesture-mario':          { folder: 'gesture-mario',          indexPath: '/games/gesture-mario/index.html' },
  'gesture-racer-v4':       { folder: 'gesture-racer-v4',       indexPath: '/games/gesture-racer-v4/index.html' },
  'hand-snake-pro':         { folder: 'hand-snake-pro',         indexPath: '/games/hand-snake-pro/index.html' },
  'handcell-game':          { folder: 'handcell-game',          indexPath: '/games/handcell-game/index.html' },
  'knife-hit-gesture':      { folder: 'knife-hit-gesture',      indexPath: '/games/knife-hit-gesture/index.html' },
  'magic-cleaning':         { folder: 'magic-cleaning',         indexPath: '/games/magic-cleaning/index.html' },
  'ninja-star-throw':       { folder: 'ninja-star-throw',       indexPath: '/games/ninja-star-throw/index.html' },
  'penalty-shooter':        { folder: 'penalty-shooter',        indexPath: '/games/penalty-shooter/index.html' },
  'rock-paper-scissors':    { folder: 'rock-paper-scissors',    indexPath: '/games/rock-paper-scissors/index.html' },
  'space-defender':         { folder: 'space-defender',         indexPath: '/games/space-defender/index.html' },
  'whack-a-mole-hand':      { folder: 'whack-a-mole-hand',      indexPath: '/games/whack-a-mole-hand/index.html' },
  'wizard-academy':         { folder: 'wizard-academy',         indexPath: '/games/wizard-academy/index.html' },
  'tic-tac-toe':            { folder: 'tic-tac-toe',            indexPath: '/games/tic-tac-toe/index.html' },
  'air-hockey':             { folder: 'air-hockey',             indexPath: '/games/air-hockey/index.html' },
  'connect-4':              { folder: 'connect-4',              indexPath: '/games/connect-4/index.html' },
  'gesture-word':           { folder: 'gesture-word',           indexPath: '/games/gesture-word/index.html' },
};

/** Returns the registry entry for a game, or null if it is not yet registered. */
export function getGameEntry(gameId: string): GameEntry | null {
  return GAME_REGISTRY[gameId] ?? null;
}
