# KinetoFun — Roadmap

> Tracks execution progress. Update whenever a task changes state.
> Last updated: 2026-07-01 (Flag Quest: World Colors — ADR-034)

---

## Backlog

### Phase 1 — Frontend First (NO HARDWARE)
- ✅ Complete — see Done.

### Phase 1.x — Frontend polish (optional, future)
- [ ] Persist display settings (large text / reduce motion) and actually apply them
- [ ] Loading/skeleton states (will matter once services become async)
- [x] **Real cover art instead of gradient placeholders** — infrastructure done (Supabase Storage bucket + coverImage field; gradients as fallback). See ADR-016. **To activate:** upload images to `game-covers` bucket, run the SQL UPDATE.
- [ ] Favorites / wishlist
- [ ] Per-rail "View all" deep links

### Phase 2 — Backend Integration
- [x] **JWT authentication system** — done (custom JWT, scrypt, httpOnly cookie, proxy, DAL, repository). See Done / ADR-013.
- [x] **Supabase PostgreSQL integration** — done & LIVE (`@supabase/supabase-js`, service-role, no Supabase Auth; `users` persisting end-to-end; full schema applied). See Done / ADR-014.
- [x] **Games catalog from Supabase** — done (`/api/games`, `useGames()`, repository; 10 games seeded). See Done / ADR-015.
- [x] **Score persistence** — done (`scores` repo + `/api/{scores,leaderboard,profile/stats}`; real leaderboards + profile stats; score entry on launch screen). See Done / ADR-017.
- [x] **Game-session persistence** — done (`game_sessions` repo + `/api/sessions[/recent,/[id]]`; "Continue playing" rail is live; dashboard fully off mock). See Done / ADR-018.
- [ ] Multiplayer sessions (`session_players` — reserved, single-player only so far)
- [x] **Auth hardening (no-dependency essentials)** — done: rate limiting on `/api/auth/*` + revocable sessions (`auth_sessions`, logout-everywhere). See Done / ADR-019.
- [x] **Admin panel + RBAC** — done: `role` column (user/admin/superadmin); guarded `/api/admin/*`; two-layer enforcement (proxy JWT + DAL DB). See Done / ADR-020.
- [x] **SuperAdmin console redesign + routing** — done: premium light SaaS UI at `/superadmin/*` (replaces `/admin`); role-based login redirect; collapsible sidebar + mobile drawer; redesigned dashboard/users/games. API unchanged. See Done / ADR-021.
- [ ] Auth follow-ups (need email provider or more design): email verification, password reset, refresh-token rotation, OAuth/social, security headers/CSP, distributed rate-limit store
- [x] **SuperAdmin platform expansion** — done: Categories management, enhanced Games (status/difficulty/age/featured/play-count + bulk), Analytics dashboard (charts), Audit logs. Migration 0004 required. See Done / ADR-022.
- [ ] Admin follow-ups: soft-deactivate (active column), per-venue scoping (admin vs superadmin multi-org split), surface featured games on public homepage, server-side audit pagination

### Phase 3 — Game System
- [ ] Game SDK structure
- [ ] Game lifecycle management
- [ ] Multiplayer session handling

### Phase 4 — Hardware Input Layer (LATER)
- [ ] Raspberry Pi integration
- [ ] Camera feed processing
- [ ] MediaPipe hand tracking
- [ ] Gesture → UI event translation

---

## In Progress

_None yet._

---

## Testing / Review

_None yet._

---

## Done

