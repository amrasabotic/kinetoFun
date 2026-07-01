# KinetoFun — Project Context

> **SINGLE SOURCE OF TRUTH.** Read this before making any change. Update it after every feature completion.
> Last updated: 2026-07-01 (Flag Quest: World Colors — ADR-034)
>
> ⚠️ **Pending DB migration:** ADR-022 requires `supabase/migrations/0004_categories_games_audit.sql` to be run in Supabase. Until it is, the app errors (public `listGames` filters `status='published'`, which doesn't exist pre-migration).

---

## What KinetoFun Is

KinetoFun is a **gesture-based gaming platform for TV**. It runs initially as a **web-first** system and will later add hardware (Raspberry Pi + camera + MediaPipe gesture tracking) as an input layer.

Users will be able to:
- Connect to KinetoFun from a TV (web interface)
- Navigate using keyboard/mouse initially (gesture input comes later)
- Browse and launch games
- Play multiplayer or single-player games
- Save scores and track progress
- Use a future gesture-based input system (MediaPipe + Raspberry Pi)
- Optionally purchase access (paywall system, later)

---

## Current System Architecture

- **Frontend:** Next.js 16.2.7 (App Router) + React 19, TypeScript 5, Tailwind CSS v4, ESLint 9. `src/` dir, `@/*` import alias. (web-first, TV-oriented UI)
- **Backend:** Custom Next.js Route Handlers (`/api/auth/*`) + **Supabase PostgreSQL — LIVE** (database only, **no Supabase Auth**) via the `@supabase/supabase-js` client (`src/lib/supabase/server.ts`, service-role, server-only) behind a swappable repository. Falls back to a local file store only if env is unset. Full schema in `supabase/schema.sql`.
- **⚠️ Runtime needs the system CA:** this machine intercepts TLS, so Node must run with `--use-system-ca` to reach Supabase. Baked into the `dev`/`build`/`start` npm scripts via `cross-env` (ADR-007/ADR-014). Credentials live in `.env.local` (git-ignored).
- **Auth:** **Custom JWT auth — implemented + hardened.** scrypt-hashed passwords, HS256 JWT (via `jose`) in an httpOnly cookie, `proxy.ts` route protection, server-side DAL. **Hardened (ADR-019):** rate limiting on `/api/auth/*` and revocable sessions (`sid` claim + `auth_sessions` rows checked in the DAL; logout + "sign out everywhere" truly invalidate). See ADR-013 + ADR-019.
- **⚠️ Next.js 16 conventions (this is a customized v16):** `middleware.ts` → **`proxy.ts`** (function `proxy`, Node.js runtime only); `cookies()`/`params`/`searchParams` are **async**; Turbopack is the default. Always read `node_modules/next/dist/docs/` before writing framework code (per AGENTS.md).
- **Input (current):** Keyboard / mouse
- **Input (future):** Raspberry Pi + camera + MediaPipe hand tracking
- **Runtime:** Node v24.16.0
- **VCS:** Git initialized — `main` (stable, tracking files only) and `dev` (active, scaffold). Currently on `dev`.

> Phase 1 frontend is complete: a full TV-style gaming portal UI driven entirely by mock data. `npm run build` passes; all routes return 200.

---

## Completed Features

- **[2026-07-01] Flag Quest: World Colors (ADR-034).** Original gesture-only educational flag-painting game inspired by "Flag Paint: World Tour" (core loop only — all assets, code, art, and branding original). Player hovers a fingertip over a paint swatch (500ms dwell) to select a color, then holds their fingertip inside the matching outlined flag region to gradually fill it via SVG-polygon point-in-polygon hit-testing (smart region-fill, not freehand tracing); a wrong region flashes red with a small score penalty after a 0.28s wrong-color dwell (forgiving, not an instant fail). 31 flags across all 6 continents, all geometry procedurally generated from primitive-shape generators (`flags/shapes.ts`: stripes/canton/offset-cross/circle/saltire/star/diamond/thick-line) — no traced or copied flag art; a handful of bespoke flags (South Africa, UK, Jamaica, Brazil) are hand-composed from the same primitives as tiled, edge-sharing polygons so no region is ever unreachable. Difficulty (easy→expert) driven by each flag's real color/region count. Combo multiplier to ×10, bronze/silver/gold/perfect medals from a time-ratio, 1–3 stars from accuracy/mistakes gate continent/country unlocks (Zustand `persist` → localStorage). Modes: World Tour (continent map → country grid), Practice (any unlocked flag, unlimited time, hints, no score), Endless (infinite, difficulty ramps with round via a sliding window over a difficulty-sorted flag list, local best score). Gallery (capital/population/language/independence/fun fact per flag) and Settings (gesture-only sliders + colorblind/high-contrast/larger-cursor/slower-painting/mirror/narration toggles) round out the menu, plus 8 local achievements. **Menus are gesture-only:** every button is a reusable `HoverButton` (700ms dwell, `ProgressRing` + glow + confirm chime), sliders (`GestureSlider`) follow the fingertip live while hovering the track since there's no drag gesture. Open-palm (650ms) pauses, fist (650ms) resumes — same convention as Maze Muncher (ADR-033). A single shared `GestureProvider` context owns the one MediaPipe `HandLandmarker`/camera session for the whole app and exposes both a re-render-driving `frame` state (menus) and a same-data `frameRef` (60fps in-game painting RAF loop, paint engine writes fill progress straight to SVG `fill-opacity` via refs rather than React state to avoid per-frame re-renders across many regions). 5-step guided calibration; auto-pausing "Hand Lost" overlay; canvas particle system (splash/sparkle/confetti); Web Audio-synthesized SFX + ambient pad, no binary audio/image assets. Score posted via `postMessage → GAME_COMPLETE` on session exit — reuses the existing generic `public.scores` table (game_id FK), no new DB table needed. Vite + React + TS + Tailwind + Framer Motion + Zustand; `tsc --noEmit` + `vite build` clean; dist served from `public/games/flag-quest/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_flag_quest.sql` (Puzzle, published, featured). No camera available in this build environment, so gesture/dwell timing/paint-fill feel could not be exercised live — verify in a browser with a webcam before shipping. (ADR-034)
- **[2026-07-01] Maze Muncher: Gesture Edition (ADR-033).** Original gesture-only maze-chase arcade game — no mouse, keyboard, or touch anywhere, including menus. Player moves through a neon maze by holding a hand in an up/down/left/right zone around a calibratable center (smoothed, dead-zoned); turns commit only when the maze geometry allows them (wall-gated, with buffered desired-direction so an early turn auto-executes at the next valid opening) — no separate "intersection" bookkeeping needed. 10 procedurally generated neon sectors (`MazeGenerator.ts`: seeded recursive-backtracker + loop-carving for Pac-Man-style cycles/shortcuts, a classic warp tunnel, dead-end power-orb placement via BFS distance from the enemy base), each with a distinct color theme. 4 original AI hunter types (`EnemyAI.ts`): Chaser Drone (BFS shortest path to player), Ambush Bot (BFS to a predicted cell N tiles ahead along the player's heading), Patrol Sentinel (deterministic right-hand wall-follower — no precomputed route needed), Rogue Hunter (random open direction, 35% chance biased toward the player). Power orbs trigger 8s frightened mode (enemies flee, flash near expiry, are "eaten" and BFS home to respawn); scoring: orb 10 / power orb 50 / gem 100 / enemy defeat 200×chain / treasure 500, with a streak-based combo multiplier (×2/×3/×5). Gems + a rare treasure spawn at random open cells and expire after a few seconds. Difficulty ramps: 2 enemies (L1) → 3 (L2) → 4 (L3+), then enemy speed/aggression climb and mazes cycle through all 10 sectors repeating with added difficulty. **Menus are gesture-only:** hover any button 1.2s to auto-select (`GestureDetector.tsx`, same dwell pattern as ADR-025–032, reusing the one shared MediaPipe hand instance for both gameplay and menu-cursor so the camera is never opened twice); **pose gestures** (open palm 700ms = pause, fist 700ms = resume, thumbs-up 700ms = confirm/continue, victory-sign 700ms = restart) approximated from the 21 hand landmarks (`useMediaPipe.ts`) via tip-vs-PIP curl detection. Full HUD (score/high score/level/lives/combo/power-mode countdown ring/orbs remaining/FPS/tracking status/pause-hold ring). Accessibility: gesture sensitivity/smoothing/dead-zone steppers, one-tap camera calibration (2s capture window), high-contrast/colorblind/large-UI/left-handed/FPS toggles, all localStorage-persisted (`utils/storage.ts`). Web Audio synthesis only, no binary assets (`game/audio.ts`). Score posted via `postMessage → GAME_COMPLETE`. Vite + React + TS + Tailwind; dist served from `public/games/maze-muncher/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_maze_muncher.sql` (Action, published, featured). Verified with a headless-Chromium smoke test (dev server + Playwright): menu renders, no console errors, gameplay screen renders maze/enemies/orbs/HUD correctly. (ADR-033)

- **[2026-06-30] Gesture Snake Arena (ADR-032).** Original gesture-controlled snake arena game. Player steers a growing cartoon snake in a 6000×6000 arena using hand position (direction) and hand distance from center (speed, fully analog). Closed fist → speed boost (drains length, 2s cooldown, glowing trail). 20 AI snakes with 5 distinct behaviors (collector/hunter/defender/opportunist/wanderer). 300 energy orbs (5 tiers: blue/green/purple/gold/rainbow) + 8 power-ups (shield/magnet/double_score/ghost/freeze/giant_energy). Smooth camera with look-ahead + adaptive zoom. Object-pooled particle system (3000 slots): explosions, pickups, boost trails, combos, ambients. Spatial grid collision detection. Combo ×1→×10 with floating score texts. Quest system (3 random per game, 6 quest types). 11 skins + 7 accessories + 7 trails — coin-unlocked cosmetics. 8 themed environments (forest/desert/ice/volcano/candy/space/ocean/cyber). Live HUD (score/length/combo/boost/quests/leaderboard/minimap). Web Audio generative music + SFX. Stats/settings/skins/howtoplay menus. Score posted via `postMessage → GAME_COMPLETE`. Vite + React + TS + Tailwind + Zustand + Framer Motion; dist at `public/games/gesture-snake-arena/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_gesture_snake_arena.sql`. (ADR-032)
- **[2026-06-29] Spear Stickman game (ADR-030).** Gesture-only arcade survival game inspired by *The Spear Stickman* (core loop captured, not cloned; cartoon, gore-free). A bottom-left stickman defender throws arcing spears at escalating waves of enemies that spawn from the right and on procedurally-placed platforms across six hand-drawn arenas (forest/castle/desert/mountain/volcano/night-village, cycling every 3 waves). **Gestures:** hand (palm centre `lm[9]`, stable across open/fist) aims with a live trajectory-arc preview; **make a fist to charge** a power meter and **open to release** a strong throw, **pinch** for a fast light throw (selectable Fist/Pinch/Both), **swipe** to dodge (brief invuln). Headshots one-shot non-bosses and score double; 7 enemy kinds (grunt, runner, heavy=2 hits, archer=ranged, shield=block frontal body→headshot only, jumper=airborne bonus, ninja=teleports) telegraph a wind-up before lobbing spears at the player; **giant boss every 5th wave** (HP bar + barrages). Power-ups (triple/pierce/explosive/slow-mo/shield/rapid + heart) drop and home to the player. Combo 1×→10× (reset on damage); coins unlock 10 cosmetic spear skins; achievements + per-mode high scores saved to localStorage. **4 modes:** Endless (primary), Time Attack (3 min), One Life, Headshots Only. All menus + pause are dwell-to-select; settings (sensitivity, smoothing, throw mode, sound, left-handed, high-contrast, aim-assist). Score posted via `postMessage → GAME_COMPLETE`. Vite + React + TS + Tailwind; dist served from `public/games/spear-stickman/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_spear_stickman.sql` (Action, published, featured). **Deferred:** Chaos/Rapid-Fire/Daily modes, freeze/lightning/magnet/crit power-ups, destructible/moving platforms, larger arena/weapon breadth. (ADR-030)
- **[2026-06-29] The Sniper Code game (ADR-029).** Gesture-only sniper game (softened/family-friendly, gore-free). Full-screen circular scope view with the crosshair fixed at centre; the hand pans the world beneath it (sensitivity + smoothing from settings) with breathing sway that scales with zoom. Gestures: **pinch** (thumb↔index, held + cooldown, edge-triggered) = fire (hitscan at crosshair + recoil/shake/muzzle-flash/tracer); **open palm** held = cycle 2×/4×/8× zoom; **hold still** = STEADY AIM (reduced sway, clearer view, score multiplier). 14-mission campaign across 6 procedurally-drawn canvas environments (downtown/park/harbor/station/construction/rooftop) covering mission types eliminate, civilian-avoidance, multi-target (incl. ordered), escape-runner, moving-lead, and VIP-protection, ramping via night/fog/crosswind (bullet drift)/decoys/limited-ammo/tighter-timers. Head (+200) / body (+100) hit-zones, miss (−25), protected-hit (civilian/VIP/decoy/hostage) = instant fail; 1×→5× combo; per-mission 1–3 stars with end bonuses (time/ammo/steady/perfect). Endless bonus mode = escalating waves for score-attack. All menus + in-game pause are dwell-to-select (`DwellLayer`/`data-hud-id`); accessibility incl. high-contrast markers + optional aim-assist + left-handed HUD. Settings, stars/unlocks, best + endless-high saved to localStorage. Score posted via `postMessage → GAME_COMPLETE`. Vite + React + TS + Tailwind; dist built and served from `public/games/the-sniper-code/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_the_sniper_code.sql` (Action, published, featured). **Deferred (per ADR-029):** Time-Attack/Accuracy/Daily modes, power-ups, thermal scope, full 15-environment breadth. (ADR-029)
- **[2026-06-26] Gesture Basketball game (ADR-028).** Free-throw shooter: 10 shots per game, 10 pts each. Two-axis gesture control — wrist X maps to arc angle (30°–80°, center=55° ideal), and an automatically oscillating power meter (sin wave) controls launch speed. Edge-triggered raise (wrist Y < 0.28) fires the shot with current aim + power; both must be correct to score. Ball follows realistic parabolic arc with gravity; backboard bounce creates bank-shot opportunities. Three difficulty levels (Easy 50px zone 4s period / Normal 33px 2.6s / Hard 18px 1.8s). Green "sweet zone" overlay on power meter as visual hint. Result flash text ("Swish!" / "Bank Shot!" / "Miss!"). Web Audio SFX (shoot swoosh, swish chord, bank thud+score, rim clank, air ball, game-over fanfare). Score posted via `postMessage → GAME_COMPLETE` on game end. Vite + React + Tailwind; dist built and served from `public/games/gesture-basketball/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_gesture_basketball.sql`. (ADR-028)
- **[2026-06-25] Gesture Volleyball game (ADR-027).** 2D side-view beach volleyball vs AI opponent. Two-hand gesture control: hand X position moves the player, raising one hand above the forehead triggers an edge-triggered smash hit (fast + flat), spreading both hands wide activates a block stance that deflects the ball back. AI opponent with three difficulty levels (Easy: slow/misses sometimes, Normal: moderate, Hard: fast/aggressive smashes). First to 7 points wins. Court physics: gravity, net collision, wall bounce. All menus gesture-controlled via dwell-to-select (same MenuGestureLayer/GestureBtn pattern). Web Audio SFX (hit, smash, block, AI hit/smash, serve, point scored/lost, game over). Score posted via `postMessage → GAME_COMPLETE` on match end. Vite + React + Tailwind; dist built and served from `public/games/gesture-volleyball/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_gesture_volleyball.sql`. (ADR-027)
- **[2026-06-25] Gesture Tetris game (ADR-026).** Classic Tetris fully controlled by hand gestures. 10×20 board, all 7 tetrominoes with 7-bag randomiser, SRS wall-kicks, ghost piece, NES-curve fall speed. Three gestures: tilt wrist left/right (midMCP–wrist horizontal offset) to move, raise wrist above frame-top 30 % to rotate (edge-triggered), lower wrist below frame-bottom 72 % for 8× soft-drop. Three difficulty levels (Easy lv1 / Normal lv3 / Hard lv6). All menus dwell-to-select (same MenuGestureLayer/GestureBtn pattern as gesture-piano). Web Audio SFX (move, rotate, lock, line-clear arp, tetris fanfare, level-up, game-over). Score posted via `postMessage → GAME_COMPLETE` on game-over. Vite + React + Tailwind; dist built and served from `public/games/gesture-tetris/`. Registered in `src/games/registry.ts`. DB seed: `supabase/seed_gesture_tetris.sql`. (ADR-026)
- **[2026-06-25] Gesture Piano game (ADR-025).** Guitar Hero–style piano game. 10 finger zones (C4–E5) mapped to screen columns. MediaPipe tracks all 10 fingertips; lowering a fingertip into the bottom 36 % of the camera frame "presses" the key in its X-zone. Rhythm mode: colored bars fall per-lane; hit the key on the beat for PERFECT (100 pts × combo) or GOOD (50 pts × combo). Three built-in songs: Easy (Twinkle Twinkle, 80 BPM), Medium (Ode to Joy, 100 BPM), Hard (Für Elise-inspired, 120 BPM). Free Play for open exploration. Piano tones synthesised via Web Audio API (triangle-wave + harmonics, no audio files). Vite + React + Tailwind (same stack as gesture-drums); dist built and served from `public/games/gesture-piano/`. Registered in `src/games/registry.ts`. Score posted via `postMessage → GAME_COMPLETE` on song finish (saves to `scores` table via existing `/api/scores`). DB seed: `supabase/seed_gesture_piano.sql`. (ADR-025)
- **[2026-06-19] Unified calm global background (ADR-024).** Removed the three competing background systems (animated `BalloonBackground` canvas + `DottedSurface` three.js + rainbow `body` gradient) and replaced them with **one** soft sky-blue→white `body` gradient in `globals.css` (calm deep-navy in dark mode). Deleted the two decorative component files + their layout mounts; removed the auth-page glow blobs and the landing's free-floating clouds/sun-glow/confetti (kept foreground illustrations). Background is now calm/minimal/consistent across home, dashboard, game screens, profile, auth; playfulness lives only in foreground UI. SuperAdmin console keeps its own `bg-[#F8FAFC]` (back-office, intentionally separate). Build + tsc + lint clean; `/` and `/login` → 200, no `<canvas>` remains.
- **[2026-06-19] Homepage redesign — ABCmouse-style child-learning landing (ADR-023).** Rebuilt the logged-out `/` `LandingPage` into a bright, playful, 10-section ABCmouse-inspired flow: Hero (mascot + "Try FREE for 30 Days" CTA), floating Category strip, Educational Excellence preview mockup, alternating Feature grid, Proven Results (CSS bar chart + claim chips), Learning System tiles, Tickets & Rewards, Testimonials, Feature icon strip, Final CTA. **UI/presentation only — zero logic/API/route/auth changes; the authenticated dashboard is unchanged.** Both live hooks are preserved inside the new design: `useGames()`/`selectFeatured()` → "All-New Worlds" real game cards; `useLeaderboard()` → "Star Learners" card. Palette = ABCmouse spec (`#2F80FF/#FFD84D/#FF8A3D/#5BD97B/#FF5FA2/#8A5CFF`) applied **inline/landing-scoped** (global `globals.css` theme tokens untouched). Added rounded fonts **Baloo 2 + Nunito** via a runtime `<link>` (not `next/font`, to avoid a build-time Google Fonts fetch on this TLS-intercepting machine) + scoped `.landing-root`/`.font-display` classes and playful keyframes in `globals.css`. Illustrations are CSS/SVG/emoji (only `/kid.gif` reused). Build + `tsc` + lint clean; `curl /` → 200 with new copy.
- **[2026-06-11] SuperAdmin platform expansion (ADR-022).** Evolved `/superadmin` into a scalable platform admin without touching auth or public contracts. **Migration 0004** adds a managed `categories` table (seeded from the 6 legacy enum values), `audit_logs`, and games columns (`category_id`, `status` draft/published/archived, `difficulty`, `age_group`, `short_description`, `thumbnail`, `play_count`); the legacy `games.category` enum is kept in sync. New repos: `categories-repository`, `audit-repository`, extended `games-repository` (`listAllGames`, bulk ops) + `admin-repository.getAnalytics` (rich metrics + 14-day series). New APIs under the unchanged guard: `categories`(+`[id]` w/ delete safeguards, `reorder`), `audit-logs`, `games/bulk`; **`recordAudit` (best-effort) wired into every admin write**. New pages: **Categories** (table/card, CRUD, reorder, enable/disable, icon picker, move/delete-games safeguard), **enhanced Games** (status/difficulty/age/featured/play-count, bulk actions, richer filters), **Analytics dashboard** (charts + activity feed + quick actions), **Audit Logs** (filters + detail). Sidebar: Dashboard · Users · Categories · Games · Audit Logs. Public reads now show **published-only** games. New shared UI: `superadmin/{charts,icons,audit}.tsx` + `ui.tsx` primitives (Select/SearchInput/ViewToggle/Switch/Segmented). Build clean.
- **[2026-06-08] Project foundation / scaffold.** `create-next-app@latest` (App Router, TS, Tailwind v4, ESLint, `src/`, `@/*`). Git initialized with `main`/`dev` branches; tracking files committed on `main`, scaffold on `dev`. Production build verified (`npm run build`).
- **[2026-06-08] Phase 1 — Frontend (TV portal UI).** Full mock-data UI: 9 pages, shared component library, mock session/auth, spatial (arrow-key/remote) navigation, service boundary layer. See **Frontend Architecture** below. Build + route smoke tests pass.
- **[2026-06-08] Futuristic SaaS visual re-skin.** Re-skinned the UI (design language only — no content/layout/flow changes): deep-navy canvas, **neon-green** primary accent (was violet), purple/pink ambient glow, full-page grid + radial-glow backdrop, glassmorphism panels, green/glow buttons. Driven mostly by swapping `@theme` tokens in `globals.css`. (ADR-010)
- **[2026-06-09] Homepage redesign — colorful/playful landing page.** Replaced the logged-out `/` landing page (`LandingPage` in `(app)/page.tsx`) with a full 9-section multi-section page: Hero, How It Works, Featured Games, Multiplayer, Why Kids Love It, Educational Benefits, Perfect For, Leaderboard Preview, Final CTA. Palette: `#6D5DFC` / `#00D4FF` / `#FFB800` / `#32D583`, light (#FAFBFF) and dark (#0d0e1a) alternating sections. Animations added to `globals.css` (float keyframes). Authenticated dashboard unchanged. (ADR-011)
- **[2026-06-10] Games served from Supabase.** Wired the games catalog to the live DB: `lib/data/games-repository.ts` (server, Supabase client) → `/api/games` + `/api/games/[id]` (public) → `useGames()` client hook (module-cached) + pure selectors in `games.service`. Refactored all 5 consumers (library, home landing + dashboard, leaderboard, game detail, launch) off the old sync `gamesService`/mock. Seeded 10 games (`supabase/seed_games.sql`). Build clean; verified `/api/games` returns the 10 rows from Supabase. (ADR-015)
- **[2026-06-10] Game cover images (Supabase Storage).** Optional `Game.coverImage` (maps to `cover_image` column); 4 cover sites render `next/image` when set, gradient fallback otherwise; `next.config` remote patterns; bucket `game-covers` created. Activate by uploading images + UPDATE SQL. (ADR-016)
- **[2026-06-10] Score persistence — real leaderboards + profile stats.** `scores-repository.ts` → `/api/scores` (write, auth), `/api/leaderboard` (public, global or per-game), `/api/profile/stats` (auth); `useLeaderboard`/`useProfileStats` hooks; leaderboard + profile pages off mock; manual score entry on the launch screen. (ADR-017)
- **[2026-06-10] Game-session persistence — "Continue playing".** `sessions-repository.ts` → `/api/sessions` (start), `/api/sessions/[id]` (end), `/api/sessions/recent`; session opened on launch + ended on save with a **clock-skew-safe `ended_at`**; `useContinuePlaying` (module-cached + invalidation). Dashboard is now fully off `@/mock`. (ADR-018)
- **[2026-06-10] Auth hardening — rate limiting + revocable sessions.** In-memory sliding-window rate limits on login/register (`429`+`Retry-After`); server-side session revocation via a `sid` claim + `auth_sessions` rows enforced in the DAL; logout + "sign out everywhere" (`/api/auth/logout-all` + Settings button) truly invalidate; swappable session repo (Supabase / local file). Verified live; deferred email-dependent flows + refresh-token rotation. (ADR-019)
- **[2026-06-10] Admin panel + role-based access control.** `role` column on `users` (`user`/`admin`/`superadmin`, migration 0003); guarded `/api/admin/*`. Two-layer enforcement: proxy reads the JWT `role` claim (optimistic — needs re-login after a promote), DAL/API read the DB role (`getAdminUser`/`getSuperAdminUser` → 403) so authorization is immediate. Superadmin-only role changes + user delete, with self-lockout guards. (ADR-020)
- **[2026-06-11] SuperAdmin console redesign + `/superadmin` routing.** Premium light SaaS console replacing the basic `/admin` UI: route group `(superadmin)` at `/superadmin/{dashboard,users,games}`, reusable `components/superadmin/*` (shell + collapsible sidebar + mobile drawer + topbar + ActionMenu + ConfirmDialog + ui primitives). Role-based routing (login redirect + proxy gating `/superadmin/*` and bouncing superadmins from `/`/`/login`). Dashboard (KPIs/activity/quick-actions), users + games tables (search/filter/sort/paginate, dialogs/modals, skeletons, empty states). **No backend/API/auth changes** — pages call the unchanged `/api/admin/*`. (ADR-021)
- **[2026-06-10] Phase 2 — Custom JWT authentication (real, not mocked).** Replaced the mock session with a production-shaped auth layer: register/login/logout + `me` Route Handlers under `/api/auth/*`; scrypt password hashing (Node built-in); HS256 JWT via `jose` stored in an httpOnly+SameSite cookie; `src/proxy.ts` (Next 16's renamed middleware) for optimistic route protection; a server-side DAL (`getCurrentUser`/`requireUser`) for the authoritative check; a swappable `UserRepository` (Supabase Postgres via PostgREST when configured, local file store otherwise); `ProtectedRoute` wrapper; `SessionProvider` now restores via `/api/auth/me`. Build clean; full flow smoke-tested (register→me→login→logout, proxy redirects, forged-token rejection). (ADR-013)

---

## Frontend Architecture

> Detailed map of what exists. Keep this current — it is how a future session
> resumes without re-reading every file.

### Directory layout (`src/`)
```
src/
  app/
    layout.tsx              # root: fonts, <SessionProvider>, <SpatialNavigation>, theme
    globals.css             # Tailwind v4 theme tokens + focus-ring styling
    favicon.ico
    (app)/                  # route group: pages WITH the TopBar chrome
      layout.tsx            # renders <TopBar> + <main> container
      page.tsx              # Home / dashboard
      library/page.tsx      # Game Library (search + category filter)
      games/[id]/page.tsx   # Game Detail
      games/[id]/play/page.tsx  # Game Launch screen (UI only)
      leaderboard/page.tsx  # Leaderboards (global + per-game)
      profile/page.tsx      # User Profile
      settings/page.tsx     # Settings
    (auth)/                 # route group: minimal chrome (no TopBar)
      layout.tsx
      login/page.tsx        # real login (async, error states, ?next redirect)
      signup/page.tsx       # real signup (async, field-level validation errors)
    (superadmin)/           # route group: SUPERADMIN ONLY (premium SaaS console)
      layout.tsx            # requireSuperAdmin() gate → <SuperAdminShell>
      superadmin/dashboard/page.tsx  # KPIs, activity feed, quick actions
      superadmin/users/page.tsx      # user mgmt (search/filter/sort/paginate/dialogs)
      superadmin/games/page.tsx      # games CRUD (thumbnails/filters/modal)
    api/auth/               # custom auth API (Route Handlers)
      register/route.ts     # POST — create account + start session (rate-limited)
      login/route.ts        # POST — verify credentials + start session (rate-limited)
      logout/route.ts       # POST — clear cookie + revoke this session
      logout-all/route.ts   # POST — revoke ALL sessions (sign out everywhere)
      me/route.ts           # GET  — validate token, return current user
    api/games/              # public games catalog API
      route.ts              # GET  — all games (from Supabase)
      [id]/route.ts         # GET  — one game by id
    api/admin/              # admin API (all guarded by getAdminUser/getSuperAdminUser → 403)
      users/route.ts        # GET   — list users (admin)
      users/[id]/route.ts   # PATCH role + DELETE (superadmin; self-guards)
      games/route.ts        # GET + POST (admin)
      games/[id]/route.ts   # PUT + DELETE (admin)
      analytics/route.ts    # GET   — platform stats (admin)
    api/leaderboard/route.ts # GET  — global or ?gameId= board (public)
    api/scores/route.ts     # POST — submit a score (auth)
    api/profile/stats/route.ts # GET — current user's stats (auth)
    api/sessions/           # play-session lifecycle
      route.ts              # POST — start a session (auth)
      [id]/route.ts         # PATCH — end a session (auth)
      recent/route.ts       # GET  — recent game ids (auth)
  proxy.ts                  # Next 16 route protection (was middleware.ts)
  components/
    layout/   TopBar.tsx (admin link for admins), Clock.tsx
    navigation/ SpatialNavigation.tsx   # global arrow-key focus movement
    game/     GameCard.tsx, GameRail.tsx
    leaderboard/ LeaderboardTable.tsx
    profile/  ScoreList.tsx
    superadmin/ SuperAdminShell, Sidebar, Topbar, ActionMenu, ConfirmDialog,
              ui.tsx (Card/StatCard/Skeleton/Badge/InitialsAvatar/EmptyState/
              AdminButton/Pagination/TableSkeleton)  # premium console design system
    ui/       Button.tsx (Button + ButtonLink), Badge.tsx, Avatar.tsx,
              StarRating.tsx, TextField.tsx,
              animated-hero-section.tsx (AnimatedHero — canvas Pong landing)
  features/
    auth/     session-context.tsx       # SessionProvider + useSession (REAL: restores via /api/auth/me)
              ProtectedRoute.tsx        # client guard for auth-only pages
    games/    useGames.ts               # client hook: fetches /api/games (module-cached)
    scores/   useLeaderboard.ts (per-board cache), useProfileStats.ts
    sessions/ useContinuePlaying.ts     # module-cached + invalidateContinuePlaying()
  services/   auth.service, games.service, sessions.service — REAL (call /api/*)
              # leaderboard.service + profile.service mock files remain but are UNUSED by pages.
              # the BACKEND BOUNDARY. games.service = async fetchers + pure selectors.
  lib/auth/   config, password (scrypt), jwt (jose/HS256 + sid + role claims),
              session (cookies + revocable sessions), validation (zod), dal
              (getCurrentUser/requireUser/requireAdmin/requireSuperAdmin + revocation),
              admin (getAdminUser/getSuperAdminUser → for API 403s), serialize,
              rate-limit (in-memory sliding window), http (429 helper),
              repository (+ repositories/{supabase,local}-user-repository),
              session-repository (+ repositories/{supabase,local}-session-repository)
              # SERVER-ONLY. Never import from a Client Component.
  lib/data/   games-repository.ts       # SERVER-ONLY games reads + admin CRUD (Supabase) → Game
              scores-repository.ts      # SERVER-ONLY leaderboards + profile stats + submitScore
              sessions-repository.ts    # SERVER-ONLY create/end/listRecent game_sessions
              admin-repository.ts       # SERVER-ONLY users list/role/delete + analytics
              game-schema.ts            # zod schema for admin game create/update
  lib/supabase/ server.ts  # getSupabaseAdmin() — service-role client, DATABASE ONLY
  mock/       games.ts, users.ts, scores.ts, sessions.ts, index.ts
  types/      index.ts                  # Game, User, Score, Session, LeaderboardEntry
              auth.ts                   # AuthUser, UserRecord, JwtPayload, request/response DTOs
  lib/        utils.ts (cn), format.ts  # score/date/players formatters
```

### Pages (routes)
| Route | File | Purpose |
|---|---|---|
| `/` | `(app)/page.tsx` | **Logged out:** ABCmouse-style 10-section child-learning landing (`LandingPage`) — Hero, Category strip, Educational Excellence, Feature grid (incl. real games as "Worlds"), Proven Results (incl. real leaderboard), Learning System, Rewards, Testimonials, Icon strip, Final CTA (ADR-023). **Logged in:** dashboard — hero spotlight, "Continue playing", featured + per-category rails (unchanged). |
| `/library` | `(app)/library/page.tsx` | Searchable, category-filterable grid of all games. |
| `/games/[id]` | `(app)/games/[id]/page.tsx` | Game detail: hero, stats, description, top-5 leaderboard, "more like this". |
| `/games/[id]/play` | `(app)/games/[id]/play/page.tsx` | **UI-only** launch screen: faux loading → "now playing" + session timer. |
| `/leaderboard` | `(app)/leaderboard/page.tsx` | Global + per-game rankings; highlights current user. |
| `/profile` | `(app)/profile/page.tsx` | Avatar, level/XP bar, stats, recent scores + sessions. |
| `/settings` | `(app)/settings/page.tsx` | Account (sign out), display toggles (mock), input status, about. |
| `/login` | `(auth)/login/page.tsx` | Mock sign-in form. |
| `/signup` | `(auth)/signup/page.tsx` | Mock registration form. |

### Key components
- **TopBar** — sticky nav (Home / Library / Leaderboard), live Clock, Settings, profile avatar or "Sign in".
- **SpatialNavigation** — global `keydown` handler; arrow keys move DOM focus to the nearest `[data-focusable]` element by geometry. This is the forward-looking primitive the gesture layer (Phase 4) will drive. Every interactive element carries `data-focusable`; focus ring styled in `globals.css`.
- **GameCard / GameRail** — gradient-cover tile + horizontal scrolling row (Netflix/console style). Width-flexible so the same card works in rails and the library grid.
- **Button / ButtonLink** — variants (primary/secondary/ghost/danger), sizes; `ButtonLink` wraps `next/link`.
- **LeaderboardTable, ScoreList, Avatar, StarRating, Badge, TextField** — presentational building blocks.

### State management
- **`SessionProvider` (`features/auth/session-context.tsx`)** — React Context, now **real**. On mount it calls `GET /api/auth/me` to restore the session from the httpOnly cookie (auto session-restore). Exposes `user`, `isAuthenticated`, `isLoading`, async `login`/`signup`/`logout`, and `refresh`. The JWT lives in a cookie (not `localStorage`), so there is no token in JS. Maps the canonical `AuthUser` onto the rich UI `User` via `toAppUser` (fills display/game defaults like level/xp/avatar until those are stored).
- **`ProtectedRoute`** — wraps auth-only pages (`/profile`, `/settings`); shows a loader during restore, then redirects unauthenticated users to `/login?next=…`. Belt-and-suspenders with `proxy.ts`.
- Page-local `useState` for search/filter/toggles. No global store needed yet.

### Mock data structure (`src/mock/`)
- **`games.ts`** — `Game[]` (10 games). Covers are Tailwind gradient strings (used as fallback). Fields: id, title, tagline, description, category, players (`single|multi|both`), min/maxPlayers, cover, coverImage (optional), accent, rating, releaseYear, durationMinutes, featured.
- **`users.ts`** — `User[]` (6 users) + `CURRENT_USER_ID` (`u-amra`). Fields: id, username, displayName, email, avatarColor (gradient), level, xp, joinedAt, bio.
- **`scores.ts`** — flat `Score[]` (gameId, userId, score, achievedAt). Leaderboards are *derived* from these.
- **`sessions.ts`** — `Session[]` play sessions (feeds "Continue playing" + recent activity).
- **`index.ts`** — re-exports all of the above.

### Service boundary (`src/services/`)
All UI reads through services, never the mock directly (except a couple of derived views). Each `*.service.ts` returns mock data now; Phase 2 swaps the internals for Supabase/API calls without changing component code.
- `gamesService` — list / getById / featured / byCategory / categories / search
- `leaderboardService` — `forGame(gameId)`, `global()` (derived from scores)
- `profileService` — `getUser`, `getStats` (scores, sessions, aggregates)
- `authService` — mock `login` / `signup` / `defaultUser`

---

## In-Progress Features

_None._

---

## Known Issues

_None yet._

---

## Current Technical Decisions

See `architecture-decisions.md` for the permanent, append-only record. Summary of active decisions:
- Web-first build; no hardware in early phases.
- Next.js + React frontend, Supabase PostgreSQL backend, JWT auth.
- Phased delivery: Frontend → Backend → Game System → Hardware Input.

---

## Active Assumptions

- Frontend will use mocked backend data until Phase 2 (Supabase integration).
- TV interface targets large-screen, remote/keyboard-driven navigation (focus-based UI).
- No real auth or persistence required to complete Phase 1.
- This machine intercepts TLS; npm/Next network operations may require `NODE_OPTIONS=--use-system-ca` (see ADR-007).

---

## System Boundaries (NOT built yet)

- **Auth is real, hardened, AND wired to live Supabase** (✅ — register/login/logout/me + logout-all, JWT cookie, hashing, route protection; users persist to Supabase Postgres, verified end-to-end). **Hardened (ADR-019):** rate limiting on `/api/auth/*`; revocable sessions via `sid` + `auth_sessions` (logout + sign-out-everywhere truly invalidate). Email/password only — **still deferred** (need an email provider): email verification, password reset, refresh-token rotation, OAuth/social.
- **Supabase data layer is live** (✅ — `@supabase/supabase-js`, service-role, no Supabase Auth). Schema for `users/games/scores/game_sessions` (+ optional `session_players`, `auth_sessions`, `subscriptions`, `game_leaderboards` view) is applied. **`users`, `games`, `scores`, and `game_sessions` are all wired to the DB.**
- **Games are served from Supabase** (✅ — seeded with 10 games via `supabase/seed_games.sql`). Read path: `useGames()` → `/api/games` → `@/lib/data/games-repository` → Supabase.
- **Scores + leaderboards + profile stats are live** (✅ — ADR-017). Write via `POST /api/scores` (auth) from the launch screen; read via `useLeaderboard` → `/api/leaderboard` (public) and `useProfileStats` → `/api/profile/stats` (auth). `leaderboardService`/`profileService` mock files remain on disk but are no longer imported by pages.
- **Game sessions are live** (✅ — ADR-018). "Continue playing" rail + profile activity read real `game_sessions`; session opened on launch (`POST /api/sessions`), ended on save (`PATCH /api/sessions/[id]`); `useContinuePlaying` → `/api/sessions/recent`. The dashboard no longer imports `@/mock`.
- **SuperAdmin console is live** (✅ — ADR-020 backend + ADR-021 redesign + **ADR-022 expansion**). `users.role` (`user`/`admin`/`superadmin`, migration 0003); premium light SaaS UI at **`/superadmin/{dashboard,users,categories,games,audit-logs}`** (route group `(superadmin)`; the old `/admin` group was removed) + guarded **`/api/admin/*`** (unchanged contracts; ADR-022 adds `categories*`, `audit-logs`, `games/bulk`). **ADR-022 (migration 0004 pending on live DB):** managed `categories` taxonomy, enhanced games (status/difficulty/age/featured/play_count + bulk), analytics charts, `audit_logs` trail via best-effort `recordAudit` on every admin write. Public game reads are now **published-only**. Enforcement: proxy reads JWT role (optimistic — promoted users must re-login to reach `/superadmin` pages; superadmins are bounced from `/`+`/login` → `/superadmin/dashboard`), DAL/API read DB role (immediate). Superadmin-only role changes + user delete (with self-lockout guards). `amrasabo@gmail.com` is superadmin.
- **Game cover images (✅ — infrastructure done, ADR-016):** Storage bucket `game-covers` created; `Game.coverImage` optional (maps to `cover_image` column); all 4 cover sites use `next/image` when set, gradient fallback otherwise. Next step: upload images + run the UPDATE SQL.
- No real game SDK or runtime — `/games/[id]/play` is a placeholder screen (score is entered manually).
- No multiplayer yet — `game_sessions.user_id` is single-player owner; `session_players` reserved for Phase 3.
- No Raspberry Pi / camera / MediaPipe gesture input. (Spatial-navigation primitive exists and is the seam the gesture layer will plug into.)
- No paywall / purchasing.

### Phase 2 handoff notes
- **To go live on Supabase:** copy `.env.example` → `.env.local`, set `JWT_SECRET` (`openssl rand -base64 32`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; run `supabase/migrations/0001_auth.sql`. No code change — `getUserRepository()` auto-selects the Supabase repo when those env vars are present.
- **Next features build on this without restructuring:** add `game_sessions`/`scores`/`subscriptions` tables + repositories alongside `users`; read identity from `getCurrentUser()` (DAL) in new Route Handlers; `JwtPayload.sub` is the stable user id for leaderboards/multiplayer.
- `games`/`scores`/`game_sessions`/`auth_sessions` are all live now. The only remaining mock service files are `leaderboard.service.ts` + `profile.service.ts` — **kept on disk but no longer imported by pages** (pages use `useLeaderboard`/`useProfileStats`). Safe to delete once nothing references them.
- **Rate limiting is in-memory (per instance)** — fine for a single `next start` server. If you deploy serverless / multi-process, move `lib/auth/rate-limit.ts` to Redis or a Postgres table.
- `src/types/auth.ts` is the contract the `users`/`sessions` tables map onto; `src/types/index.ts` is the contract for the rest.
