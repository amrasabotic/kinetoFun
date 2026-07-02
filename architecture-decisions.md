# KinetoFun — Architecture Decisions

> Permanent technical decisions. **Append-only — no decision is ever overwritten.**
> Last updated: 2026-07-02 (ADR-037 — Mob Rally: Gesture Crowd Runner game)

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

## ADR-028 — Gesture Basketball game
**Date:** 2026-06-26
**Status:** Accepted

**Decision:** Add a gesture-controlled free-throw basketball game as a Vite + React + TypeScript app (`games/gesture-basketball/`) built to `public/games/gesture-basketball/` and served in an `<iframe>` via the existing play screen.

**Gesture mapping (two-axis):**
- **Aim (arc angle):** Wrist X position (mirrored) → launch angle. AimX=0.0 → 30°, AimX=0.5 → 55° (ideal for hoop at canvas position), AimX=1.0 → 80°. Visualised as a dotted arc preview on the canvas while aiming.
- **Power:** Fully automatic oscillating sin-wave meter (`power = 0.5 + 0.5*sin(phase)`, period = 4/2.6/1.8s by difficulty). A vertical bar with a green "sweet zone" overlay (38–58% power = ideal window) gives real-time feedback. Player times their shot to the meter rather than controlling power directly.
- **Shoot:** Edge-triggered raise — wrist Y < 0.28 fires the ball with the current aim angle and live power value. Resets when wrist descends past Y=0.44.

**Game rules:** 10 free throw attempts per game, 10 pts per basket (100 pts max). Difficulty bonus added to score on GAME_COMPLETE: Easy +0 / Normal +50 / Hard +100. Three difficulty levels:
- Easy: 50px scoring proximity radius, 4 s power-meter period
- Normal: 33px radius, 2.6 s period
- Hard: 18px radius, 1.8 s period

**Physics:** Canvas 800×500. Player at (140, 458). Ball released at (164, 360). Hoop center (625, 200). Backboard (657–672, 128–265). Ball arc: vx = speed·cos(angle), vy = −speed·sin(angle), gravity 0.40 px/frame². Speed = 12 + power × 9 (range 12–21 px/frame). Scoring: proximity check to hoop center each frame while ball is descending (vy > 0). Backboard bounce: vx = −|vx|×0.58 when ball hits backboard while moving rightward — enables bank shots.

**Menu navigation:** Identical dwell-to-click system as all prior gesture games (`MenuGestureLayer` + `GestureBtn`, 900 ms dwell). Screens: Landing → How To Play → Difficulty → Game → Game-Over overlay.

**Score submission:** `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` on game-over (guarded by `scoreSentRef`). Parent play page handles this → `POST /api/scores`.

**Audio (Web Audio API):** Shoot swoosh (noise + triangle chirp), swish (noise + ascending chord), bank (board thud + delayed swish), rim clank (sawtooth + noise), air-ball whoosh, game-over fanfare (triumphant 7-tone if score ≥ 70, sad descending otherwise).

**Files added:**
- `games/gesture-basketball/` — full Vite project (src: App.tsx, gameLogic.ts, useHandTracking.ts, useMenuHand.ts, useGesture.ts, audio.ts, main.tsx, index.css)
- `public/games/gesture-basketball/` — built dist (index.html + assets/)
- `src/games/registry.ts` — added `gesture-basketball` entry
- `supabase/seed_gesture_basketball.sql` — upsert-safe game row (Sports, published, featured)

## ADR-029 — The Sniper Code game
**Date:** 2026-06-29
**Status:** Accepted

**Decision:** Add a gesture-only sniper game as a Vite + React + TypeScript app (`games/the-sniper-code/`) built to `public/games/the-sniper-code/` and served in an `<iframe>` via the existing play screen — same delivery pattern as every other gesture game (ADR-025–028).

**Theme decision (explicit):** KinetoFun is a children/family portal, so the game is a **softened literal sniper**: it keeps the scope/aim/"eliminate" framing but uses only **stylized, gore-free** hit effects (sparks, dust puffs, ✕ markers — never blood). The user chose this over a full reskin and over a lighter shooting-gallery framing.

**Rendering model:** Authentic full-screen scope. The crosshair is fixed at screen centre; the hand **pans the world** beneath it. A wide world (`WORLD_W=2400`) is drawn procedurally per environment (gradient sky + silhouette skyline/props + ground); the visible region = `aim ± (canvas/2)/(BASE_PPU·zoom)`. Hit detection is therefore "the world point under centre" (plus sway + wind drift). No image assets — canvas vector figures (head circle + body capsule + limbs) tinted by role with emoji accents; all SFX are Web Audio synthesis (`utils/audio.ts`).

**Gesture mapping:**
- **Aim:** hand X/Y → world pan within `[PAN_MIN..PAN_MAX]` (sensitivity-scaled, α-smoothed). Breathing sway (two sines) layered on, amplitude ∝ zoom.
- **Fire:** pinch (thumb `lm[4]`↔index `lm[8]`) held `PINCH_HOLD_MS=120` + `FIRE_COOLDOWN_MS=460`, edge-triggered → hitscan with recoil + screen-shake + muzzle-flash + tracer.
- **Zoom:** open palm held `ZOOM_HOLD_MS=750` cycles one step 2×→4×→8× (one cycle per palm-hold; drop & re-open to cycle again).
- **Steady Aim:** rolling cursor std-dev under `STEADY_STD_MAX` for `STEADY_TIME_MS=650` → reduced sway + `STEADY_SCORE_MULT=1.25` on hits.
- **Menus + in-game pause:** dwell-to-select (`DwellLayer`/`DBtn` for menus, `[data-hud-id]` + a per-frame dwell loop in `GameScreen` for the pause button + pause overlay).

**Mission model:** `data/missions.ts` holds pure parameters; `game/engine.ts` (a plain `GameEngine` class) turns them into spawned actors with a seeded RNG (`mulberry32(hash(id))`) for deterministic campaign layouts. 14 campaign missions over 6 environments; types: `eliminate`, `civilian`, `multi` (optionally ordered), `escape` (runner exits → fail), `moving` (lead the rider), `vip` (attacker reaches VIP → fail). Roles split into **valid** `{target, attacker}` and **protected** `{civilian, vip, decoy, hostage}` — shooting any protected actor = instant mission fail. Markers are colour **and** shape (red ◆ = shoot, amber ◇? = decoy, cyan ring = VIP) for colourblind safety; an off-scope arrow points to the nearest undiscovered target. Endless mode = `makeEndlessMission(wave)` escalating waves; win advances the wave, loss ends the run with the accumulated total.

**Scoring:** head +200 / body +100 / miss −25 / protected −500; combo 1×→5× (reset on miss/wrong-order); win bonuses = time (`×10/s`) + remaining ammo (`×25`) + steady shots (`×30`) + perfect (`+500`). Stars 1–3 from per-mission `star2`/`star3` thresholds.

**Score submission:** App posts `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` on the campaign Results screen and at Endless game-over. Parent play page → `POST /api/scores`.

**Persistence (localStorage):** `sniper-code:progress` (stars/best/unlocked/endlessHigh) + `sniper-code:settings` (sensitivity, smoothing, sound, scope darkness, left-handed, high-contrast, aim-assist, tutorialDone).

**Deferred (not built in v1):** Time-Attack / Accuracy / Daily modes, power-ups (slow-mo, piercing, thermal scope, etc.), full 15-environment / full mission-type breadth, hostage-specific mission. The data/engine model leaves room to add these without restructuring.

**Build verification:** the game's own `tsc -p tsconfig.app.json` + `vite build` are clean and copied via `node scripts/build-games.js the-sniper-code`. The repo-root `next build` is currently **pre-broken on unrelated embedded folders** under `src/app/(app)/games/games/*` (Tailwind v4 `gap-3` utility error + missing modules) — confirmed independent of this change (no `the-sniper-code`/`registry` references in the failure). Like all other gesture games, this game is a standalone static build and is not part of the Next build graph.

