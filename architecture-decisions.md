# KinetoFun — Architecture Decisions

> Permanent technical decisions. **Append-only — no decision is ever overwritten.**
> Last updated: 2026-06-25 (ADR-026 — Gesture Tetris game)

---

## ADR-001 — Frontend stack: Next.js + React
**Date:** 2026-06-08
**Status:** Accepted
**Decision:** Build the web-first frontend with Next.js and React, optimized for a TV / large-screen interface.
**Rationale:** Mandated by the PRD. Next.js provides routing, SSR/SSG options, and a strong React ecosystem suitable for a TV UI.

---

## ADR-002 — Backend: Supabase (PostgreSQL)
**Date:** 2026-06-08
**Status:** Accepted (deferred to Phase 2)
**Decision:** Use Supabase PostgreSQL for backend storage (users, scores, sessions).
**Rationale:** Mandated by the PRD. Supabase provides managed Postgres plus auth/storage primitives.

---

## ADR-003 — Authentication: JWT
**Date:** 2026-06-08
**Status:** Accepted (deferred to Phase 2)
**Decision:** Use JWT-based authentication.
**Rationale:** Mandated by the PRD.

---

## ADR-004 — Phased delivery
**Date:** 2026-06-08
**Status:** Accepted
**Decision:** Deliver in four phases: (1) Frontend first with mocked backend, (2) Backend integration, (3) Game system, (4) Hardware input layer.
**Rationale:** Mandated by the PRD. Lets the UI stabilize before backend and hardware complexity is introduced.

---

## ADR-005 — AI development workflow rules
**Date:** 2026-06-08
**Status:** Accepted
**Decision:** Every change cycle must:
1. Read `project-context.md` and `project-roadmap.md` before acting.
2. Never rebuild existing features unless explicitly told to.
3. Never assume missing information.
4. Update `project-context.md` after every feature completion.
5. Update `project-roadmap.md` whenever a task changes state.
6. Record decisions/assumptions here (append-only).
**Rationale:** Mandated by the PRD. Ensures context survives across sessions so work can resume after long gaps without re-explanation.

---

## ADR-006 — Branch strategy
**Date:** 2026-06-08
**Status:** Accepted
**Decision:** `main` = stable production, `dev` = active development. Features merge only after testing.
**Rationale:** Mandated by the PRD.
**Note:** This directory is not yet a git repository. Git init + branch setup is a pending task.

---