- [x] **[2026-07-01] Flag Quest: World Colors.** Gesture-only educational flag-painting game (Flag Paint: World Tour-inspired core loop, entirely original assets/code/branding). Player selects a paint color by hovering a fingertip over a swatch (500ms dwell) then holds their fingertip inside the matching outlined region to gradually fill it (smart region-fill via SVG-polygon point-in-polygon hit-testing, not freehand tracing); wrong region flashes red + small penalty, no harsh punishment. 31 flags across all 6 continents, all geometry procedurally generated from primitive shapes (stripes/canton/cross/circle/saltire/star/diamond generators in `flags/shapes.ts`) — no traced/copied flag art. Difficulty tiers (easy→expert) by color/region count; combo multiplier to ×10; bronze/silver/gold/perfect medals from a target-time ratio; 1–3 stars unlock continents/countries progressively (localStorage save via Zustand `persist`). World Tour (continent → country map), Practice (any unlocked flag, unlimited time, no score), Endless (infinite, difficulty ramps with round, local best score), Gallery (capital/population/language/independence/fun fact per flag), Settings (gesture-only sliders for music/SFX + toggles for colorblind/high-contrast/larger-cursor/slower-painting/mirror/narration), 8 achievements. Every menu is hover-to-activate (700ms) via a reusable `HoverButton` + `ProgressRing`; open-palm pauses, fist resumes (same convention as Maze Muncher). 5-step guided calibration; auto-pausing "Hand Lost" overlay; canvas-based particle system (splash/sparkle/confetti); Web Audio-synthesized SFX + ambient music (no binary audio/image assets). Single shared MediaPipe `HandLandmarker` session (`GestureProvider` context) drives both a re-render-free RAF ref for 60fps in-game painting and a state-driven feed for menu hover, avoiding a second camera stream. Score posted via `GAME_COMPLETE` on session exit — no per-game scores table needed, reuses the existing generic `public.scores` (game_id FK). `tsc --noEmit` + `vite build` clean; Vite game served from `public/games/flag-quest/`. (ADR-034)
- [x] **[2026-07-01] Maze Muncher: Gesture Edition.** Gesture-only maze-chase game — hand-zone steering (up/down/left/right around a calibratable center), wall-gated turning with buffered desired-direction. 10 procedurally generated neon mazes (seeded recursive-backtracker + loop-carving + warp tunnel). 4 original AI hunters (Chaser Drone = BFS-to-player, Ambush Bot = BFS-to-predicted-cell, Patrol Sentinel = wall-follower loop, Rogue Hunter = biased-random). Power orbs → 8s frightened mode; orb/power-orb/gem/treasure/enemy-defeat scoring with combo multiplier. Gems + rare treasure spawn-and-expire. Difficulty ramps 2→3→4 enemies then speed/aggression climb across repeating sectors. All menus dwell-to-select (1.2s hover); pose gestures (open palm/fist/thumbs-up/victory-sign, 700ms hold) for pause/resume/confirm/restart. Full HUD, accessibility settings (sensitivity/smoothing/dead-zone/high-contrast/colorblind/large-UI/left-handed), camera calibration. Web Audio SFX only, no binary assets. Scores saved to DB; Vite game served from `public/games/maze-muncher/`. Verified via headless-Chromium smoke test (menu + gameplay render, zero console errors). (ADR-033)
- [x] **[2026-06-29] Spear Stickman game.** Gesture-only arcade survival inspired by *The Spear Stickman* (core loop captured, gore-free). Hand aims with a live trajectory arc; fist = charge a power throw, open = release, pinch = quick throw, swipe = dodge. 7 enemy kinds (grunt/runner/heavy/archer/shield/jumper/ninja) that telegraph + lob spears, giant boss every 5th wave; headshots one-shot + double score; combo to ×10; power-ups (triple/pierce/explosive/slow-mo/shield/rapid + heart) that home to the player; coins unlock 10 cosmetic spear skins; achievements. 6 canvas arenas, 4 modes (Endless/Time Attack/One Life/Headshots Only). All menus + pause dwell-to-select; progress/settings in localStorage; score posted via `GAME_COMPLETE`. Vite game served from `public/games/spear-stickman/`. (ADR-030)
- [x] **[2026-06-29] The Sniper Code game.** Gesture-only sniper: hand pans a full-screen scope (crosshair centred), pinch = fire (hold + cooldown), open palm = cycle 2×/4×/8× zoom, hold-still = STEADY AIM (less sway + bonus). 14-mission campaign across 6 canvas environments (eliminate / civilian-avoidance / multi-target / escape-runner / moving-lead / VIP-protect), with night/fog/wind/decoys/limited-ammo progression; head/body hit-zones, 5× combo, 3-star ratings, Endless bonus mode. Stylized gore-free hits (family-friendly). All menus dwell-to-select; settings/progress saved to localStorage; scores posted via `GAME_COMPLETE`. Vite game served from `public/games/the-sniper-code/`. (ADR-029)
- [x] **[2026-06-26] Gesture Basketball game.** Free-throw shooter: 10 shots, wrist X = arc angle, oscillating power meter + edge-triggered raise = shoot; backboard bank shots; 3 difficulty levels; Web Audio SFX; scores saved to DB; Vite game at `public/games/gesture-basketball/`. (ADR-028)
- [x] **[2026-06-25] Gesture Volleyball game.** 2D beach volleyball vs AI; two-hand control (hand X = move, raise = smash, spread = block); 3 difficulty levels; first to 7 points; Web Audio SFX; scores saved to DB; Vite game at `public/games/gesture-volleyball/`. (ADR-027)
- [x] **[2026-06-25] Gesture Tetris game.** Classic 10×20 Tetris; all 7 tetrominoes with 7-bag, ghost piece, SRS kicks, NES fall curve; 3 gesture controls (tilt/raise/lower); 3 difficulty levels; all menus dwell-to-select; Web Audio SFX; scores saved to DB; Vite game served from `public/games/gesture-tetris/`. (ADR-026)
- [x] **[2026-06-25] Gesture Piano game.** 10-lane Guitar Hero piano; fingertip hover detection via MediaPipe; 3 built-in songs; Web Audio synthesis; scores saved to DB; built Vite game served from `public/games/gesture-piano/`. (ADR-025)
- [x] **[2026-06-19] Unified calm global background.** Replaced 3 competing background systems (animated balloons canvas + three.js dotted surface + rainbow body gradient) with one soft sky-blue→white `body` gradient (calm navy in dark). Deleted the 2 decorative components + mounts; removed auth glow blobs and landing clouds/sun-glow/confetti (kept foreground illustrations). Calm, consistent background across home/dashboard/game/profile/auth; SuperAdmin keeps its own back-office surface. Build + tsc + lint clean; `/` + `/login` → 200, no `<canvas>`. (ADR-024)
- [x] **[2026-06-19] Homepage redesign — ABCmouse-style child-learning landing.** Rebuilt the logged-out `/` landing into a bright, playful 10-section ABCmouse flow (Hero, Category strip, Educational Excellence, alternating Feature grid, Proven Results, Learning System, Tickets & Rewards, Testimonials, Icon strip, Final CTA + waves/clouds/floating icons). **UI/presentation only — no logic/API/route/auth changes; authenticated dashboard untouched.** Live hooks preserved in-design (`useGames`→"Worlds" real game cards, `useLeaderboard`→"Star Learners"). ABCmouse palette applied landing-scoped (global theme tokens untouched); Baloo 2 + Nunito loaded via runtime `<link>`; scoped `.landing-root`/`.font-display` + keyframes in `globals.css`. This also surfaces admin-`featured` games on the public homepage. Build + `tsc` + lint clean; `curl /` → 200 with new copy. (ADR-023)
- [x] **[2026-06-11] SuperAdmin platform expansion (Categories, enhanced Games, Analytics, Audit Logs).** Managed `categories` taxonomy (CRUD, reorder, enable/disable, delete safeguards, table/card views, icon picker); enhanced Games (status draft/published/archived, difficulty, age group, featured, short description, thumbnail, play count; bulk publish/archive/delete/recategorize; richer filters + sort); Analytics dashboard (6 metrics, user-growth + plays-over-time area charts, top/most-popular games, merged recent-activity feed, quick actions); Audit logs (`audit_logs` table + best-effort `recordAudit` wired into all admin writes; filterable page + detail modal). Migration 0004 adds `categories`/`audit_logs` + games columns and keeps the legacy `category` enum in sync. Public reads now show **published-only** games. Build clean; **migration 0004 must be run on the live DB.** (ADR-022)
- [x] **[2026-06-08] Project foundation.** Scaffolded Next.js (App Router) + TS + Tailwind + ESLint via `create-next-app@latest`; git init with `main`/`dev`; tracking files on `main`, scaffold on `dev`; production build verified. (ADR-007)
- [x] **[2026-06-08] TV interface shell / layout.** Root + `(app)`/`(auth)` route-group layouts, sticky `TopBar` with live clock, dark console theme. (ADR-008)
- [x] **[2026-06-08] Navigation system (focus-based, remote-friendly).** Global arrow-key spatial navigation over `[data-focusable]` elements — the seam for the future gesture layer. (ADR-008)
- [x] **[2026-06-08] Game browser.** Home dashboard (hero + rails) and Library (search + category filter grid) over mock catalog.
- [x] **[2026-06-08] Game detail + launch (UI only).** Detail page with per-game leaderboard; placeholder launch screen.
- [x] **[2026-06-08] User profiles (mocked).** Profile page: avatar, level/XP, stats, recent scores + sessions.
- [x] **[2026-06-08] Score display + leaderboards (mocked).** `LeaderboardTable`, `ScoreList`; global + per-game rankings derived from mock scores.
- [x] **[2026-06-08] Mock auth UI + session.** Login/signup forms, `SessionProvider` (localStorage-backed, no real auth). (ADR-008)
- [x] **[2026-06-08] Settings page.** Account/sign-out, mock display toggles, input status, about.
- [x] **[2026-06-08] Logged-out animated hero landing.** Integrated `AnimatedHero` (canvas Pong) showing "KINETOFUN / PLAY WITH A WAVE" on `/` when signed out; default session now starts logged-out. (ADR-009)
- [x] **[2026-06-08] Futuristic SaaS visual re-skin.** Design-language-only re-skin — navy canvas, neon-green accent, purple/pink glow backdrop, glassmorphism, glow buttons. No content/layout/flow changes; build passes. (ADR-010)
- [x] **[2026-06-09] Homepage redesign — colorful/playful landing page.** Full 9-section multi-section landing page for logged-out `/`. Nintendo × Duolingo × Apple aesthetic with alternating light/dark sections, float animations, colorful palette. Authenticated dashboard unchanged; build passes. (ADR-011)
- [x] **[2026-06-10] Custom JWT authentication system.** Real auth replacing the mock: `/api/auth/{register,login,logout,me}` Route Handlers, scrypt password hashing, HS256 JWT (`jose`) in an httpOnly cookie, `src/proxy.ts` route protection (Next 16 middleware rename), server DAL, swappable `UserRepository` (Supabase / local file fallback), `ProtectedRoute`, real `SessionProvider`. Build clean; end-to-end flow + security cases smoke-tested. (ADR-013)
- [x] **[2026-06-10] Games catalog served from Supabase.** `lib/data/games-repository.ts` + `/api/games`(+`/[id]`) + `useGames()` hook + pure selectors; all 5 game-consuming pages refactored off the mock `gamesService`; 10 games seeded (`supabase/seed_games.sql`). Build clean; `/api/games` verified returning Supabase rows. (ADR-015)
- [x] **[2026-06-10] Game cover images (Supabase Storage).** Optional `coverImage` on `Game` (maps to `cover_image` column); all 4 cover sites render `next/image` when set, gradient fallback otherwise; `images.remotePatterns` configured. Bucket `game-covers` created. **Activate:** upload images + run the UPDATE SQL. (ADR-016)
- [x] **[2026-06-10] Score persistence (real leaderboards + profile).** `scores-repository.ts` + `/api/scores` (write, auth), `/api/leaderboard` (public), `/api/profile/stats` (auth); `useLeaderboard`/`useProfileStats` hooks; leaderboard + profile pages off mock; score entry added to launch screen. Build clean; endpoints verified live (empty board, 401s). (ADR-017)
- [x] **[2026-06-10] Game-session persistence ("Continue playing").** `sessions-repository.ts` + `/api/sessions`(+`/[id]`, `/recent`); session opened on launch, ended on save (clock-skew-safe `ended_at`); `useContinuePlaying` hook with cache invalidation; dashboard "Continue playing" rail live and fully off `@/mock`. Build clean; full authed flow verified end-to-end (create→recent→end), test users cleaned up. (ADR-018)
- [x] **[2026-06-10] Auth hardening — rate limiting + revocable sessions.** In-memory sliding-window limits on login (5/15min per IP+email) + register (5/hr per IP) → `429`+`Retry-After`. Server-side revocation via `sid` claim + `auth_sessions` rows checked in the DAL: logout and "sign out everywhere" (`/api/auth/logout-all` + Settings button) now truly invalidate. Swappable session repo (Supabase / local file). Build clean; verified live (6th login→429; logout→me 401; cross-device logout-all→both 401); test users cleaned up. (ADR-019)
- [x] **[2026-06-10] Admin panel + role-based access control.** `role` column on `users` (migration 0003); `/admin` route group (analytics dashboard, user management, games CRUD) + guarded `/api/admin/*`. Two-layer enforcement: proxy reads JWT role (optimistic, needs re-login after promote), DAL/API reads DB role (authoritative, immediate). Superadmin-only role changes + user delete, with self-lockout guards. Admin link in TopBar for admins. Build clean; verified live (403→200 after promote on same cookie; games CRUD reflected in public API; self-guards 400; analytics real counts); test data cleaned up. (ADR-020)
- [x] **[2026-06-11] SuperAdmin console redesign + `/superadmin` routing.** Replaced the basic `/admin` UI with a premium light SaaS console at `/superadmin/{dashboard,users,games}` (route group `(superadmin)`, removed old `(admin)`). Role-based routing: login sends superadmins to the console; proxy gates `/superadmin/*` (superadmin-only) and bounces them from `/`+`/login`. Reusable `components/superadmin/*` (shell, collapsible sidebar + mobile drawer, topbar w/ search/notifications/profile, ActionMenu, ConfirmDialog, ui primitives); redesigned dashboard (KPIs/activity/quick-actions), users (search/filter/sort/paginate/dialogs), games (thumbnails/filters/modal). **No backend/API/auth changes.** Build clean; redirect matrix verified live; test user cleaned up. (ADR-021)
- [x] **[2026-06-10] Supabase data layer connected (live).** Wired the app to a live Supabase Postgres project as database-only via `@supabase/supabase-js` (service-role, server-only, no Supabase Auth); `src/lib/supabase/server.ts` client; `SupabaseUserRepository` switched to the SDK; full schema (`supabase/schema.sql`) applied; `--use-system-ca` baked into npm scripts via `cross-env` for this TLS-intercepting machine. Verified end-to-end against the real project (register/me/login/duplicate; row persisted with scrypt hash; test rows deleted). (ADR-014)

---

## Blockers

_None active._

**Resolved:**
- ~~[2026-06-08] Node version too old (v16.14.2, EOL).~~ User upgraded to Node v24.16.0; scaffolding proceeded. Also resolved a `UNABLE_TO_VERIFY_LEAF_SIGNATURE` TLS error via `NODE_OPTIONS=--use-system-ca` (see ADR-007).

---

## Future Ideas

- Paywall / purchasing system