**Files added:**
- `games/the-sniper-code/` — full Vite project (`src/App.tsx`, `hooks/useMediaPipe.ts`, `utils/{constants,gestures,audio,storage}.ts`, `data/missions.ts`, `game/engine.ts`, `components/{GameScreen,menus}.tsx`, `main.tsx`, `index.css`)
- `public/games/the-sniper-code/` — built dist (index.html + assets/)
- `src/games/registry.ts` — added `the-sniper-code` entry
- `supabase/seed_the_sniper_code.sql` — upsert-safe game row (Action, published, featured)

---

## ADR-030 — Spear Stickman game
**Date:** 2026-06-29
**Status:** Accepted

**Decision:** Add a gesture-only arcade survival game inspired by *The Spear Stickman* (QKY Games) as a Vite + React + TypeScript app (`games/spear-stickman/`) built to `public/games/spear-stickman/` and served in an `<iframe>` via the existing play screen — identical delivery pattern to ADR-025–029. Per the brief, this **captures the core loop** (aim → throw arcing spears → headshots → survive escalating waves) rather than recreating the original; cartoon-stylized and **gore-free** for the family portal.

**Rendering model:** Single full-screen canvas in **screen-space pixels** (no fixed virtual resolution). All physics is authored at a 600px reference height and multiplied by `U = ch/REF_H`, so spear arcs look identical on any screen. The player stickman is anchored bottom-left (`PLAYER_X_FRAC`); enemies spawn from the right and on procedurally-placed platforms (stored as canvas fractions so they survive resize). Six hand-drawn arenas (`data/arenas.ts`: forest/castle/desert/mountain/volcano/night-village) cycle every 3 waves; everything is canvas vector + emoji, all SFX are Web Audio synthesis (`utils/audio.ts`). No image assets.

**Gesture mapping (decided):** aim uses the **palm centre `lm[9]`** (mirror-X) because it stays stable across both open hand and fist — unlike the fingertip, which curls. The launch **angle** is `atan2` from muzzle→reticle, forced rightward and clamped to `[AIM_MIN_DEG..AIM_MAX_DEG]`; a live dotted **trajectory arc** previews the shot.
- **Charge throw (primary):** closed fist (`isFist`, ≥3 curled) charges a power meter over `CHARGE_MS`; opening the hand releases the throw (power → launch speed). Edge-detected via the engine's `charging` flag.
- **Quick throw (secondary):** pinch (`lm[4]`↔`lm[8]`) fires instantly at `QUICK_POWER`, gated on `!fist`. A `throwMode` setting selects Fist / Pinch / Both.
- **Dodge:** fast horizontal palm velocity (`SWIPE_VX`) grants a brief invulnerable window (`DODGE_MS`).
- **Menus + pause:** dwell-to-select (`DwellLayer`/`DBtn`; `[data-hud-id]` + per-frame dwell loop in `GameScreen`).

**Combat model:** `game/engine.ts` (`GameEngine` class, `update`/`render`/`getHud`). Enemy roster + per-wave composition is data (`data/enemies.ts`): 7 regular kinds (grunt, runner, heavy=2 body hits, archer=ranged/holds back, shield=blocks frontal body hits → must headshot, jumper=hops/airborne-bonus, ninja=teleports) + a **giant boss every 5th wave** (`isBossWave`, HP bar, 3-spear barrages + adds). Headshots (head circle) one-shot non-bosses and score double; body hits use HP. Enemies telegraph a **wind-up (`ENEMY_WINDUP_MS`)** before lobbing a gravity-arced spear at the player; reaching the player = contact hit. Player has mode-defined hearts + i-frames; 0 hearts = game over. Player spears sub-step (×3) to prevent tunnelling; support **power-ups** (`triple`/`pierce`/`explosive`/`slowmo`/`shield`/`rapid`) that drop on kills and **home to the player** (no movement needed by the stationary player) plus a heart drop.

**Modes (`data/modes.ts`):** Endless Survival (primary), Time Attack (180s), One Life (1 heart), Headshots Only (body hits only stagger). **Economy:** coins from kills/headshots/bosses unlock 10 cosmetic spear skins (`data/skins.ts`, `buySkin`/`selectSkin`). **Achievements** (`data/achievements.ts`) checked against cumulative+best stats at game over. **Scoring:** body 100 / head 250 (×`scoreMult` per kind) × combo (1×→10×, reset on damage) + airborne/long/wave-clear/perfect-wave bonuses; boss = 2000×combo.

**Score submission:** App posts `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` on the Results screen. **Persistence (localStorage):** `spear-stickman:progress` (coins, per-mode highScore, bestWave, unlockedSkins, selectedSkin, achievements, cumulative stats) + `spear-stickman:settings` (sensitivity, smoothing, throwMode, sound, left-handed, high-contrast, aim-assist, tutorialDone).

**Deferred (not built in v1):** Chaos/Rapid-Fire/Daily-Challenge modes, the full original power-up list (freeze/lightning-chain/magnet/critical/double-coins), destructible/moving platforms, multi-spear ninja barrages, the larger arena/weapon-mode breadth, and an in-game pause→settings panel. The data-driven enemy/arena/mode/skin tables leave room to add these without restructuring.

**Build verification:** the game's own `tsc -p tsconfig.app.json` + `vite build` are clean and copied via `node scripts/build-games.js spear-stickman`. Like all other gesture games it is a standalone static build, not part of the repo-root Next build graph.

**Files added:**
- `games/spear-stickman/` — full Vite project (`src/App.tsx`, `hooks/useMediaPipe.ts`, `utils/{constants,gestures,audio,storage}.ts`, `data/{arenas,enemies,modes,skins,achievements}.ts`, `game/engine.ts`, `components/{GameScreen,menus}.tsx`, `main.tsx`, `index.css`)
- `public/games/spear-stickman/` — built dist (index.html + assets/)
- `src/games/registry.ts` — added `spear-stickman` entry
- `supabase/seed_spear_stickman.sql` — upsert-safe game row (Action, published, featured)

---

## ADR-032 — Gesture Snake Arena game
**Date:** 2026-06-30
**Status:** Accepted

**Summary:** Original gesture-controlled snake arena game built for KinetoFun. The player steers a growing snake using MediaPipe hand tracking — no keyboard or mouse required.

**Game name:** Gesture Snake Arena
**Game slug:** `gesture-snake-arena`

**Controls:**
- **Hand position** relative to frame center → snake heading (analog direction)
- **Hand distance** from center → speed (near=slow, far=fast, fully analog)
- **Closed fist** → temporary speed boost (leaves glowing trail, drains length, 2s cooldown)

**Architecture:**
- Vite + React 18 + TypeScript + TailwindCSS + Framer Motion + Zustand
- Pure HTML5 Canvas 2D — no game engine, no physics library
- MediaPipe Tasks Vision `HandLandmarker` (single hand, GPU delegate)
- Modular `src/` layout: `game/{arena,camera,snake,ai,collectibles,collisions,particles,renderer,audio}`, `gestures/`, `hooks/`, `stores/`, `components/{game,ui}`, `utils/`, `types/`, `constants/`

