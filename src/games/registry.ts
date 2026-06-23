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
  /** Subfolder name under src/app/(app)/games/games/ and public/games/ */
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
  'cooking-chef':    { folder: 'cooking-chef',    indexPath: '/games/cooking-chef/out/index.html' },
  'world-explorer':  { folder: 'world-explorer',  indexPath: '/games/world-explorer/out/index.html' },

  // ── Vite games (dist/ copied to public/games/[name]/) ────────────────────
  'balloon-pop-adventure': { folder: 'balloon-pop-adventure', indexPath: '/games/balloon-pop-adventure/index.html' },
  'gesture-chef':          { folder: 'gesture-chef',          indexPath: '/games/gesture-chef/index.html' },

  // ── Plain HTML games (folder copied as-is to public/games/[name]/) ───────
  'color-artist-gesture-quest': { folder: 'color-artist-gesture-quest', indexPath: '/games/color-artist-gesture-quest/index.html' },
  'dance-freeze':               { folder: 'dance-freeze',               indexPath: '/games/dance-freeze/index.html' },
  'gesture-math-adventure':     { folder: 'gesture-math-adventure',     indexPath: '/games/gesture-math-adventure/index.html' },
  'gesture-road-builder':       { folder: 'gesture-road-builder',       indexPath: '/games/gesture-road-builder/index.html' },
  'goalkeeper-hero':            { folder: 'goalkeeper-hero',            indexPath: '/games/goalkeeper-hero/index.html' },
  'language-adventure':         { folder: 'language-adventure',         indexPath: '/games/language-adventure/index.html' },
  'monster-dodge':              { folder: 'monster-dodge',              indexPath: '/games/monster-dodge/index.html' },
};

/** Returns the registry entry for a game, or null if it is not yet registered. */
export function getGameEntry(gameId: string): GameEntry | null {
  return GAME_REGISTRY[gameId] ?? null;
}