## ADR-007 — Phase 1 scaffold: Next.js App Router + TypeScript + Tailwind + ESLint
**Date:** 2026-06-08
**Status:** Accepted
**Decision:** Scaffolded with `create-next-app@latest` using: App Router, TypeScript, Tailwind CSS, ESLint, `src/` directory, and the `@/*` import alias. Package name `kinetofun`.
**Resolved versions:** Next.js 16.2.7, React 19.2.4, Tailwind CSS v4, ESLint 9, TypeScript 5. Runtime: Node v24.16.0.
**Rationale:** Confirmed with the user (App Router + TS + Tailwind). `src/` dir + `@/*` alias keep imports clean and leave room for a clear backend/UI split in later phases.
**Notes:**
- Node v16.14.2 (original, EOL) was a blocker; user upgraded to Node v24.16.0 before scaffolding (roadmap blocker now resolved).
- npm hit `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (TLS interception / missing root CA); worked around with `NODE_OPTIONS=--use-system-ca`. **Future installs on this machine may need the same flag.**
- Scaffolded into a temp lowercase dir then moved into the project root, because `create-next-app` rejects the capitalized folder name `kinetoFun` and refuses non-empty target dirs.

---

## ADR-008 — Phase 1 frontend architecture
**Date:** 2026-06-08
**Status:** Accepted
**Decision:** Structure and patterns for the Phase 1 frontend.

1. **Route groups.** `(app)` holds pages that render inside the persistent `TopBar` chrome; `(auth)` holds login/signup with minimal chrome. Keeps URLs clean (`/`, `/login`) while sharing layout.
2. **Service boundary (`src/services`).** All data access goes through `*.service.ts` modules that return mock data today. Phase 2 swaps their internals for Supabase/API calls (likely `async`) without touching components. `src/types` is the shared contract.
3. **Mock data (`src/mock`).** Plain typed arrays for games/users/scores/sessions. Leaderboards/stats are *derived* in services, not stored, so they stay consistent.
4. **Mock session via React Context.** `SessionProvider` (`features/auth`) seeds a default mock user, persists to `localStorage`, exposes `login/signup/logout`. No real auth — placeholder for JWT in Phase 2.
5. **Spatial navigation primitive.** A global `keydown` handler moves DOM focus to the nearest `[data-focusable]` element by geometry (arrow keys now; the Phase 4 gesture layer will dispatch the same directional intent). Chosen over a focus-trap/roving-tabindex library to stay dependency-free and app-wide.
6. **Styling.** Tailwind v4 with theme tokens defined in `globals.css` (`@theme`: `--color-bg/surface/surface-2/line/muted/accent/accent-2`). Dark console aesthetic; gradient placeholders stand in for cover art.
7. **Client vs server components.** Interactive pages/components are Client Components (they use session/router/state); presentational pieces stay framework-neutral. Detail/launch pages read the route via `useParams`.

**Rationale:** Maximizes the chance that Phases 2–4 are additive (swap service internals, add a gesture event source) rather than rewrites. Matches the PRD's "don't rebuild" principle.
**Verification:** `npm run build` passes (no TS/lint errors); production server returns 200 for `/`, `/library`, `/games/[id]`, `/games/[id]/play`, `/leaderboard`, `/login`.

---

## ADR-009 — Logged-out animated hero landing + default-session reversal
**Date:** 2026-06-08
**Status:** Accepted (revises ADR-008 point 4)
**Decision:**
1. Integrated a third-party animated canvas component (`src/components/ui/animated-hero-section.tsx`, `AnimatedHero`) — a fullscreen Pong animation that "erases" pixel-text reading **KINETOFUN / PLAY WITH A WAVE**. Shown on `/` only when logged out.
2. **Reversed the default session state**: `SessionProvider` now starts **logged-out** (previously seeded a default mock user). This makes the hero the genuine entry point for new visitors.
**Notes / changes made to the supplied component:**
- The provided `PIXEL_MAP` lacked glyphs for **K, F, W, H, V** (needed by the new words); added them (unmapped letters render blank otherwise).
- Renamed the export `PromptingIsAllYouNeed` → `AnimatedHero`; updated the words and `aria-label`.
- Added `cancelAnimationFrame` cleanup (original leaked its RAF loop on unmount; matters because the hero mounts/unmounts on auth changes).
- Lives in `src/components/ui/` — the path the `@/*` alias + the component's own import expect. This is **not** a shadcn project (no `components.json`), but the component has no shadcn/Radix deps so none is required.
**Trade-off:** A returning, signed-in user may see a brief flash of the logged-out hero before `localStorage` hydration restores their session. Acceptable for the mock phase; revisit with an SSR-aware session check in Phase 2.
**Rationale:** Satisfies the explicit request to show the hero when not logged in, and gives the app a real landing page. The `/login` form pre-fills demo credentials so sign-in is one click.

---

## ADR-010 — Futuristic SaaS visual re-skin (design language only)
**Date:** 2026-06-08
**Status:** Accepted (revises ADR-008 point 6 styling)
**Decision:** Re-skinned the UI with a premium dark-SaaS visual language per a reference design, **without changing any content, copy, layout, sections, navigation, component hierarchy, or user flows** — purely the visual system.
1. **Palette (`@theme` in `globals.css`).** Deep navy near-black canvas (`--color-bg #060913`); **neon-green primary accent** (`--color-accent #22e56f`, was violet); purple/pink secondary (`--color-accent-2 #b066ff`). Surfaces became translucent (glass) and `--color-line` is now `rgba(255,255,255,0.08)`. Added `--radius-card` / `--shadow-card` tokens.
2. **Ambient backdrop.** Fixed `body::before` subtle grid (masked top-fade) + `body::after` radial glow blobs (green corners, purple/pink center) + vignette; `pointer-events:none`, `z-index` behind content.
3. **Glassmorphism.** Global rule applies `backdrop-filter: blur(14px) saturate(1.2)` to any `.bg-surface`/`.bg-surface-2` panel — cheap because all panels already use those tokens.
4. **Buttons.** Primary = neon-green bg with **dark text** (`text-bg`) + glow + hover scale; secondary = blurred dark glass + hover scale.
5. **Accent details.** Logo mark + profile XP bar recolored to brand green; accent `Badge` is now a neon green chip (`text-accent` + ring).
6. **Animated hero canvas.** `AnimatedHero` now clears to transparent (so the page backdrop shows through) instead of painting solid black; unhit text pixels off-white, hit pixels glow green, ball green (with glow), paddles purple. No behavioral change.
**Rationale:** Because every component already consumes the `@theme` color tokens, swapping the tokens cascades the new look across all 9 pages with minimal per-file edits — keeping the change a re-skin, not a rewrite.
**Verification:** `npm run build` passes (no new TS/lint errors; the 2 remaining lint errors in `session-context.tsx` are pre-existing and untouched).

---

## ADR-011 — Homepage redesign: colorful/playful landing page (Nintendo × Duolingo × Apple aesthetic)
**Date:** 2026-06-09
**Status:** Accepted
**Decision:** Replaced the `LandingPage` function (logged-out `/` view) with a full 9-section multi-section landing page. The authenticated dashboard inside `HomePage` is **unchanged**. No other pages, routes, or shared components were modified.

**Sections added (in order):**
1. **Hero** — Full-viewport 3D robot (Spline) with gradient headline (`#6D5DFC→#00D4FF→#32D583`), live badge, stat chips, and floating desktop cards.
2. **How It Works** — Light (#FAFBFF) background, 3 step cards with icon circles, grow-bar hover animation.
3. **Featured Games** — White background, game cards grid with gradient cover badges and per-game accent glow on hover.
4. **Multiplayer** — Deep navy gradient section with orbiting player-avatar visual and stat trio.
5. **Why Kids Love It** — White section with 12 floating keyword chips, CSS float animation, hover scale.
6. **Educational Benefits** — Light background, 4 icon cards with animated underline grow effect.
7. **Perfect For** — White section, 3 pastel-gradient use-case cards (Schools / Hotels / Families) with feature checklists.
8. **Leaderboard Preview** — Dark navy gradient, glass card, top-5 global rankings with colored scores.
9. **Final CTA** — Vibrant `#6D5DFC→#00D4FF→#32D583` gradient with dot texture, white CTA buttons.

**Globals.css additions:** `@keyframes kf-float`, `kf-float-alt`, `kf-pulse-glow`; utility classes `.animate-float`, `.animate-float-delay`, `.animate-float-slow`, `.animate-pulse-glow`.

**Palette used inline (not replacing theme tokens):** Primary `#6D5DFC`, Cyan `#00D4FF`, Amber `#FFB800`/`#c97c00`, Green `#32D583`/`#1f9e5e`, Pink `#FF6B9D`/`#c0165e`. Light section bg `#FAFBFF`, text `#1a1a2e`/`#6b7280`. Dark section bg `#0d0e1a`/`#1a1a2e`.

**Rationale:** Colors are applied directly on the homepage JSX (not via CSS variable swap) so no other pages are affected and the dark-mode TopBar remains readable. Build verified clean.

---

## ADR-013 — Custom JWT authentication system (Phase 2)
**Date:** 2026-06-10
**Status:** Accepted (implements ADR-002 / ADR-003; replaces the ADR-008/ADR-009 mock session)
**Decision:** Build a real, production-shaped authentication layer using custom JWTs, with Supabase PostgreSQL as the database only (no Supabase Auth), structured so it scales into game sessions, leaderboards, multiplayer identity, and subscriptions without restructuring.

**Architecture**
1. **API:** Route Handlers under `src/app/api/auth/` — `POST register`, `POST login`, `POST logout`, `GET me`. Web `Request`/`Response`; never cached.
2. **Passwords:** Node built-in `crypto.scrypt` (memory-hard, salted, self-describing `scrypt$N$r$p$salt$hash`). Chosen over `bcrypt` to avoid a native build on Windows and an extra dependency; constant-time compare via `timingSafeEqual`.
3. **Tokens:** HS256 JWT via `jose` (the library the in-repo Next docs recommend). Claims: `sub` (user id), `email`, `name`, `iat`, `exp`; issuer/audience pinned and verified; `alg` pinned (rejects `none`/swapped alg). 7-day lifetime.
4. **Session storage:** httpOnly + `SameSite=lax` cookie (`kf_auth`), `Secure` in production. The task's preferred option; no token in client JS (so no XSS token theft, no localStorage).
5. **Route protection:** `src/proxy.ts` — **Next 16 renamed `middleware` → `proxy`** (function `proxy`, Node.js runtime only). Optimistic cookie check only (no DB), per docs: redirects unauthenticated users off `/profile`/`/settings` (with `?next=`) and signed-in users off `/login`/`/signup`.
6. **Authoritative check:** server-side DAL (`getCurrentUser`/`requireUser`, React `cache`-memoized) verifies the JWT **and** loads the user from the DB. Used by `GET /api/auth/me` and available to Server Components/Actions.
7. **Persistence:** `UserRepository` interface with two implementations, auto-selected by env: `SupabaseUserRepository` (Supabase Postgres via the PostgREST data API + service-role key, dependency-free `fetch`) when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set; otherwise `LocalUserRepository` (file-backed `.data/auth-users.json`) so the app is fully functional with zero setup. Schema in `supabase/migrations/0001_auth.sql` (`users` + optional `sessions`).
8. **Frontend:** `SessionProvider`/`useSession` rewritten to be real (async `login`/`signup`/`logout`, `isLoading`, auto-restore via `/api/auth/me`); `ProtectedRoute` wrapper; `services/auth.service.ts` is the client API boundary and maps `AuthUser` → the rich UI `User` (`toAppUser`) so all existing screens keep working unchanged.

**Dependencies:** added `jose` only. Reused already-present `zod`. No `bcrypt`/`pg`/`@supabase/supabase-js` (kept the footprint minimal and install-reliable on this TLS-intercepting machine — see ADR-007).

**Secret handling:** `JWT_SECRET` resolved **lazily** at request time (not module load) so `next build` — which runs with `NODE_ENV=production` but no runtime env — doesn't throw. Required (≥32 chars) in production; insecure dev fallback with a loud warning otherwise. See `.env.example`.

**Next.js 16 notes that shaped this (per `node_modules/next/dist/docs`, AGENTS.md mandate):** `middleware`→`proxy` (no Edge runtime for proxy); `cookies()`/`params`/`searchParams` are async; `useSearchParams` needs a Suspense boundary (login/signup wrap their form); Turbopack is the default build.

**Verification:** `npm run build` passes (TypeScript clean; all `/api/auth/*` routes dynamic, Proxy detected). Smoke-tested end-to-end against `next start`: register→201+cookie, me→200, duplicate→409, weak password→400 w/ field errors, login wrong→401, login ok→200, me w/o cookie→401, proxy `/profile` unauth→307 `/login?next=`, proxy `/login` authed→307 `/`, logout clears cookie, tampered/garbage token→401, password persisted as scrypt hash (never plaintext).

**Trade-offs / known limits:** email+password only (no OAuth, email verification, password reset, refresh-token rotation, or `/api/auth/*` rate limiting yet — listed in roadmap). Lint shows the project's pre-existing baseline noise (`react/jsx-no-comment-textnodes`, `react-hooks/set-state-in-effect`) under Next 16's flat config; the gate remains `npm run build` (per ADR-010). Profile/leaderboard data is still mock, so a freshly-registered real user shows empty stats until score persistence lands.

---

## ADR-014 — Supabase data layer connected (database only, no Supabase Auth)
**Date:** 2026-06-10
**Status:** Accepted (implements ADR-002; the persistence side of ADR-013)
**Decision:** Connected the app to a live Supabase Postgres project as the **database layer only**. Authentication stays the custom JWT system (ADR-013); Supabase Auth is **not** used.

1. **Client:** added `@supabase/supabase-js`. `src/lib/supabase/server.ts` exposes `getSupabaseAdmin()` — a lazy, cached, **server-only** client created with the **service-role** key and `auth: { persistSession:false, autoRefreshToken:false }`. Never imported by Client Components; the service-role key is never sent to the browser.
2. **Repository:** `SupabaseUserRepository` now uses the Supabase client (`.from('users').select/insert/...`) instead of raw `fetch`/PostgREST. The `UserRepository` interface is unchanged, so the auth layer is untouched and the local file-store fallback still applies when env is absent.
3. **Schema:** full schema lives in `supabase/schema.sql` (run in the Supabase SQL editor) — `users`, `games`, `scores`, `game_sessions` (+ `session_players`), plus optional `auth_sessions`, `subscriptions`, and a `game_leaderboards` view. Maps onto `src/types`. RLS is enabled on every table with no policies; the service-role key bypasses RLS, so only the server can read/write. **Naming:** the play-sessions table is `game_sessions` (not `sessions`) to disambiguate from `auth_sessions`.
4. **Env / config:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and public `NEXT_PUBLIC_SUPABASE_*` for future browser use) in `.env.local` (git-ignored; `.env.example` documents them). `getUserRepository()` auto-selects Supabase when both are set.
5. **TLS / runtime:** this machine intercepts TLS, so Node must run with `--use-system-ca` to reach Supabase over HTTPS (curl fails; Node with the flag succeeds). Baked into the `dev`/`build`/`start` scripts via **`cross-env`** so it works regardless of the OS shell (npm `script-shell` is unset → cmd.exe on Windows). Extends ADR-007 from install-time to runtime.

**Scope restraint (per the user's card):** "keep schema minimal and extend later based on real usage" — so only `users` is wired in code (real usage = auth). `games`/`scores`/`game_sessions` repositories are deliberately **not** pre-built; they get added with the same pattern when those features move off mock data.

**Verification:** `npm run build` clean. Live end-to-end against the real Supabase project: register→`201` (row persisted; `created_at` has Postgres µs+offset precision), `me`→`200` (read back by id), login correct→`200` / wrong→`401`, duplicate email→`409` (case-insensitive `lower(email)` unique index). Confirmed the stored `password_hash` is a scrypt digest (130 chars, never plaintext) by reading the row directly via the service key; **test rows were then deleted** to leave the project clean.

---

## ADR-015 — Games catalog served from Supabase
**Date:** 2026-06-10
**Status:** Accepted (extends ADR-014 to the `games` table; supersedes the mock `gamesService` from ADR-008)
**Decision:** Moved the games catalog from the in-memory mock to the live Supabase `games` table, behind a public read API.

**Read path:** `useGames()` (client hook) → `GET /api/games` (Route Handler) → `@/lib/data/games-repository.ts` (server, Supabase client) → Postgres. Plus `GET /api/games/[id]` for single lookups.

1. **Why an API + client hook (not direct client Supabase, not Server Components):** the consuming pages (home landing + dashboard, library, game detail, launch, leaderboard) are large `"use client"` components with search/filter/spatial-nav. A server-only API keeps the service-role key off the browser; the `useGames()` hook (module-level cache + in-flight dedupe) fetches the small catalog once and shares it across navigations. This mirrors the auth pattern and avoided risky server/client restructuring of the 1100-line landing/dashboard page.
2. **Service shape:** `games.service.ts` is now `fetchGames`/`fetchGame` (async) + **pure selectors** (`selectFeatured`, `selectByCategory`, `selectCategories`, `searchGames`, `findGame`) that operate on a `Game[]`. Pages call `useGames()` for `{ games, loading }` and derive views with the selectors — stable imports, no unstable-ref memo bugs.
3. **Mapping:** the repository maps snake_case rows → the `Game` type (`min_players`→`minPlayers`, `rating` coerced to number, etc.). `games.id` is a text slug (matches the former mock ids), so `continuePlaying` (still mock `sessions`) keeps resolving.
4. **Loading UX:** library shows skeleton tiles; detail/launch/dashboard show a spinner; the landing "Featured" section shows placeholder cards — all collapse to instant after the first fetch (cache).
5. **Seed:** `supabase/seed_games.sql` (idempotent upsert) with the 10 original games; also seeded live via the service key for immediate display.

**Scope:** only `games` moved to the DB. `leaderboardService` + `profileService` remain mock (next: `scores`/`game_sessions` repositories using this same pattern).

**Verification:** `npm run build` clean (`/api/games`, `/api/games/[id]` dynamic). Against the live project: seeded 10 rows; `GET /api/games`→ 10 games in `Game` shape (featured-first), `GET /api/games/shadow-quest`→ the game, unknown id→ `404`.

---

## ADR-016 — Game cover images from Supabase Storage
**Date:** 2026-06-10
**Status:** Accepted (adds real images to ADR-015; builds on ADR-014 infrastructure)
**Decision:** Added optional real images to game covers, served from Supabase Storage, with Tailwind gradient fallback when images are absent.

**Structure:**
- **Storage:** Public bucket `game-covers` in Supabase (created manually)
- **DB:** New nullable `cover_image TEXT` column on `public.games`; maps to `Game.coverImage?: string` in code
- **URLs:** `https://eyipksddjxhbjfjofktj.supabase.co/storage/v1/object/public/game-covers/{game-id}.jpg`
- **Rendering:** All 4 cover sites (GameCard, FeaturedGameCard, detail hero, dashboard spotlight) now conditional:
  - If `coverImage` is set → `next/image` (optimized, fill, object-cover)
  - Else → Tailwind gradient `<div>` (original fallback, always works)

**Why this way:**
1. **Graceful degradation:** images optional; gradients always work. If bucket access fails or image isn't uploaded, the UI doesn't break.
2. **Supabase Storage, not external URLs:** we own the images. All stored in the user's Supabase project, not locked to a third-party CDN.
3. **next/image optimization:** adds `images.remotePatterns` config for the Supabase domain; Next.js handles responsive/WebP/lazy-load.

**Activation (manual, done in Supabase dashboard):**
1. Supabase → Storage → `game-covers` bucket → upload 10 images (filenames: `neon-drift.jpg`, `block-cascade.jpg`, …)
2. Run SQL in Supabase SQL editor:
   ```sql
   UPDATE public.games SET cover_image = 
     'https://eyipksddjxhbjfjofktj.supabase.co/storage/v1/object/public/game-covers/' || id || '.jpg'
   WHERE cover_image IS NULL;
   ```
3. Refresh the app — images appear immediately

**Files changed:**
- `src/types/index.ts` — added `coverImage?: string` to `Game` interface
- `src/lib/data/games-repository.ts` — map `cover_image` DB column → `coverImage` (undefined when null)
- `next.config.ts` — added `images.remotePatterns` for Supabase Storage hostname
- `src/components/game/GameCard.tsx` — conditional `<Image>` or gradient
- `src/app/(app)/page.tsx` — FeaturedGameCard + hero spotlight (both conditional)
- `src/app/(app)/games/[id]/page.tsx` — detail hero (conditional)
- `supabase/seed_games.sql` — added `cover_image` column (all null; UPDATE populates after images uploaded)

**Verification:** `npm run build` clean. API returns `cover` + `coverImage` (omitted when undefined). UI renders gradients; will show images once they're in the bucket and wired via SQL.

**Scope:** only game covers. User avatars, screenshots, other media will use the same pattern later.

**Why not:**
- ~~Direct client Supabase (Images in a public bucket)~~ — adds a client dependency on Supabase that auth doesn't need; /api/games already goes server-side, images URL comes in the response
- ~~External CDN~~ — we own the images, want no third-party lock-in, and Supabase Storage is free
- ~~Multiple image sizes (srcset)~~ — next/image handles responsive automatically; no extra uploading needed

---

## ADR-017 — Score persistence (real leaderboards + profile stats)
**Date:** 2026-06-10
**Status:** Accepted (extends ADR-014/015 to the `scores` table; supersedes the mock `leaderboardService`/`profileService` from ADR-008)
**Decision:** Moved scores from in-memory mock to the live Supabase `scores` table, behind read APIs (leaderboards, profile stats) and a write API (score submission).

**Paths:**
- **Write:** play page → `POST /api/scores` (auth-required) → `submitScore()` → `scores` insert
- **Leaderboard read:** `useLeaderboard(gameId|null)` → `GET /api/leaderboard[?gameId=]` → `listLeaderboardForGame` / `listGlobalLeaderboard`
- **Profile read:** `useProfileStats()` → `GET /api/profile/stats` (auth-required) → `getUserStats`

1. **Server repository** (`src/lib/data/scores-repository.ts`, server-only): joins `scores → users` for leaderboard entries; computes best-score-per-user then re-ranks in JS (simple, catalog/score volume is small). The Supabase nested-select types the joined `users` as an array, so we cast `as unknown as ScoreRow[]`.
2. **Auth boundary:** writes and personal stats require a session — handlers call `getCurrentUser()` (DAL) and return `401` when absent. Leaderboard reads are public. `JwtPayload.sub` (the user id) is the author of every score.
3. **Client hooks mirror `useGames`:** `useLeaderboard` caches per board key (`"global"` or a game id) at module level; `useProfileStats` fetches on mount and exposes `refresh()`. Pages show spinner / empty-state / error.
4. **Profile enrichment client-side:** `/api/profile/stats` returns raw `Score[]`/`Session[]`; the profile page joins them to games from the cached `useGames()` catalog (no server-side game join needed).
5. **Score entry:** the launch screen (`/games/[id]/play`) gained a numeric score input + "End & save score" button (placeholder until real gameplay exists in Phase 3).

**Files:** `src/lib/data/scores-repository.ts`; `src/app/api/{leaderboard,scores,profile/stats}/route.ts`; `src/features/scores/{useLeaderboard,useProfileStats}.ts`; rewrote `leaderboard/page.tsx` + `profile/page.tsx` + `games/[id]/play/page.tsx`.

**Verification:** `npm run build` clean. Live: `GET /api/leaderboard` → `{entries:[]}` (empty until scores exist); `POST /api/scores` + `GET /api/profile/stats` → `401` unauthenticated.

**Scope:** `leaderboardService`/`profileService` mock files remain on disk but are no longer imported by pages. `game_sessions` handled separately (ADR-018).

---

## ADR-018 — Game-session persistence ("Continue playing")
**Date:** 2026-06-10
**Status:** Accepted (extends ADR-014 to `game_sessions`; supersedes the mock `sessions` from ADR-008 — the last mock data source on the dashboard)
**Decision:** Record real play sessions in the Supabase `game_sessions` table; the dashboard "Continue playing" rail and profile activity now read live data.

**Lifecycle:**
- **Start:** launch screen mounts → `POST /api/sessions {gameId}` (best-effort; 401 when signed out is non-fatal) → inserts an `active` row, returns `sessionId`
- **End:** "End & save score" → `PATCH /api/sessions/[id]` → sets `status='ended'`, `ended_at`
- **Read:** dashboard → `useContinuePlaying(isAuthenticated)` → `GET /api/sessions/recent` → most-recent distinct `game_id`s

1. **Best-effort tracking:** session start is fire-and-forget; if it fails (signed out / network) gameplay is unaffected. Ownership enforced on end (`user_id` match) — a user can only end their own session.
2. **Clock-skew-safe `ended_at`:** the DB has a `CHECK (ended_at >= started_at)`. Setting `ended_at` from the Node clock violated it (host clock slightly behind Supabase + µs→ms precision loss on the read-back `started_at`). Fix: `endSession` reads the row's `started_at` and sets `ended_at = max(Date.now(), started_at_ms + 1000ms)`, guaranteeing the constraint regardless of skew. **This pattern applies to any future `ended_at`/`expires_at` writes.**
3. **Module-cached hook with explicit invalidation:** `useContinuePlaying` caches the recent-id list at module level (like `useGames`); `invalidateContinuePlaying()` is called after creating/ending a session so the dashboard refetches on next mount. The hook takes an `enabled` flag so it no-ops (and shows nothing) when signed out.
4. **`session_players`:** not used yet — single-player ownership via `game_sessions.user_id`. The normalized players table stays reserved for real multiplayer (Phase 3).

**Files:** `src/lib/data/sessions-repository.ts`; `src/app/api/sessions/{route,[id]/route,recent/route}.ts`; `src/services/sessions.service.ts`; `src/features/sessions/useContinuePlaying.ts`; updated `games/[id]/play/page.tsx` + `app/(app)/page.tsx` (removed the last `@/mock` import from the dashboard).

**Verification:** `npm run build` clean (13→ now includes `/api/sessions`, `/api/sessions/[id]`, `/api/sessions/recent`). Live end-to-end with a cookie jar: register → create 2 sessions → `recent` lists both distinct games newest-first → `PATCH` end → `{ok:true}`. Unauthenticated → `401` on all three. Test users deleted afterward (cascade cleared sessions; 0 rows remain).

---

## ADR-019 — Auth hardening: rate limiting + revocable sessions
**Date:** 2026-06-10
**Status:** Accepted (hardens ADR-013; uses the `auth_sessions` table from ADR-014's schema — no migration needed)
**Decision:** Before real users, added the two no-external-dependency protections that are painful to retrofit later: **rate limiting** on `/api/auth/*` and **server-side session revocation**. Deferred email-dependent flows (password reset, verification) and full refresh-token rotation.

**Scope chosen by the user:** "no-dependency essentials" (rate limiting + generic errors + session revocation); **no email provider yet**, so reset/verification are out.

### Rate limiting (`src/lib/auth/rate-limit.ts`)
- In-memory sliding-window limiter (Map of key→hit timestamps, with a periodic sweep). **Login:** broad `login:ip:<ip>` 20/15min (anti-spray) + tight `login:id:<ip>:<email>` 5/15min (anti-brute-force), reset on success so legit users aren't penalised. **Register:** `register:ip:<ip>` 5/hour. Over limit → `429` + `Retry-After` (helper in `src/lib/auth/http.ts`).
- **Trade-off:** per-instance state — correct for a single `next start` server. If ever scaled horizontally (serverless / multi-process), move to Redis or a Postgres table. Documented in the file.

### Revocable sessions (the structural change)
Previously the JWT was fully stateless: logout only cleared the cookie, so a copied token stayed valid for its 7-day life with no way to revoke. Now:
1. **`sid` claim:** `createSession` mints a `sid` (uuid), persists a row in `auth_sessions` (id=sid, user_id, user_agent, ip, expires_at), and embeds `sid` in the JWT.
2. **DAL enforces it:** `getCurrentUser` rejects a token whose `sid` row is missing or expired (and whose `user_id` ≠ `sub`). Since `/api/auth/me` and every protected data route go through the DAL, revocation is enforced everywhere. The **proxy stays optimistic** (stateless JWT check only, per Next 16 docs) — the authoritative check is the DAL.
3. **Logout deletes the row** (`destroySession`); **"sign out everywhere"** deletes all rows for the user (`destroyAllSessions` → `POST /api/auth/logout-all` → Settings button).
4. **Swappable repo** mirroring the user repo: `SupabaseSessionRepository` (`auth_sessions`) when configured, `LocalSessionRepository` (`.data/auth-sessions.json`) otherwise — so revocation works in local dev too.
5. **Graceful degradation / back-compat:** if the session row can't be persisted, `createSession` issues a stateless token (no `sid`) so login still works; tokens minted before this change (no `sid`) skip the revocation check and simply expire. No forced logout of existing users.

### Why NOT shorten the access token
The scope mentioned "shorter token," but without refresh tokens a short access token just logs users out every few minutes. Kept the 7-day lifetime; **revocability** (not a short TTL) is the real security win here. A short access token + refresh rotation is the deferred follow-up.

### Generic errors
Already in place from ADR-013: login returns a single `Invalid email or password.` for both unknown-email and wrong-password, with a constant-time dummy hash to avoid timing leaks. Register's `409` still reveals an email is taken (deliberate UX trade-off; the main enumeration vector — login — is closed).

**Files:** `rate-limit.ts`, `http.ts`, `session-repository.ts` (+ `repositories/{supabase,local}-session-repository.ts`) new; `jwt.ts`/`types/auth.ts` (sid), `session.ts` (create/destroy/destroyAll), `dal.ts` (revocation check), `login`/`register` routes (limits + session meta), `logout-all/route.ts` new; `auth.service.ts` + `session-context.tsx` + `settings/page.tsx` (sign-out-everywhere).

**Verification:** `npm run build` clean. Live: 5 wrong logins → `401`, 6th/7th → `429`. Logout → `/api/auth/me` `401` (server-side revoked). Two devices → `logout-all` from one → both `401`. Test users deleted (cascade cleared sessions; `auth_sessions` = 0).

**Deferred (need an email provider or more design):** password reset, email verification, refresh-token rotation, OAuth/social, security headers/CSP, breach-password check, distributed rate-limit store.

---

## ADR-020 — Admin panel + role-based access control
**Date:** 2026-06-10
**Status:** Accepted (builds on ADR-013/019 auth; extends the `users` table)
**Decision:** Added an in-app admin panel (`/admin` route group) for user management, games management, and analytics, gated by a `role` column on `users`. One admin UI tier; `superadmin` differs from `admin` only by being able to change roles + delete users.

**Roles:** `users.role` ∈ `{'user','admin','superadmin'}` (migration `0003_user_roles.sql`, default `'user'`, CHECK constraint). Role flows: DB → `UserRecord` → `toAuthUser` → embedded as a JWT `role` claim on login + surfaced on the UI `User` (optional field) via `toAppUser`.

**Two-layer enforcement (the key design point):**
1. **Proxy (optimistic, stateless):** reads `role` from the JWT claim; redirects non-admins away from `/admin` pages fast, no DB hit. Because it's JWT-based, a newly-promoted user must **re-login** before the proxy lets them reach `/admin` pages.
2. **DAL + API (authoritative, DB):** `requireAdmin`/`requireSuperAdmin` (Server Components, redirect) and `getAdminUser`/`getSuperAdminUser` (Route Handlers, 403) both go through `getCurrentUser`, which loads the **current** role from the DB. So API authorization reflects a role change **immediately**, no re-login. Verified live: promote in DB → `/api/admin/*` flips 403→200 on the same cookie.

**API (`/api/admin/*`), all guarded:**
- `users` GET (admin); `users/[id]` PATCH role + DELETE (**superadmin only**). Self-guards: can't change or delete your own account via the API (prevents a sole superadmin self-lockout) — the UI also hides those controls for the current row.
- `games` GET + POST, `games/[id]` PUT + DELETE (admin). Writes added to `games-repository.ts` (`createGame`/`updateGame`/`deleteGame` + a `toGameRow` reverse mapper); shared `game-schema.ts` (zod) for create/update. Editing/creating reflects instantly in the public `/api/games` (verified).
- `analytics` GET (admin): counts (`head:true, count:'exact'`) for users / new-7d / sessions / active / scores, plus top games by session count (in-JS group-by).

**UI:** `(admin)` route group with its own `layout.tsx` (server, calls `requireAdmin` as defence-in-depth) + sidebar; client pages for dashboard / users / games (tables + inline game form). `AdminNav` client component for active states. Admin link added to TopBar (dropdown + mobile) only when `user.role` is admin/superadmin. Data lives in `src/lib/data/admin-repository.ts` (users + analytics; games reuse `games-repository.ts`).

**Why same-app `/admin` (not a separate app):** one deployment, shared auth/session, no duplicated infra. Risk of admin code in the player bundle is mitigated because all admin data access is server-only (route handlers + server layout); client admin pages only call the guarded APIs.

**Files:** `0003_user_roles.sql`; `types/auth.ts` + `types/index.ts` (role); `jwt.ts`/`serialize.ts`/`session.ts` (role claim); `dal.ts` (requireAdmin/SuperAdmin) + `lib/auth/admin.ts` (API guards); `proxy.ts` (/admin gate); `lib/data/{admin-repository,game-schema}.ts` + games-repo writes; `app/api/admin/{users,users/[id],games,games/[id],analytics}/route.ts`; `app/(admin)/{layout,admin/page,admin/users/page,admin/games/page}.tsx`; `components/admin/AdminNav.tsx`; `TopBar.tsx`.

**Activation:** run `0003_user_roles.sql` (done) → it sets `amrasabo@gmail.com` to superadmin → **log out + back in** so the JWT carries `role` → visit `/admin`.

**Verification:** `npm run build` clean (all `/admin` + `/api/admin/*` routes registered). Live: role=user → 403 on admin APIs; after DB promote → 200 (same cookie); games create/update/delete reflected in public `/api/games`; bad game id → 422; PATCH/DELETE self → 400; analytics returns real counts. Test user + test games deleted afterward.

**Deferred:** soft-deactivate (an `active` column instead of hard delete), audit log of admin actions, per-tenant/venue scoping (the eventual admin-vs-superadmin multi-org split), pagination on the users/games tables.

---

## ADR-021 — SuperAdmin console redesign + `/superadmin` routing
**Date:** 2026-06-11
**Status:** Accepted (redesigns ADR-020's UI; **no backend/API/auth-logic changes**)
**Decision:** Replaced the basic `/admin` UI with a premium light "SaaS console" at **`/superadmin/{dashboard,users,games}`** (route group `(superadmin)`), and added role-based routing so superadmins land in the console. The `/api/admin/*` endpoints, repositories, RBAC model, and auth are unchanged — this is a presentation + routing layer.

**Routing:**
1. **Login redirect** (`(auth)/login/page.tsx`): on success, `role === 'superadmin'` → `/superadmin/dashboard`, else existing `?next`/home flow.
2. **Proxy** (`proxy.ts`): `/superadmin/*` requires the superadmin JWT-role claim (optimistic; non-super → `/`, unauthed → `/login?next=`). A signed-in superadmin is also bounced from `/` and `/login` → `/superadmin/dashboard` (their home is the console). Regular users' flow is untouched.
3. **Layout** (`(superadmin)/layout.tsx`): `requireSuperAdmin()` (DB-authoritative) as defence-in-depth.

**Design system (deliberately NOT the app's themeable tokens):** a fixed light palette so the console stays consistent regardless of the public app's dark/light toggle — off-white `#F8FAFC` canvas, white elevated cards (`border-slate-200` + soft shadow), slate neutrals, restrained **violet-600** accent (on-brand with the app's purple primary), colored tints per KPI. All in `src/components/superadmin/`.

**Reusable components:** `ui.tsx` (Card, StatCard, Skeleton, Badge, InitialsAvatar, EmptyState, AdminButton, Pagination, TableSkeleton), `SuperAdminShell` (collapse state persisted to localStorage + mobile drawer + body-scroll lock), `Sidebar` (floating, collapsible to icon-rail with hover tooltips, active indicator), `Topbar` (breadcrumb+title from pathname, search w/ ⌘K chrome, notifications dropdown with empty state, profile dropdown → Profile/Settings/Logout), `ActionMenu` (row "⋯" dropdown), `ConfirmDialog` (animated, RAF-driven enter — no plugin dependency).

**Pages (client, fetch the unchanged `/api/admin/*`):**
- **Dashboard:** welcome, 4 KPI cards (Total Users w/ +this-week trend, Total Games, Active Sessions w/ live dot, Total Plays), Platform Activity feed (derived from recent registrations — no new API), Quick Actions, Top Games. Skeleton loaders.
- **Users:** 3 summary cards, search + role filter + sort, sortable table (avatar initials, role/status badges, joined), client pagination (8/pg), `ActionMenu` → Edit role (dialog) / Delete (ConfirmDialog). Self-row guarded (matches API self-guards). Empty + loading states.
- **Games:** 3 summary cards, search + category filter + sort, table w/ cover thumbnails (`next/image` when `coverImage`, gradient fallback), rating + featured badges, pagination, create/edit in an elegant modal (the full game form), delete confirm.

**Responsive:** desktop floating sidebar (collapsible); `<lg` becomes a slide-over drawer (hamburger in topbar, tap-scrim to dismiss, closes on navigation). Mobile-first toolbars, horizontal-scroll tables.

**Removed:** the old `(admin)` route group + `components/admin/AdminNav.tsx`. `requireAdmin` (dal) is now unused but kept as a library helper; `getAdminUser` still guards the games/analytics APIs (so a plain `admin` role keeps API access even though the `/superadmin` *pages* are superadmin-only).

**Trade-off — superadmin can't see the public home at `/`:** the proxy traps exact `/` → `/superadmin/dashboard` (per the request). Other public routes (`/library`, etc.) remain reachable by direct URL. Easy to relax by dropping the `pathname === '/'` clause.

**Files:** `proxy.ts`, `(auth)/login/page.tsx`, `components/layout/TopBar.tsx` (link → `/superadmin/dashboard`, superadmin-only); new `src/components/superadmin/*` (8 files) + `src/app/(superadmin)/layout.tsx` + `superadmin/{dashboard,users,games}/page.tsx`.

**Verification:** `npm run build` clean (3 `/superadmin/*` routes registered; `/api/admin/*` unchanged). Live redirect matrix verified: unauthed `/superadmin/*` → `/login?next=`; regular user → `/superadmin/dashboard` → `/` and `/` stays 200; superadmin → dashboard 200, `/` and `/login` → `/superadmin/dashboard`. Test user cleaned up.

**Follow-up — device cover upload (2026-06-11):** the Games modal now uploads cover images **from the device** instead of pasting a URL. New `CoverUpload` component (drag-drop + file picker, preview, 5MB/PNG·JPG·WEBP·GIF limit) → `POST /api/admin/games/upload-cover` (admin-guarded) stores the file in the public `game-covers` bucket via the **service-role Storage client** (`${randomUUID}.${ext}`, bypasses Storage RLS) and returns the public URL saved to `cover_image`. The gradient input remains as the fallback. Verified live: no-auth → 403, upload → 201 with a reachable public URL, unsupported type → 422; test object + user removed.

---

## ADR-022 — SuperAdmin platform expansion (Categories, enhanced Games, Analytics, Audit Logs)

**Date:** 2026-06-11
**Status:** Accepted — implemented, build verified. **Requires running `supabase/migrations/0004_categories_games_audit.sql` against the live DB.**

**Context.** The `/superadmin` console (ADR-020/021) covered users + basic games. This ADR evolves it into a scalable platform admin: a managed **Categories** taxonomy, **enhanced Games** (status/difficulty/age/featured/play-count + bulk actions), an **Analytics** dashboard (charts), and an **Audit log**. Hard constraint: preserve all existing auth, APIs, and public read paths.

**Database (migration 0004 + idempotent schema.sql).**
- New `categories` table (id, name, slug, description, icon[lucide name], image, sort_order, is_active, timestamps). **Seeded from the 6 legacy `game_category` enum values** so nothing changes for current games.
- `games` gains `category_id` (FK → categories, `on delete set null`), `status` (`game_status` enum draft/published/**archived**, **default `published`** so seeded games stay visible), `difficulty` (`game_difficulty`), `age_group`, `short_description`, `thumbnail`, `play_count`. Migration backfills `category_id` from the enum and `play_count` from `game_sessions` history.
- **Legacy `games.category` enum is KEPT and kept in sync** — the public site still filters on it. This dual-key design is the deliberate non-breaking compromise (a brand-new custom category that isn't one of the 6 leaves the enum at its prior value; the game still lists because the public API selects by `status`, not enum).
- New `audit_logs` table (admin_id, admin_name, action, entity_type, entity_id, details jsonb, created_at).

**Public read path change (intentional).** `listGames()`/`getGameById()` now filter `status = 'published'` → **draft/archived games are hidden from normal users**. Admin uses the new `listAllGames()`. ⚠️ This means the app **breaks against an un-migrated DB** (the `status` column won't exist) — the migration must be applied.

**Repositories.** `categories-repository` (CRUD, `gamesCount` via one grouped query, `countGamesInCategory`/`moveGames`/`deleteGamesInCategory`, `reorderCategories`), `audit-repository` (`recordAudit` — best-effort, never throws; `listAuditLogs` w/ filters; `getAuditSummary`), `games-repository` extended (new fields, `listAllGames`, `bulkSetStatus`/`bulkSetCategory`/`bulkDeleteGames`), `admin-repository.getAnalytics` rebuilt (category counts, status counts, played-today, 14-day userGrowth + playsPerDay series, top games by play_count).

**API (all under the unchanged `/api/admin/*` guard pattern → `getAdminUser()` 403).** `categories` (GET/POST), `categories/[id]` (PATCH; DELETE with **safeguards**: returns `409 category_has_games` unless `?strategy=move&target=` or `?strategy=delete-games`), `categories/reorder` (POST), `audit-logs` (GET filters+summary), `games/bulk` (POST publish/archive/draft/delete/category). **Audit logging wired into every write** (categories, games create/update/publish/archive/delete + bulk, user role/delete) via `void recordAudit(...)` — fire-and-forget so logging can't break the action.

**UI (premium light SaaS, same design system).** Sidebar reordered → Dashboard · Users · **Categories** · Games · **Audit Logs**. New reusable primitives in `superadmin/ui.tsx` (`Select`, `SearchInput`, `ViewToggle`, `Switch`, `Segmented`), `superadmin/charts.tsx` (dependency-free SVG `AreaChart` w/ draw-in animation + hover readout, `BarList`), `superadmin/icons.tsx` (`CategoryIcon` renders any lucide name + searchable `IconPicker`), `superadmin/audit.tsx` (`auditMeta`/`auditSentence` action describers). Chart/entrance keyframes added to `globals.css` (no styled-jsx).
- **Categories page:** 4 summary cards, search + status filter, **table & card views** (`ViewToggle`), drag-to-reorder rows (HTML5 DnD, persisted), enable/disable, create/edit modal (auto-slug, IconPicker, optional image via reused `CoverUpload`, Switch), **delete safeguard modal** (move-games / delete-games / cancel).
- **Games page (enhanced, no features lost):** 4 summary cards, search + category/status/difficulty/age filters + Newest/Most-played/Alphabetical sort, **row multi-select + bulk action bar** (Publish/Archive/Category/Delete w/ confirm), play-count column, status+featured badges; richer create/edit modal (short description, DB category select that syncs the enum, difficulty/age/status `Segmented`, featured `Switch`, thumbnail upload) keeping all original fields.
- **Dashboard:** 6 overview metrics, two `AreaChart`s (user growth, plays over time), **Recent Activity** (audit logs + recent sign-ups merged), Top Games + Most-Popular `BarList`, Quick Actions (Add Category/Game, Manage Users, Audit Logs).
- **Audit Logs page:** 4 summary cards, debounced search + entity/admin/date filters (server-side), table with action/admin/entity/when, click-through detail modal (pretty-printed JSON details).

**Verification.** `tsc --noEmit` clean; `npm run build` clean — new routes registered (`/superadmin/{categories,audit-logs}`, `/api/admin/{categories,categories/[id],categories/reorder,audit-logs,games/bulk}`). ESLint `set-state-in-effect` findings match the pre-existing data-loading pattern in the users/games pages (Next 16 doesn't lint during build). **Not yet exercised against the live DB** (migration 0004 pending).

**Follow-ups / deferred.** Show featured games on the public homepage; surface draft/archived preview for admins (currently `getGameById` is published-only); paginate audit logs server-side (capped at 500 now); category image bucket reuses `game-covers`.

---

## ADR-023 — Homepage redesign: ABCmouse-style child-learning landing page

**Date:** 2026-06-19
**Status:** Accepted — implemented, build + type-check + runtime-200 verified.

**Context.** Product direction for the logged-out `/` landing shifted toward a bright, playful, **child-education** positioning modeled on ABCmouse (rounded shapes, soft gradients, "learning world" sections, gamified feel). Hard constraint: **UI/presentation only** — no change to game logic, hooks, APIs, auth, routes, or the authenticated dashboard.

**Scope (what changed).**
- **`src/app/(app)/page.tsx`** — the logged-out `LandingPage` was rebuilt from the previous 9-section "gesture-gaming" marketing page into a **10-section ABCmouse flow**: (1) Hero — mascot (`/kid.gif`) left, headline + CTA right, sky gradient + drifting CSS clouds + floating ABC/123/★ bubbles; (2) Category strip — floating pill card (Reading/Math/Science/Art & Colors/Music → `/library`); (3) Educational Excellence — centered heading + browser-frame preview mockup; (4) Feature grid — 4 alternating left/right blocks; (5) Proven Results — playful CSS bar chart + claim chips; (6) Learning System — 4 circular-icon tiles; (7) Tickets & Rewards — gift/coins illustration; (8) Testimonials — 3 cards on warm gradient; (9) Feature icon strip — 4 pastel badges; (10) Final CTA — deep-blue cloud sky, confetti, `Try FREE for 30 Days`. Footer + BackToTop retained (lightly restyled). `WaveDivider` SVGs bleed each section into the next.
- **`src/app/layout.tsx`** — added Google Fonts **Baloo 2 + Nunito** via `<link>` (React 19 hoists them to `<head>`).
- **`src/app/globals.css`** — added **scoped** `.landing-root` (Nunito body) + `.font-display` (Baloo 2 headings) classes and a few keyframes (`kf-wiggle/bob/drift/spin-slow/grow-up`) with a `prefers-reduced-motion` guard.

**Key decisions / trade-offs.**
- **No functionality touched.** The page still branches on `useSession()`; the **entire authenticated dashboard is byte-for-byte unchanged**. Both live data hooks are preserved *inside the new design* so no feature is lost: `useGames()`/`selectFeatured()` render real games as the "All-New Worlds to Learn and Explore" block, and `useLeaderboard()` powers a "Star Learners This Week" card inside Proven Results.
- **Palette is landing-scoped, not global.** Adopted the ABCmouse spec palette (`#2F80FF/#FFD84D/#FF8A3D/#5BD97B/#FF5FA2/#8A5CFF` on `#EAF4FF`) as **inline constants in the page** (the same approach the old landing used). The global `globals.css` theme tokens (sky-blue `#1AACE0` brand set) are **untouched**, so every other page/route keeps its existing look.
- **Fonts via `<link>`, not `next/font`.** `next/font/google` self-hosts by **fetching font files at build time**; this machine intercepts TLS, so a build-time fetch is a real failure risk. A runtime `<link>` keeps the build network-independent. ESLint emits a `no-page-custom-font` *warning* (false-positive here — the link lives in the root layout, so it is app-wide), which does not fail the build.
- **Copy adapted, not copied.** ABCmouse-specific claims were re-branded to KinetoFun (e.g., "KinetoFun doubles early learning gains…") rather than reproducing a competitor's verbatim brand claims.
- **Illustrations are CSS/SVG/emoji** (clouds, blobs, browser-frame mockup, gift "treasure", floating icon bubbles) — no new raster assets needed; only the existing `/kid.gif` is reused as the hero mascot.

**Verification.** `npx eslint` on the changed files → **0 errors** (2 warnings: pre-existing `<img>` for `kid.gif`, and the font-link advisory). `npx tsc --noEmit` clean. `npm run build` clean (homepage `/` compiles). Ran `next start` + `curl /` → **HTTP 200** with the new server-rendered copy ("Path to Success", "Try FREE for 30 Days", "Tickets") present.

**Supersedes** the visual layer of **ADR-011** (the 2026-06-09 colorful 9-section landing) for the logged-out homepage. Authenticated dashboard behavior is unchanged.

---

## ADR-024 — Unified calm global background (remove balloons / dotted surface / rainbow)

**Date:** 2026-06-19
**Status:** Accepted — implemented, build + type-check + runtime-200 verified.

**Context.** The platform layered three competing background systems behind every page: a full-screen **`BalloonBackground`** (canvas — 30 animated, mouse-poppable balloons), a **`DottedSurface`** (three.js animated dot wave), and a **rainbow body gradient** (`#a8d4ff→#c8a8ff→#ffaad4→#a8f0c0→#fff0a0`). The result felt like "separate mini-designs" and the background competed with content. Goal: one calm, minimal, kid-friendly background everywhere; keep playfulness in the **foreground** UI only. Constraint: visual/background only — no layout or behavior changes.

**Decision.**
- **Removed the two global decorative layers.** Deleted `src/components/ui/balloon-background.tsx` and `src/components/ui/dotted-surface.tsx` and their mounts in `app/layout.tsx` (they were referenced nowhere else). `three` is now an unused dependency (left installed; harmless).
- **Single global background = one soft gradient in `globals.css`.** `body` → `linear-gradient(175deg,#E7F2FF,#F1F8FF,#F8FCFF,#FFFFFF)` (sky-blue → very soft white), `background-attachment: fixed`. `.dark body` → calm deep-navy gradient (`#0a1430→#070e22→#05091a`). This is the lone source; pages with glass `.bg-surface` cards (dashboard, library, profile, leaderboard, settings, game screens) now sit on the calm wash with no per-page background.
- **Auth pages** (`(auth)/layout.tsx`): removed the two ambient `blur-[140px]` glow blobs (one referenced an undefined `bg-accent-2`) so login/signup show the clean global gradient.
- **Landing** (`(app)/page.tsx`): removed all free-floating decorative **clouds** (hero ×3, results ×1, CTA ×2), the hero **sun-glow** radial, and the final-CTA **confetti** dots (+ the now-unused `Cloud` component). Kept content illustrations (mascot blob, illustration-attached icon bubbles, preview/gift emoji) — those are foreground "UI playfulness," not background decoration. The landing's on-palette section bands (sky / white / warm testimonials / blue CTA) remain as content blocks, not page background.

**Deliberately left as-is.** The **SuperAdmin console** (`SuperAdminShell` → opaque `bg-[#F8FAFC]`) keeps its own premium light-SaaS surface — it's a back-office tool, already calm/consistent, and the redesign brief targets user-facing pages (home, dashboard, game, profile, auth). Forcing the kid gradient there would degrade ADR-021's deliberate design.

**Verification.** `eslint` on changed files → 0 errors (2 pre-existing warnings). `tsc --noEmit` clean. `npm run build` clean. `next start` + curl: `/` and `/login` → **200**; `/` HTML now contains **no `<canvas>`** (balloons gone) and still renders the landing copy.

---

## ADR-026 — Gesture Tetris game
**Date:** 2026-06-25
**Status:** Accepted
**Decision:** Add a full gesture-controlled classic Tetris game as a Vite + React + TypeScript app (`games/gesture-tetris/`) built to `public/games/gesture-tetris/` and served in an `<iframe>` via the existing play screen.

**Gesture mapping:**
- Tilt wrist left/right (horizontal offset of mid-MCP landmark 9 vs wrist landmark 0, threshold ±0.08, mirrored X) → continuous lateral move with 170 ms per-cell cooldown.
- Raise wrist (wrist.y < 0.30 in normalised frame) → clockwise rotation, edge-triggered (locks until wrist returns above y=0.40).
- Lower wrist (wrist.y > 0.72) → 8× soft-drop speed, level-held.

**Game rules:** 10×20 board (2 hidden spawn rows), all 7 tetrominoes (I/O/T/S/Z/J/L), 7-bag randomiser, simple SRS wall-kicks (5 horizontal offsets + 1 floor-kick), ghost piece, NES-curve fall speed, 500 ms lock-delay, line-clear animation (200 ms flash). Scoring: 1/2/3/4 lines = 100/300/500/800 × level. Level increases every 10 lines.

**Menu navigation:** Identical dwell-to-click system as gesture-piano (`MenuGestureLayer` + `GestureBtn`, 900 ms dwell, SVG progress ring). Screens: Landing → Difficulty (Easy lv1 / Normal lv3 / Hard lv6) → Game → Game-Over overlay.

**Score submission:** `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` on game-over (guarded by `scoreSentRef` to fire exactly once). Parent play page already handles this → `POST /api/scores`.

**Audio:** Web Audio API (no files), lazy init on first gesture. SFX: move click, rotate chirp, lock thunk, line-clear ascending arp (1–3 lines), Tetris fanfare (4 lines, 8-tone), level-up sweep, game-over descending.

**Files added:**
- `games/gesture-tetris/` — full Vite project (src: App.tsx, gameLogic.ts, useHandTracking.ts, useMenuHand.ts, useGesture.ts, useGameCanvas.ts, audio.ts, main.tsx, index.css)
- `public/games/gesture-tetris/` — built dist (index.html + assets/)
- `src/games/registry.ts` — added `gesture-tetris` entry
- `supabase/seed_gesture_tetris.sql` — upsert-safe game row (Arcade, published, featured)