**Key systems:**
- **Camera:** `game/camera/Camera.ts` — smooth lerp follow with look-ahead, adaptive zoom (small snake→zoom in, large snake→zoom out), world↔screen projection
- **Player snake:** `game/snake/Snake.ts` — smooth curved body (segment chain), cartoon head with blink + mouth animation, wave animation, boost with length drain, combo timer, power-up state
- **AI snakes (20):** `game/ai/AISnake.ts` — 5 behaviors (collector, hunter, defender, opportunist, wanderer); boundary avoidance, boost logic, behavior timer cycling
- **Collision:** `game/collisions/CollisionSystem.ts` — `SpatialGrid` (uniform grid, cell ≈ 6×SNAKE_RADIUS) for AI-body vs player, player-body vs AI-head, head-vs-head; orb+powerup pickup radius; ghost/shield bypass
- **Particles:** `game/particles/ParticleSystem.ts` — object pool (3000 slots); emitters: explosion, pickup, boost, combo, powerup, ambient, firefly
- **Renderer:** `game/renderer/Renderer.ts` — layered: background, floor grid, decorations, border, orb glows, orbs, power-ups, AI bodies, player body+head, particles, floating text; minimap in `renderMinimap`
- **Arena:** 6000×6000 world, 400 procedural decorations, randomly rotated themed environments (8 themes); soft border repulsion + danger zone visualization
- **Collectibles:** 300 energy orbs (5 tiers: blue/green/purple/gold/rainbow), 8 power-ups (shield/magnet/double_score/ghost/freeze/giant_energy), animated glow + bob
- **Scoring:** Survival seconds + orb value × combo × scoreMultiplier; kill bonus; combo ramp (up to ×10); floating score texts
- **Quest system:** 3 random quests per game (6 quest types), coin rewards on completion
- **Cosmetics:** 11 skins, 7 head accessories, 7 trails — coin-gated unlocks; selected skin colors passed to renderer
- **Audio:** Web Audio API, generative ambient music (scale-based random notes); SFX: pickup, boost, death, kill, powerup, combo

**State pattern:** `useGameEngine` hook holds all mutable game state in a `useRef<GameState>` to avoid React re-renders from physics; React state is updated every ~100ms for HUD. `loopRef.current = gameLoop` pattern prevents circular `useCallback` reference (same pattern as ADR-031).

**Performance targets:** 60 FPS with 20 AI snakes, 300+ orbs, 3000-particle pool. AI body collision uses spatial grid (insert every 3rd segment). AI snakes skip freeze updates when freeze power-up active. Offscreen particles auto-expire.

**Files added:**
- `games/gesture-snake-arena/` — full Vite project
- `public/games/gesture-snake-arena/` — built dist
- `src/games/registry.ts` — added `gesture-snake-arena` entry
- `supabase/seed_gesture_snake_arena.sql` — upsert-safe game row (Action, published, featured)

---

## ADR-033 — Maze Muncher: Gesture Edition game
**Date:** 2026-07-01
**Status:** Accepted

**Decision:** Add a fully gesture-controlled, original maze-chase arcade game (`games/maze-muncher/`) as a Vite + React + TypeScript app built to `public/games/maze-muncher/` and served in an `<iframe>` via the existing play screen — identical delivery pattern to every other gesture game (ADR-025–032). Per the brief this **captures the maze-chase core loop** (collect orbs, avoid hunters, power mode turns the tables) with entirely original naming, visuals, mazes, and enemy design — not a Pac-Man reskin. Every interaction, including all menus, is gesture-only: no mouse, keyboard, or touch anywhere in the app.

**Movement model:** Player and enemies hold continuous float `(col, row)` grid coordinates (`types/GameTypes.ts`). Direction changes only commit when the player is centered in a cell (`utils/grid.isAtCellCenter`) **and** the maze has no wall in the desired direction (`isOpen`) — this alone enforces "only turn at valid intersections" without a separate intersection whitelist, since a wall makes an illegal turn geometrically impossible anyway. The gesture layer continuously reports a desired direction (or `null` = "no signal, keep steering the same way"); `GameEngine` buffers it in `player.desiredDir` and applies it the moment a legal opening appears — classic arcade turn-buffering with no extra state machine.

**Maze generation (`game/MazeGenerator.ts`):** A seeded mulberry32 PRNG drives a randomized recursive-backtracker (perfect maze) per one of **10 fixed seed configs** (`MAZE_SEEDS`, one per neon color theme), then a loop-carving pass knocks down a seed-tuned fraction of remaining interior walls to add Pac-Man-style cycles and shortcuts (a "perfect" maze alone is all dead-ends-and-corridors with no loops, which reads as claustrophobic and makes chase AI trivial to escape). A classic **warp tunnel** row wraps left↔right (`grid.ts` special-cases `isOpen`/`stepCell` for `maze.warpRow`, independent of the wall flags so gameplay logic and rendering can't disagree). Power orbs are placed at the maze's farthest dead ends from the enemy base (BFS distance), giving a deliberate risk/reward "run to the corner" dynamic; a soft red radial tint renders around the enemy base as a "risk zone" cue. This is a deliberate scoping choice versus 10 hand-authored ASCII layouts: deterministic per seed (same maze every time that level is reached), visually and structurally distinct per theme, and it eliminates by construction the class of bugs hand-authored mazes are prone to (disconnected regions, unreachable orbs).

**Enemy AI (`game/EnemyAI.ts`):** Four original hunters, all built on one shared unweighted-BFS pathfinder (`utils/grid.bfsFirstStep`) since maze edges are uniform-cost — no A* needed. **Chaser Drone** — BFS straight to the player's current cell every time it re-centers in a cell. **Ambush Bot** — projects the player's cell forward 4 tiles along their current heading (clamped to the grid) and BFS-paths to that predicted cell, falling back to the player's actual cell if the projection is unreachable. **Patrol Sentinel** — a deterministic **right-hand wall-follower** (`TURN_RIGHT`/`TURN_LEFT` priority order in `grid.ts`) that traces a repeating loop with no precomputed route data at all — simpler and just as "patrol-like" as a stored path. **Rogue Hunter** — picks a random open non-reverse direction, with a 35% chance to instead greedily minimize Manhattan distance to the player, giving "sometimes predictable, mostly not." **Frightened mode** (8s on power-orb pickup, shortened slightly per level) overrides all four with a flee-toward-max-distance decision and a slowed speed; "eaten" enemies BFS straight back to the enemy-home cell at 2.4× speed and resume normal behavior on arrival — that return trip **is** the respawn delay, no separate timer needed.

**Difficulty/level progression (`game/LevelManager.ts`):** Enemy roster grows 2 (patroller+chaser) → 3 (+ambusher) → 4 (+hunter) across levels 1–3, then holds at 4 while enemy speed and level continue to climb; `mazeIndex = (level-1) % 10` cycles the 10 seeded sectors, with a `difficultyTier = floor((level-1)/10)` bump to enemy speed once the cycle repeats so replays past level 10 keep getting harder rather than looping identically.

**Gesture system:** One shared MediaPipe `HandLandmarker` instance (`hooks/useMediaPipe.ts`, single hand, GPU delegate) feeds **both** gameplay and menus — there is exactly one `getUserMedia` call for the whole app, avoiding the double-camera-stream problem that would occur if menus and gameplay each owned their own tracker. `HandData` adds thumbs-up/victory-sign detection on top of the existing fist/open/pinch heuristics (tip-vs-PIP-joint distance-from-wrist curl detection, no ML gesture classifier needed for 21 landmarks). **Movement:** `DirectionZoneTracker` (`hooks/useGestureControl.ts`) EMA-smooths palm position and buckets the offset from a calibratable center into one of 4 zones past a dead-zone, run straight from the game's own RAF loop (no extra hook-driven render). **Menus:** `GestureDetector.tsx` reuses the exact dwell-to-select pattern from ADR-025–032 (`DwellButton`/`data-dwell-id`, hover 1.2s = `MENU_DWELL_MS` auto-click) but takes the shared `handRef` as a prop instead of owning its own camera, since the camera is now a whole-app singleton. **Pose gestures:** `HeldGestureTracker` (`GESTURE_HOLD_MS` = 700ms) is a tiny reusable "hold this boolean predicate for N ms, fire once" state machine — open-palm→pause, fist→resume, thumbs-up→confirm/continue, victory-sign→restart — each owned by the screen it applies to (`GameCanvas` for pause, `PauseScreen`/`LevelCompleteScreen`/`GameOverScreen` for the rest) rather than centralized, since each is only ever relevant on one screen.

**Rendering:** Single full-screen canvas, `GameEngine.render` recomputes a `cellSize`/offset layout to fit the maze to the viewport (`computeLayout`, re-run on resize) and caches wall geometry as one `Path2D` (rebuilt only on layout change, not per frame) for a single glow-stroked `ctx.stroke()` call instead of per-cell draws. All visuals are canvas vector shapes + emoji — no image or audio assets; SFX is pure Web Audio synthesis (`game/audio.ts`, oscillator+gain envelopes, same idiom as every prior gesture game's audio module).

**Score submission:** App posts `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` on game over (not per-level). **Persistence (localStorage, `utils/storage.ts`):** `maze-muncher:save` — settings (sensitivity, smoothing, dead-zone, sound/music/sfx volume, high-contrast, colorblind, large-UI, left-handed, show-FPS, aim-assist/turn-assist) + top-10 high scores + last hand calibration point.

**Verification:** `tsc --noEmit` + `vite build` clean; built via `node scripts/build-games.js maze-muncher` into `public/games/maze-muncher/`. Additionally smoke-tested end-to-end with a headless-Chromium Playwright driver (`chromium-cli` unavailable in this environment, so a small ad hoc script using the `playwright` package was used instead) against `npm run dev`: main menu renders with zero console errors, and simulating an untrusted dwell-click (matching how `GestureDetector` itself synthesizes clicks) through to the gameplay screen confirmed the maze, walls, orbs, power orbs, a spawned bonus gem, the Chaser Drone enemy, the player character, and the full HUD all render correctly, with wall-collision correctly holding the player at spawn when no hand is present.

**Deferred (per this scoping):** two-hand detection, hardware/Raspberry Pi input (out of scope per the platform's current phase — see Phase 4 in the roadmap), colorblind palette beyond the settings toggle scaffold (enemy shapes are already distinguishable by silhouette/behavior, but no dedicated colorblind color remap was built), a stored/precomputed Patrol Sentinel route (superseded by the wall-follower, which is strictly simpler and behaviorally equivalent).

**Files added:**
- `games/maze-muncher/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `components/{CameraFeed,GestureDetector,GameCanvas,HUD,MainMenu,HowToPlayScreen,SettingsScreen,HighScoresScreen,CountdownOverlay,PauseScreen,LevelCompleteScreen,GameOverScreen}.tsx`, `game/{MazeGenerator,EnemyAI,CollisionSystem,ScoreSystem,LevelManager,GameEngine,ParticleSystem,audio}.ts`, `hooks/{useMediaPipe,useGestureControl,useGameLoop}.ts`, `types/GameTypes.ts`, `utils/{grid,storage}.ts`)
- `public/games/maze-muncher/` — built dist
- `src/games/registry.ts` — added `maze-muncher` entry
- `supabase/seed_maze_muncher.sql` — upsert-safe game row (Action, published, featured)

---

## ADR-034 — Flag Quest: World Colors game
**Date:** 2026-07-01
**Status:** Accepted

**Decision:** Add a fully gesture-controlled, original educational flag-painting game (`games/flag-quest/`) as a Vite + React + TypeScript app built to `public/games/flag-quest/`, served in an `<iframe>` via the existing play screen — same delivery pattern as every prior gesture game (ADR-025–033). Requested as "inspired by Flag Paint: World Tour" — the core loop (paint missing flag regions with the correct color via gesture) is captured, but every asset is original: procedurally generated flag geometry (not traced SVGs), original naming/branding ("Flag Quest: World Colors", not "Flag Paint"), original UI/animations/audio. No mouse, keyboard, or touch anywhere, including menus.

**Flag data model (`flags/shapes.ts`, `flags/data/*.ts`):** Every flag is `{ viewBox, regions: [{ id, colorId, points }] }` where `points` is a polygon in flag-local coordinates, doubling as both the SVG render geometry and the hit-test geometry — no separate mask/collision format. Rather than hand-authoring ~31 sets of coordinates from scratch, a small library of layout generators (`horizontalStripes`, `verticalStripes`, `weightedHorizontalStripes`/`weightedVerticalStripes`, `fieldWithCanton`, `circleOnField`, `offsetCross` — with an optional inner band for double-fimbriated Nordic crosses like Norway, `saltireQuadrants`/`saltireBands`, plus primitive `star`/`diamond`/`thickLine`/`halfDisc` polygon builders) covers most real flag layouts from a few parameters; a handful of genuinely bespoke flags (South Africa's Y-pall, a simplified Union Jack, Jamaica's saltire, Brazil's diamond+circle) are hand-composed from the same primitives as tiled, edge-sharing polygons with no gaps (verified by construction, not by chance — every bespoke layout was checked so no region is fully occluded by ones drawn after it, since an unreachable region would soft-lock 100% completion). Regions are drawn **and hit-tested in the same array order**, both top-to-bottom in the sense that a later region in the array renders on top and is tested first — this single convention is what lets cantons, crosses, and saltires be expressed as plain overlapping rectangles/triangles instead of concave punch-out polygons. 31 flags ship across all 6 continents with difficulty (easy→expert) driven by each flag's real color/region count, not an artificial modifier.

**Painting engine (`game/PaintEngine.ts`):** A plain class (not a hook) holding per-region `{state, progress}`, driven every frame by `update(cursorLocal, selectedColor, dt)`. Hit-testing walks the region array in reverse (topmost-first) skipping already-complete regions. Correct-color dwell fills at a fixed rate (halved under the "slower painting" accessibility setting) and fires `onProgress`/`onRegionComplete`; wrong-color dwell requires a **0.28s continuous hold** before it counts as a mistake (not an instant fail on a passing swipe) and knocks back up to 25% of that region's progress rather than resetting it to zero — deliberately forgiving per the brief's "no harsh punishment." `FlagCanvas.tsx` runs this engine from its own RAF loop reading the shared hand-tracking **ref** (not React state), and writes fill progress straight to each SVG `<polygon>`'s `fill-opacity` attribute via a ref map instead of React state — at up to 60fps across many regions, going through `setState` per region would be needless re-render churn; only region-complete/mistake events (which are rare, not per-frame) cross into React state in the parent `GameplayScreen`.

**Gesture system:** A single `GestureProvider` React context (`mediaPipe/GestureProvider.tsx`) wraps the whole app and owns the one `HandLandmarker`/camera session, exposing both a `frame` **state** value (for menu hover, which is fine to re-render on) and a same-data `frameRef` **ref** (for anything running its own RAF loop — the paint engine, the pause/hint loop in `GameplayScreen`) from a single `onFrame` callback that writes both — avoiding a second camera stream the way the sibling games' separate "menu" vs "gameplay" MediaPipe hooks would. `HoverButton` (700ms default, 500ms on the paint palette per the brief) and `GestureSlider` (value follows fingertip X live while hovering the track, since there is no drag gesture) are the two reusable gesture-input primitives every screen is built from; both intentionally list only primitive numbers (`frame.cursorX`/`cursorY`) in their effect deps, not the whole `frame` object, so they only re-run on an actual position change. `classify()` in `handTrackingCore.ts` derives open-palm/fist from fingertip-to-palm-center spread relative to a wrist→middle-MCP hand-scale reference (no separate ML gesture classifier) — reused for the pause (open palm, 650ms hold) / resume (fist, 650ms hold) convention already established by Maze Muncher (ADR-033).

**Hint system:** Purely visual, not a free-progress shortcut, matching the brief's 10s/20s/30s escalation: idle time is measured from the last successful fill tick; stage 1 glows the whole flag-canvas border; stage 2 adds a CSS pulse (`fq-hint-pulse`) to the first incomplete region's outline via a small imperative handle (`FlagCanvasHandle.setRegionPulsing`) rather than plumbing hint state as props into the SVG tree; stage 3 additionally highlights the correct color's name under the canvas.

**Scoring (`game/scoring.ts`):** Region score = a per-difficulty base × a combo-tier multiplier (×2/×3/×5/×10 at streaks of 2/3/5/10) that resets on any mistake; medal (bronze/silver/gold/perfect) is purely a function of elapsed-time ÷ target-time, decoupled from the star rating, which instead requires near-zero mistakes and high first-try accuracy — so a slow-but-perfect painter still gets 3 stars even without a fast medal. Score/combo/mistake counters live in `useRef`s mirrored into `useState` only for display, specifically so the `onRegionComplete`/`onMistake` callbacks never need a functional `setState(prev => ...)` updater — React 18 `StrictMode` double-invokes updater functions in dev, which would have double-counted score and combo.

**Progression & persistence:** Zustand `persist` (localStorage) for both `settingsStore` (music/SFX volume, difficulty, dominant hand, mirror, colorblind/high-contrast/larger-cursor/slower-painting/narration) and `progressStore` (stars/best-score/best-time per flag, unlocked continents/countries, achievements, endless best score). Continents unlock at `totalStars >= continentIndex × 10`; within an unlocked continent, completing a country unlocks the next one in that continent's list — giving a clear linear path without hand-authored unlock tables. 8 achievements are recomputed (not stored redundantly) from save-data each time a level result comes in.

**Modes:** World Tour (continent map → country grid, locked tiles show 🔒), Practice (grid of all unlocked flags, unlimited time, hints on, score intentionally not accumulated — `GameplayScreen` skips all `setScore` calls when `mode === 'practice'`), Endless (`pickEndlessFlag(round)` samples from a difficulty-sorted list in a window that slides forward with the round number, so difficulty trends upward without a hard level table). All three funnel through the same `GameplayScreen`/`EndScreen` pair.

**Score submission:** `App.tsx` accumulates `sessionScoreRef` across every completed level in the platform session and posts `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` when the player hovers Exit from the main menu — there is no per-game scores table to create; `public/scores` already has a generic `game_id text references games(id)` column, so registering the game in `public.games` (via `supabase/seed_flag_quest.sql`) is the only DB step required, same as every other gesture game.

**Verification:** `tsc --noEmit -p tsconfig.app.json` and `vite build` both clean; built via `node scripts/build-games.js flag-quest` into `public/games/flag-quest/` (456KB JS / 19KB CSS gzipped to 144KB/4.5KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera is available in this build environment, so the hand-tracking/gesture flows could not be exercised live end-to-end here — verify camera calibration, dwell-select timing, and paint-fill feel in a browser with a webcam before shipping.

**Deferred (per this scoping):** the full ~195-country UN roster (31 flags across all 6 continents ship now, chosen to cover the full easy→expert range and every generator; the data model supports adding more without code changes), a colorblind-safe glyph overlay drawn directly on the flag canvas (the palette swatches show pattern glyphs in colorblind mode; the flag surface itself does not), audio narration (toggle exists in Settings but has no synthesized speech behind it yet — no TTS dependency was pulled in for this pass), two-hand support (single-hand only, matching every prior gesture game).

**Files added:**
- `games/flag-quest/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `flags/{shapes,palette,index}.ts` + `flags/data/{europe,asia,africa,northAmerica,southAmerica,oceania}.ts`, `game/{PaintEngine,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `particles/particleSystem.ts`, `utils/geometry.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed}.tsx`, `components/menu/{CalibrationScreen,MainMenu,WorldTourMap,CountrySelect,PracticeSelect,GalleryScreen,SettingsScreen}.tsx`, `components/game/{FlagCanvas,ColorPalette,HUD,FlagPreview,GameplayScreen,EndScreen}.tsx`)
- `public/games/flag-quest/` — built dist
- `src/games/registry.ts` — added `flag-quest` entry
- `supabase/seed_flag_quest.sql` — upsert-safe game row (Puzzle, published, featured) + a commented example leaderboard query

---

## ADR-035 — Shape & Color Sorter game
**Date:** 2026-07-01
**Status:** Accepted

**Decision:** Add a small, gesture-only educational sorting game (`games/shape-color-sorter/`) for the youngest KinetoFun players (ages 3-6), built to `public/games/shape-color-sorter/` and served the same way as every prior gesture game. This one was explicitly requested as a **small** follow-up after Flag Quest (ADR-034) — the user rejected a first round of bigger ideas (Solar System Quest, Animal Kingdom Safari, Gesture Escape Room, Full-Body Fitness Coach) and asked for "simple games but educational." The scoping decision that follows from that: **one mechanic, no fail state, no timer pressure, no score penalty** — sort a shape into the matching basket by hovering it.

**Reuse over rebuild:** Rather than re-deriving the gesture stack, this project ports Flag Quest's proven building blocks near-verbatim: `mediaPipe/{handTrackingCore,GestureProvider}` (single shared `HandLandmarker` session, dual ref+state write), `components/common/{HoverButton,ProgressRing,GestureCursorDot,HandLostOverlay,CameraFeed,GestureSlider}`, `hooks/useDwellProgress`, and the `audio/sound.ts` Web Audio synthesis idiom (tone/gain-envelope helper). This is a deliberate consequence of the "simple" requirement — the interaction model (hover-to-select) doesn't change between games, so the fastest way to a *polished* simple game is copying infrastructure that's already typecheck-clean and battle-tested, and spending the actual new-code budget on the few things that are genuinely game-specific.

**Why no hit-testing engine this time:** Flag Quest needed SVG-polygon point-in-polygon hit-testing because paint regions are arbitrary flag shapes with a fill-progress mechanic. Here, "regions" are just baskets — plain rectangular `HoverButton` dwell zones — so `game/roundLogic.ts` only needs to pick a shape+color prompt and generate N-1 distinct distractor baskets (`generateRound`), no geometry at all. Shapes render via `components/common/ShapeIcon.tsx`, six inline SVG primitives (circle/square/triangle/star/heart/diamond) built from basic shapes/polygons/a heart path — no traced art, same "original assets" standard as every prior game.

**Modes & progression:** Sort by Shape, Sort by Color, and Mixed (both) are three separate prompt/basket-generation branches in `generateRound`, not three separate game modules — the same `GameplayScreen`/`Bin`/`PromptDisplay` trio handles all three, switching what a basket *displays* (shape only in Shape mode rendered in a neutral gray so color can't leak as an unintended hint, a plain circle swatch in Color mode so shape can't leak, both in Mixed mode) and what counts as correct. Basket count ramps 2→3→4 across a fixed 12-round session (`binCountForRound`) rather than a difficulty-tier system, since there's only one difficulty axis worth exposing to a 3-year-old: how many choices they're juggling at once.

**No-penalty scoring (`game/scoring.ts`):** A wrong basket never subtracts points, never adds a mistake-triggered animation beyond a gentle CSS wobble (`.scs-wobble`) and a soft descending tone (`playTryAgain`, deliberately gentler than Flag Quest's harsher `playWrong` sawtooth — this audience shouldn't hear anything that reads as "you failed"). Score only rewards first-try correctness (`RoundTally.correct`) with a small, uncapped-downside speed bonus; `finalizeSession`'s star calculation starts at `1` and only upgrades to `2`/`3` on higher accuracy — it can never reach `0`, meaning **every completed session earns at least one star**, regardless of how many baskets were tried. This is the concrete mechanism behind "no harsh punishment," not just a UI intention.

**Narration:** One genuinely new capability versus Flag Quest — `audio/sound.ts` adds `speak(text, enabled)`, a thin wrapper around the browser's built-in `SpeechSynthesisUtterance` (no TTS dependency pulled in), gated by the "Say the Name Aloud" setting and fired ~400ms into each round so it doesn't talk over the pop-in animation.

**Calibration:** Shortened to 2 steps ("show me your hand" → "point at the star") from Flag Quest's 6-step flow (`components/menu/CalibrationScreen.tsx`), reusing the exact same hold-or-timeout dwell pattern — appropriate for a much younger, lower-patience audience where a long calibration flow would itself be the biggest churn risk.

**Score submission:** Same contract as every other game — `App.tsx` accumulates a `sessionScoreRef` across completed sessions and posts `window.parent.postMessage({ type: 'GAME_COMPLETE', score }, '*')` on Exit from the main menu. No new DB table: `public.scores` already has the generic `game_id` FK, so `supabase/seed_shape_color_sorter.sql` registering the game in `public.games` is the only DB step.

**Verification:** `tsc --noEmit -p tsconfig.app.json` and `vite build` both clean on the first pass (no iteration needed, unlike Flag Quest's UK/South Africa/Chile polygon fixes — a direct consequence of reusing proven infrastructure and avoiding hand-authored geometry entirely this time); built via `node scripts/build-games.js shape-color-sorter` into `public/games/shape-color-sorter/` (419KB JS / 15.6KB CSS gzipped to 134.6KB/3.9KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera available in this build environment, so gesture/dwell timing and the narration toggle could not be exercised live — verify in a browser with a webcam before shipping.

**Deferred (per this scoping):** more shapes/colors beyond the 6×6 set (kept small on purpose — six of each is already plenty for a 4-basket max session and keeps every basket visually distinct at a glance), a fourth "Both, harder" tier with near-miss distractors (e.g. same shape different color as a decoy) since the current Mixed mode already regenerates fully random combos, achievements surfaced anywhere outside the end screen (no dedicated achievements gallery screen, unlike a future possibility), two-hand support (single-hand only, matching every prior gesture game).

**Files added:**
- `games/shape-color-sorter/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/{shapes,colors}.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,ShapeIcon}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,Bin,GameplayScreen,EndScreen}.tsx`)
- `public/games/shape-color-sorter/` — built dist
- `src/games/registry.ts` — added `shape-color-sorter` entry
- `supabase/seed_shape_color_sorter.sql` — upsert-safe game row (Puzzle, published, featured, age_group `3-6`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-036 — Alphabet Zoo game
**Date:** 2026-07-01
**Status:** Accepted

**Decision:** Add Alphabet Zoo, a toddler-friendly (ages 3–6) letter-recognition and early-phonics game to `games/alphabet-zoo/`, built to `public/games/alphabet-zoo/` and served the same way as Flag Quest (ADR-034) and Shape & Color Sorter (ADR-035). This is the **third game** built using the same gesture-only reusable stack, which now proves that the "port infrastructure, not the logic" approach dramatically reduces iteration and risk. Alphabet Zoo's scope is deliberately smaller than Shape & Color Sorter: a single mechanic (point-at-letter hover-to-select), a single axis (26 letters, not a 2D grid), and no painted regions — just letters.

**Why reuse again (three times is the pattern):** The cost of re-deriving the gesture stack for a third time would be: the same MediaPipe initialization dance, the same `useGesture` context, the same dwell-progress hook, the same audio synthesis idiom, the same Zustand persist pattern. None of this differs between games. By porting verbatim from Shape & Color Sorter (which ported from Flag Quest), the only new code is what changes: letter data, letter prompts, letter bins, and the specific UI. Result: Alphabet Zoo built and typechecked clean on the first pass—no "fix UK flag polygon edge cases" iteration, no debugging hand-tracking edge cases, just game logic.

**Game design:** A letter glyph (or animal emoji in "Animal Sounds" mode) bobs center-stage. The player hovers a fingertip over the matching **letter button** (~600ms dwell) to score. Wrong letters wobble + soft tone, no penalty ever. Three modes: **Letter Match** (bare letter glyphs, teaches shape recognition), **Animal Sounds** (emoji + word, teaches letter-to-sound, e.g., "L is for Lion"), **Mixed** (random pick each round). 26 letters (A–Z), each with one animal/word + emoji. 10-round sessions, bin count ramps 2→3→4.

**Prompt representation (PromptDisplay):** Shows the letter differently per mode (bare glyph, emoji+word, or both), so the player's mental model builds differently in each mode — Letter Match teaches visual recognition, Animal Sounds teaches phonics, Mixed mixes both.

**Bins:** Just letter-button `HoverButton` zones (`components/game/LetterBin.tsx`), not painted regions — `game/roundLogic.ts` picks a target letter and generates N-1 distractors, no hit-testing engine needed.

**Scoring:** Exact same `finalizeSession`/`RoundTally` logic as Shape & Color Sorter — first-try correctness only, speed bonus, no negative scoring, minimum 1 star.

**New achievement:** One novel per-game mechanic—**A to Z** (seen all 26 letters across all sessions). Tracked via `lettersSeen: string[]` in `SaveData`, updated by `GameplayScreen` on each round start, checked in achievement logic.

**Narration:** The third (and probably the most important) use of the `speak()` function from `audio/sound.ts`. Per round: "Letter A", "A is for Ant", or "Ant, A" depending on mode, ~400ms into the round pop-in animation. Gated by the narration setting (same as the last two games).

**Data files:** `data/letters.ts` — 26 entries `{ letter, word, emoji }`, with `getLetterEntry(letter)` and `randomLetter(exclude?)` helpers, same shape as the `shapes.ts`/`colors.ts` modules from the prior games. Built once, reused by both prompt selection (`roundLogic.ts`) and narration text generation (`GameplayScreen.tsx`).

**Verification:** `tsc --noEmit` and `vite build` both clean on the first pass — no types iteration needed, a direct result of reusing proven infrastructure three times. Built via `node scripts/build-games.js alphabet-zoo` into `public/games/alphabet-zoo/` (418KB JS / 15.9KB CSS gzipped to 134.2KB/3.9KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment, so gesture/dwell timing and narration output could not be exercised live — recommend a quick webcam pass before shipping.

**Files added:**
- `games/alphabet-zoo/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/letters.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,Bin,GameplayScreen,EndScreen}.tsx`)
- `public/games/alphabet-zoo/` — built dist
- `src/games/registry.ts` — added `alphabet-zoo` entry
- `supabase/seed_alphabet_zoo.sql` — upsert-safe game row (Puzzle, published, featured, age_group `3-6`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-037 — Mob Rally: Gesture Crowd Runner game
**Date:** 2026-07-02
**Status:** Accepted

**Decision:** Add `games/gesture-mob-rally/` ("Mob Rally"), a gesture-only crowd-runner game inspired by the *gameplay style* of Count Masters — grow a crowd, steer through multiplier gates, dodge obstacles, crash into rival crowds, beat bosses, smash a castle — with no copied assets, names, art, sounds, or code. This is by far the largest single game built to date: a full procedurally-generated endless-runner engine (flocking crowd simulation, pseudo-3D camera, level generation, boss/castle state machines) rather than a reuse of an existing gesture-stack lineage.

**Rendering: Canvas 2D + ported trapezoid projection, not Phaser.** The spec listed "Phaser 3 (recommended)" but every one of the 60+ existing games — including physics-heavy ones (`gesture-hill-adventure`'s Matter.js vehicle, `gesture-table-tennis`'s custom 3D-projected physics) — hand-rolls Canvas 2D with the same `useMediaPipe` (ref-based, no re-render) + `useGameEngine` (`loopRef` + RAF, delta capped at 50ms, all hot state in a mutable ref) pattern first established in ADR-025 onward. Introducing Phaser would be a first-of-its-kind dependency duplicating infrastructure the rest of the codebase already solves. The "third-person, behind-and-elevated, camera follows crowd" look instead comes from `game/camera/projection.ts`, a near-verbatim port of `gesture-table-tennis/src/renderer/projection.ts`'s trapezoid world→screen projection, renamed axes `(laneX, depthZ, height)` for a receding runway instead of a table.

**Crowd physics: hand-rolled boids steering, not Matter.js.** A crowd of up to ~550 pooled stick figures (`game/entities/UnitPool.ts`, same fixed-pool/`acquire`/`release` pattern as `ParticleSystem`) needs to spread, avoid overlap, hold formation, and dodge — not resolve rigid-body collisions. `game/systems/FlockingSystem.ts` runs per-unit separation (against a `SpatialGrid` uniform hash of grid-bucketed neighbors) + cohesion-to-assigned-formation-slot (`game/systems/CrowdController.ts` computes a rows/columns block layout per crowd size) each frame — cheap scalar arithmetic with no physics-engine broadphase/solver overhead, and it produces the requested "soft jostle and re-form" look rather than billiard-ball bouncing.

**World model: player is stationary in view, everything else scrolls.** The player crowd's world Z is pinned to `camera.depthOffset + PLAYER_FRONT_OFFSET` every frame (so it always renders at a constant near-camera depth); gates/obstacles/enemy crowds/boss/castle sit at fixed absolute world Z from level generation, and `camera.depthOffset` advances at `BASE_RUN_SPEED × difficulty.speedMultiplier`, sweeping them from horizon to player. Collisions are just "is this entity's `relZ` (`worldZ − camera.depthOffset`) within a small window of `PLAYER_FRONT_OFFSET`, and does its lane overlap the crowd's lane." Enemy-crowd fights, boss fights, and the castle siege all set a `frozen` flag that stops camera advance for the duration — a deliberate simplification so "the crowd stops and fights" reads clearly instead of models continuing to run through combat.

**Procedural levels are formula-driven, not tables.** `constants/difficultyConfig.ts`'s `computeDifficulty(levelIndex)` is a pure formula (speed/enemy-size/obstacle-frequency/gate-tier/boss-hp all scale with `levelIndex`, clamped) — difficulty scales forever with zero new data as levels increase. `game/level-gen/LevelGenerator.ts` builds a repeating gate/obstacle/enemy-crowd segment pattern (weighted-random pick from each `*Defs.ts` table, filtered by the current difficulty tier), inserts one boss segment every `LEVELS_PER_BOSS` (5) levels, and always closes with a castle segment; a seeded PRNG (`utils/mathUtils.ts`'s `createSeededRandom`) makes each level reproducible-but-varied. Adding a new obstacle/gate-op/boss/world is one data entry in its `*Defs.ts` table — no new engine branches.

**Launch content scope** (all data-driven, extensible without new code): 8 obstacle types (rotating hammer, swinging axe, moving wall, rolling barrel, spike trap, laser beam, crusher, saw blade), 8 gate effects (+5/+10/+15/+20/+40, x2/x3/x4, plus two "bad" gates for risk), 7 power-ups (shield/speed/magnet/freeze/mega-crowd/double-coins/invincibility), 2 boss archetypes (Warlord — melee/charge/summon; Siege Titan — ranged/stomp/summon), 4 worlds (Grassland/Desert/Snow/Volcano, cycling deterministically per level with jitter). `game/bosses/BossSystem.ts` reads phases/attack-patterns generically from `BossDef` data — no per-boss branching code, so a third/fourth boss is a pure content addition.

**Calibration: new subsystem, no existing sibling to copy wholesale.** Unlike the `gesture-snake-arena` lineage (no calibration screen, camera always hidden) or the `flag-quest` lineage (dwell-based, fingertip-pointing calibration), this game needed wrist-position/fist/palm-specific calibration with a visible preview. `gestures/useTrackingQuality.ts` (decoupled from `useMediaPipe`, samples the shared hand ref at 10Hz, derives Excellent/Good/Poor from rolling detection-rate + jitter) and `hooks/useCalibration.ts` (waiting → tracking → ready after 2s stable) drive `components/ui/CalibrationScreen.tsx`, which reuses `flag-quest`'s "second `<video>` mirrors the tracking video's `srcObject`" trick (`components/ui/CameraPreview.tsx`) for a visible preview, with a green bounding-box outline computed from landmark min/max, wrapped in one `scaleX(-1)` container so the mirrored video and the overlay box stay aligned. The shared tracking `<video>` stays hidden throughout (as in every sibling game); only this visible preview copy is shown, and only during calibration — auto-hidden once the 2s-stable threshold fires and the screen transitions to the main menu.

**Controls implemented exactly per spec:** wrist-X → EMA-smoothed (never-snapping) lane position; fist held 0.5s → 3s Charge Mode (glow, obstacle-destroy, 2.5× combat/boss/castle damage) with a 20s cooldown; open palm held 1s → pause, palm held again → resume. Camera device enumeration/selection (`gestures/useCameraDevices.ts`) and a fullscreen toggle are both wired into Settings/Calibration.

**Update (2026-07-02): menus are now gesture-only too.** The launch version above shipped with ordinary clickable menu buttons as a disclosed scope cut; the user asked for full gesture purity, so a second, independent gesture vocabulary was added purely for menu navigation — index-fingertip hover-dwell (~650ms), decoupled from the wrist/fist/palm vocabulary gameplay uses. `gestures/MenuCursor.tsx` (`MenuCursorProvider`/`useMenuCursorRef`) tracks landmark 8 (index tip) as a percent-space cursor in a ref (not React state, to avoid 60fps re-renders of the whole menu tree); `components/common/HoverButton.tsx` replaces every `<button onClick>` — each instance runs its own rAF loop comparing the shared cursor ref against its own `getBoundingClientRect()`, accumulating dwell time and firing `onSelect` once at threshold, with a bottom progress-bar + ring as feedback. `components/common/GestureSlider.tsx` replaces every `<input type="range">` (gesture sensitivity, music/SFX volume) — value follows the fingertip live while hovering the track, since no drag gesture exists. `components/common/CameraCycleButton.tsx` replaces the native camera `<select>` in both Settings and Calibration (native dropdowns can't be gesture-driven) — hovering it cycles through available devices. `components/common/GestureCursorDot.tsx` renders the visible fingertip cursor on every non-gameplay screen (and specifically during the in-canvas Game Over overlay, which is technically still the `'playing'` screen from `App.tsx`'s perspective). Every `MainMenu`/`ShopScreen`/`LeaderboardScreen`/`SettingsScreen`/`HowToPlay`/`Credits`/`GameOverScreen` button was converted; a repo-wide grep for `onClick`/`<select`/`<button`/`type="range"` in `games/gesture-mob-rally/src` now returns zero matches outside comments. The game is gesture-only end to end — gameplay and every menu.

**Audio: fully synthesized, no asset files** — `game/audio/audioSystem.ts` (Web Audio oscillator/gain-envelope SFX, same idiom as `gesture-snake-arena`'s `audioSystem.ts`) and `game/audio/musicSystem.ts` (new: per-environment looping generative music keyed off each `EnvironmentDef`'s root note/scale/tempo, switched via `setMusicEnvironment()` on every level transition).

**Verification:** `tsc --noEmit -p tsconfig.app.json` clean on the first pass; `vite build` clean (456KB JS / 16KB CSS, gzip 146KB/4KB); `node scripts/build-games.js gesture-mob-rally` → `public/games/gesture-mob-rally/`; `vite preview` smoke-checked (HTTP 200). No camera in this build environment — calibration flow, wrist-steering feel, charge-mode timing, and the full gate/obstacle/combat/boss/castle loop need a manual webcam pass before shipping, consistent with every prior gesture game's ADR note.

**Deferred (per this scoping):** the 3 remaining named worlds (Jungle/Cyber City/Sky Islands — pure `environmentDefs.ts` additions), additional boss archetypes beyond the 2 launch ones, gesture-dwell menu navigation (see limitation above), diamonds as a second currency (coins only at launch).

**Files added:**
- `games/gesture-mob-rally/` — full Vite project: `src/{App.tsx,main.tsx,index.css}`, `types/index.ts`, `constants/{gameConfig,difficultyConfig}.ts`, `utils/mathUtils.ts`, `gestures/{useMediaPipe,gestureRecognizer,useTrackingQuality,useCameraDevices}.ts`, `hooks/{useGameEngine,useCalibration}.ts`, `game/entities/{StickFigure,UnitPool}.ts`, `game/systems/{SpatialGrid,FlockingSystem,CrowdController,GateSystem,ObstacleSystem,PowerUpSystem,CombatSystem,BossSystem,CastleSystem,ComboSystem,ScoringSystem}.ts`, `game/level-gen/LevelGenerator.ts` + `segmentBuilders/{gateSegment,obstacleSegment,enemyCrowdSegment,bossSegment,castleSegment}.ts`, `game/{gates/{gateDefs,GateRenderer},obstacles/{obstacleDefs,ObstacleRenderer},bosses/{bossDefs,BossRenderer},powerups/powerupDefs,environments/environmentDefs,cosmetics/cosmeticDefs}.ts`, `game/camera/{projection,RunnerCamera}.ts`, `game/particles/ParticleSystem.ts`, `game/rendering/{SceneRenderer,StickFigureRenderer}.ts`, `game/audio/{audioSystem,musicSystem}.ts`, `stores/{useGameStore,useLeaderboardStore}.ts`, `components/game/{GameCanvas,PauseOverlay}.tsx`, `components/ui/{CalibrationScreen,CameraPreview,HUD,MainMenu,GameOverScreen,ShopScreen,LeaderboardScreen,SettingsScreen,HowToPlay,Credits}.tsx`
- `public/games/gesture-mob-rally/` — built dist
- `src/games/registry.ts` — added `gesture-mob-rally` entry
- `supabase/seed_gesture_mob_rally.sql` — upsert-safe game row (Action, published, featured, `category_id` looked up from `categories`, difficulty `medium`, age_group `8+`) + a commented example leaderboard query

---

## ADR-038 — Memory Match Zoo game
**Date:** 2026-07-01
**Status:** Accepted

**Decision:** Add Memory Match Zoo, a gesture-only card-flip concentration game, to `games/memory-match-zoo/`, built to `public/games/memory-match-zoo/` and served the same way as Flag Quest / Shape & Color Sorter / Alphabet Zoo. This is the fourth game in the small-and-simple family, and — unlike the second and third, which were straight re-skins of the point-and-hover-to-sort mechanic — the first to need a genuinely new interaction pattern: per-card reveal state, a two-card comparison step, and a timed "show the mismatch, then flip back" pause. It was chosen from a shortlist explicitly aimed at introducing a new genre (memory/pattern games) rather than another variation on the existing sorting mechanic.

**Game design:** A grid of face-down cards hides pairs of zoo animals. Hovering a card (~600ms dwell, same duration as every prior game) flips it face-up; flipping a second card triggers a compare step. A match locks both cards face-up permanently (chime + scale pop); a mismatch reveals both briefly (~900ms, enough time to register what was seen) then flips them back — no timer, no score penalty, no fail state, same house philosophy as every other KinetoFun gesture game. While two cards are being compared, the whole board is disabled (`locked` state, same pattern the other three games use to gate the round-transition window) so a third pick can't interrupt the reveal.

**Modes are grid sizes, not content axes:** Small Zoo (3 pairs/6 cards), Medium Zoo (6 pairs/12 cards), Big Zoo (8 pairs/16 cards) — since this game only has one kind of content (animal pairs), the natural difficulty knob is board size rather than a second attribute like Shape & Color Sorter's shape/color split or Alphabet Zoo's letter/animal split. Each mode is a single self-contained board, not a multi-round session — clear the board, see the end screen, matching how memory games are actually played.

**Scoring is flip-efficiency-based, not round-based:** the other three games' `RoundTally`/`finalizeSession` model assumes discrete rounds with a first-try/not-first-try flag; this game has no rounds, just a running flip count and mismatch count for the whole board. `game/scoring.ts`'s `finalizeSession(size, pairCount, flips, mismatches)` grades stars against a generous multiplier of the theoretical-minimum flip count (`pairCount * 2`), so a distracted player still finishes with 1★, and only genuinely strong recall earns 3★ — same no-negative-scoring floor as every prior game, just a different formula shape.

**Card flip animation:** `components/game/MemoryCard.tsx` uses a `scaleX(0)→scaleX(1)` crossfade rather than a true 3D `rotateY`/`backface-visibility` flip — simpler, more reliably cross-browser, and visually reads as "flip" well enough for the intended audience, consistent with keeping new-code scope small.

**State-management correctness note:** `GameplayScreen.tsx` mirrors `flips`/`mismatches` into refs (`flipsRef`/`mismatchesRef`) on every render — the same pattern the other three games use for their round tallies — so that when the board-complete `useEffect` fires (`matchedCount === pairCount * 2`), it reads the final flip/mismatch counts from the very render that set the last pair's `matched: true`, with no stale-closure risk, since refs assigned during render are guaranteed current before effects run.

**Narration:** Reuses `speak()` from `audio/sound.ts` (introduced in Alphabet Zoo) — on each flip, speaks the animal's name if Audio Narration is on.

**Achievements:** First Match, Small/Medium/Big Zoo Master (3★ in that mode), Perfect Memory (board cleared with zero mismatches), Memory Champion (10 sessions) — same shape as the achievement lists in the prior two games, via `stores/progressStore.ts`.

**Reused building blocks (fourth use of the same stack):** `mediaPipe/{handTrackingCore,GestureProvider}`, `hooks/useDwellProgress`, `components/common/{HoverButton,ProgressRing,GestureCursorDot,HandLostOverlay,CameraFeed,GestureSlider}`, `audio/sound.ts` (including `speak()`), `stores/settingsStore.ts`, `components/menu/CalibrationScreen.tsx` (2-step flow), the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage pattern, and `components/menu/SettingsScreen.tsx`/`components/game/EndScreen.tsx` (same structure, new copy and stat labels — Pairs/Flips instead of Correct/Rounds).

**Verification:** `tsc --noEmit` and `vite build` both clean, with one fix needed mid-build: a leftover `game/roundLogic.ts` copied wholesale from Alphabet Zoo's scaffold (referencing types/data that don't exist in this project) had to be deleted in favor of the new `game/boardLogic.ts` — the only iteration needed, and a scaffolding artifact rather than a logic bug. Built via `node scripts/build-games.js memory-match-zoo` into `public/games/memory-match-zoo/` (416KB JS / 15.2KB CSS gzipped to 133.7KB/3.8KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — gesture/dwell timing, the flip animation feel, and narration output could not be exercised live; recommend a quick webcam pass before shipping.

**Files added:**
- `games/memory-match-zoo/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/animals.ts`, `game/{boardLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{MemoryCard,GameplayScreen,EndScreen}.tsx`)
- `public/games/memory-match-zoo/` — built dist
- `src/games/registry.ts` — added `memory-match-zoo` entry
- `supabase/seed_memory_match_zoo.sql` — upsert-safe game row (Puzzle, published, featured, age_group `4-8`, difficulty `easy`) + a commented example leaderboard query
