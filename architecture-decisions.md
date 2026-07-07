# KinetoFun — Architecture Decisions

> Permanent technical decisions. **Append-only — no decision is ever overwritten.**
> Last updated: 2026-07-06 (ADR-049 — Cascade Arrows)

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

---

## ADR-039 — Clock & Time Teller game
**Date:** 2026-07-01
**Status:** Accepted

**Decision:** Add Clock & Time Teller, a gesture-only time-telling game, to `games/clock-time-teller/`, built to `public/games/clock-time-teller/` and served the same way as the sibling games. This is the fifth game in the small-and-simple family and, after Memory Match Zoo (ADR-038) introduced a new genre, it deliberately returns to the proven **hover-select-the-right-answer** mechanic from Flag Quest/Shape & Color Sorter/Alphabet Zoo rather than extending Memory Match Zoo's card-flip pattern — the user asked for "simple," not "a new genre," this time.

**Game design maps onto Alphabet Zoo's shape almost exactly:** one axis of content (a time-of-day value), presented two different ways, matched by hovering the right bin. **Read the Clock** shows an analog clock face as the prompt and digital-time bins as answers; **Set the Clock** shows a digital time as the prompt and analog clock-face bins as answers; **Mixed** randomly picks the direction each round. No drag/rotary hand-setting UI was built — that would introduce a new interaction paradigm; instead both prompt and bins are just `HoverButton` targets, identical in spirit to `LetterBin.tsx`.

**Time values:** hour 1–12, minute restricted to quarter-hour increments (`data/times.ts`) — the standard progression used to teach kids to tell time (o'clock → half past → quarter past/to). Early rounds (`minuteOptionsForRound`) only use :00/:30; rounds 4+ introduce :15/:45, mirroring the existing `binCountForRound` ramp pattern. Distractor times are generated via `distinctDistractorTimes`, which rejects any candidate within 15 minutes of the target *or* of another already-picked distractor when the hour matches — this prevents wrong-answer clock faces from being visually near-identical to the correct one, which would make the "wrong" feedback feel arbitrary rather than educational.

**Narration is the one genuinely new piece of domain logic:** `speakableTime()` converts a `TimeValue` into the vocabulary actually taught in schools — "three o'clock", "quarter past three", "half past three", "quarter to four" — rather than just reading digits aloud, since the vocabulary itself is part of what this game is meant to teach.

**`ClockFace.tsx`:** a small reusable SVG analog clock (12 tick marks, hour + minute hands computed from simple trigonometry) used identically for both the prompt display and for bins — one component serves both directions of the game, since "draw a clock at time X" doesn't care whether it's being used as a question or an answer choice.

**Scoring, achievements, settings, calibration, App shell:** all reused verbatim in structure from Alphabet Zoo — `finalizeSession`/`RoundTally` (first-try correctness + speed bonus, 1★ floor), the 6-achievement pattern (First Round / two mode-masters / Mixed Master / Perfect Round / a 10-session milestone), `settingsStore.ts`, 2-step `CalibrationScreen`, and the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage contract.

**Verification:** `tsc --noEmit` and `vite build` both clean, with one small fix during the pass — `MainMenu.tsx`'s decorative header clock initially used `{ hour: 10, minute: 10 }`, which doesn't type-check against `TimeValue`'s `0 | 15 | 30 | 45` minute union (a real analog clock showing "ten past ten" for the logo doesn't map to a valid quarter-hour value in this game's domain model) — changed to `{ hour: 10, minute: 15 }`. Built via `node scripts/build-games.js clock-time-teller` into `public/games/clock-time-teller/` (418KB JS / 15.5KB CSS gzipped to 134.4KB/3.8KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — gesture/dwell timing and narration output could not be exercised live; recommend a quick webcam pass before shipping.

**Files added:**
- `games/clock-time-teller/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/times.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,ClockFace}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,TimeBin,GameplayScreen,EndScreen}.tsx`)
- `public/games/clock-time-teller/` — built dist
- `src/games/registry.ts` — added `clock-time-teller` entry
- `supabase/seed_clock_time_teller.sql` — upsert-safe game row (Puzzle, published, featured, age_group `5-8`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-040 — Coin & Money Counter game
**Date:** 2026-07-02
**Status:** Accepted

**Decision:** Add Coin & Money Counter, a gesture-only money-counting game, to `games/coin-money-counter/`, built to `public/games/coin-money-counter/` and served the same way as the sibling games. This is the sixth game in the family, and like Clock & Time Teller (ADR-039), it deliberately stays in the hover-select-the-right-answer family (Flag Quest → Shape & Color Sorter → Alphabet Zoo → Clock & Time Teller) rather than inventing new interaction patterns. It teaches money recognition and counting: reading coin groups and matching them to amounts, and vice versa.

**Game design maps onto Clock & Time Teller's shape exactly:** one axis of content (a dollar amount in cents), presented two different ways, matched by hovering the right bin. **Count the Coins** shows coin icons as the prompt and digital-amount bins as answers; **Make the Amount** shows a digital target and coin-group bins as answers; **Mixed** randomly picks the direction each round. No incremental "tap coins one at a time to accumulate a total" flow — that would be a new interaction paradigm; instead both prompt and bins stay plain `HoverButton` targets.

**Coin denominations:** penny (1¢), nickel (5¢), dime (10¢), quarter (25¢) — amounts under $1 (1¢–99¢), the standard "counting coins" range kids are actually taught, avoiding bills/dollar-complexity. Each amount is broken into coins greedily (as many quarters as possible, then dimes, then nickels, then pennies) for a simple, deterministic, always-small visual — since a bin only ever needs to *display* one canonical breakdown, not enumerate combinatorics.

**Difficulty ramp:** early rounds restrict amounts to those reachable with 1–2 coins (5¢, 10¢, 25¢, 30¢...); later rounds allow any 1–99¢ amount requiring up to 4 coins, mirroring Clock & Time Teller's `minuteOptionsForRound` easy-then-harder tiering.

**Narration:** `speakableAmount()` converts cents to words ("twenty-seven cents"), using age-appropriate vocabulary rather than raw digits — same philosophy as Clock & Time Teller's `speakableTime()`.

**New components:** `CoinIcon.tsx` (a small SVG circle per denomination, color-coded: copper penny, silver nickel/dime, gold quarter); `CoinGroup.tsx` (lays out coins for a given amount via `breakIntoCoins()`, used identically for prompt and bins); `MoneyBin.tsx` (a `HoverButton`-wrapped bin showing either coins or digital amount).

**Scoring, achievements, settings, calibration, App shell:** all reused verbatim in structure from Clock & Time Teller — `finalizeSession`/`RoundTally`, the 6-achievement pattern (First Round / Coin Counter Master / Money Maker Master / Mixed Master / Perfect Round / Money Wizard), `settingsStore.ts`, 2-step `CalibrationScreen`, and the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage contract.

**Verification:** `tsc --noEmit` and `vite build` both clean (one small fix along the way: smart quotes in `EndScreen.tsx` encouragement strings caused parse errors, replaced with straight ASCII quotes). Built via `node scripts/build-games.js coin-money-counter` into `public/games/coin-money-counter/` (418KB JS / 15.5KB CSS gzipped to 134.5KB/3.8KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — gesture/dwell timing and narration output could not be exercised live; recommend a quick webcam pass before shipping.

**Files added:**
- `games/coin-money-counter/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/coins.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,CoinIcon,CoinGroup}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,MoneyBin,GameplayScreen,EndScreen}.tsx`)
- `public/games/coin-money-counter/` — built dist
- `src/games/registry.ts` — added `coin-money-counter` entry
- `supabase/seed_coin_money_counter.sql` — upsert-safe game row (Puzzle, published, featured, age_group `5-8`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-041 — Weather & Seasons Sorter game
**Date:** 2026-07-02
**Status:** Accepted

**Decision:** Add Weather & Seasons Sorter, a gesture-only weather/season-reasoning game, to `games/weather-seasons-sorter/`, built to `public/games/weather-seasons-sorter/` and served the same way as the sibling games. This is the seventh game in the family, and it continues the hover-select-the-right-answer lineage (Flag Quest → Shape & Color Sorter → Alphabet Zoo → Clock & Time Teller → Coin & Money Counter). Unlike the two prior games, the "leftover" content ideas (Simon Says Sequence, Rock-Paper-Scissors Duel) didn't appeal to the user this round, so a fresh shortlist of not-yet-covered educational domains (Counting Balloon Pop, Emotion Faces, Opposites Match, Weather & Seasons Sorter) was proposed instead — the user picked weather/season reasoning, a domain untouched by any of the 6 existing games.

**Game design maps onto Coin & Money Counter's shape exactly:** one axis of content (a weather/season scenario), presented two different ways, matched by hovering the right bin. **What to Wear** shows a weather-scene icon as the prompt and clothing/activity-icon bins as answers; **Match the Weather** reverses it (clothing prompt, weather-scene bins); **Mixed** randomly picks the direction each round. No incremental "dress the character" drag flow — that would be a new interaction paradigm; both prompt and bins stay plain `HoverButton` targets.

**Content set (`data/weather.ts`):** 8 scenarios (sunny summer, snowy winter, rainy spring, windy fall, hot desert day, foggy morning, stormy day, cloudy afternoon), each with one canonical correct clothing/activity answer. `distinctDistractorScenarios()` filters candidates to a *different* clothing answer than the target — so a wrong choice is always a plausible-looking but genuinely different item, never a near-duplicate — the same "meaningfully different" distractor philosophy as the prior two games' numeric-closeness guards, just keyed by scenario identity instead of numeric distance.

**New icon components:** `WeatherIcon.tsx` and `ClothingIcon.tsx` — small hand-drawn SVG icons (sun rays, snowflake, raindrops, wind swirls, umbrella, mittens, kite, etc.) in the same no-image-assets style as `ClockFace`/`CoinIcon`, one icon set per side of the content axis.

**Narration** reuses `speak()` directly against plain-English content strings (`speakableScenario()` just concatenates name + description) — unlike the prior two games, no new number/vocabulary-conversion logic was needed here, since the "new domain logic" this time is the content set and icon set themselves rather than a formatting helper.

**Scoring, achievements, settings, calibration, App shell:** all reused verbatim in structure from Coin & Money Counter — `finalizeSession`/`RoundTally`, the 6-achievement pattern (First Round / Weather Watcher Master / Clothing Expert Master / Mixed Master / Perfect Round / Season Sage), `settingsStore.ts`, 2-step `CalibrationScreen`, and the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage contract.

**Verification:** `tsc --noEmit` and `vite build` both clean on the first pass (no fixes needed this time — smart-quote lesson from ADR-040 was carried forward, using straight ASCII quotes in `EndScreen.tsx` from the start). Built via `node scripts/build-games.js weather-seasons-sorter` into `public/games/weather-seasons-sorter/` (422KB JS / 15.5KB CSS gzipped to 135.3KB/3.8KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — gesture/dwell timing and narration output could not be exercised live; recommend a quick webcam pass before shipping.

**Files added:**
- `games/weather-seasons-sorter/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/weather.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,WeatherIcon,ClothingIcon}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,WeatherBin,GameplayScreen,EndScreen}.tsx`)
- `public/games/weather-seasons-sorter/` — built dist
- `src/games/registry.ts` — added `weather-seasons-sorter` entry
- `supabase/seed_weather_seasons_sorter.sql` — upsert-safe game row (Puzzle, published, featured, age_group `4-8`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-042 — Opposites Match game
**Date:** 2026-07-02
**Status:** Accepted

**Decision:** Add Opposites Match, a gesture-only vocabulary-building game, to `games/opposites-match/`, built to `public/games/opposites-match/` and served the same way as the sibling games. This is the eighth game in the family, teaching opposite word pairs (big/small, hot/cold, fast/slow...) — a new content domain not covered by any of the 7 existing games.

**Structurally closer to Alphabet Zoo (ADR-036) than to the last three games' Read/Set duality:** "opposite of" is a symmetric relation (opposite of big is small, opposite of small is big), so there's no natural "direction A→B vs B→A" split the way analog-clock-vs-digital or coins-vs-amount had. Instead, like Alphabet Zoo's `letter`/`animal`/`mixed` modes, the split here is **presentation style**: **Words** mode shows a text prompt and text-answer bins; **Pictures** mode shows an icon prompt and icon-answer bins (prompt and bins always share the same presentation within a round — unlike the Read/Set games where prompt and bins show *opposite* presentations of the same axis); **Mixed** randomly varies presentation per round. Direction (which word of the pair is the prompt vs. the correct answer) is randomized independently of mode every round, so both directions of every pair get practiced across a session regardless of which mode is chosen.

**Content set (`data/opposites.ts`):** 12 opposite pairs, each with a simple hand-drawn SVG icon per side (`OppositeIcon.tsx`, in the same no-image-assets style as `WeatherIcon`/`CoinIcon`/`ClockFace`). `distinctDistractorWords()` draws distractors from *entirely different* pairs (never the target pair's own two words), so a wrong choice is never a near-miss synonym of the correct answer.

**Types reshaped from the prior three games' `scenarioId`/lookup pattern:** because distractor words here are picked directly from a flat pool spanning all pairs (not "other whole scenarios" the way Weather's distractors were), `BinDef` carries the word/glyph directly (`{ id, word, glyph, isCorrect }`) rather than a foreign-key id to look up — there's no shared "canonical entry" a bin and the prompt both reference, since a bin's word could theoretically belong to any of the 11 non-target pairs.

**Scoring, achievements, settings, calibration, App shell:** all reused verbatim in structure from Weather & Seasons Sorter — `finalizeSession`/`RoundTally`, the 6-achievement pattern (First Round / Word Master / Picture Master / Mixed Master / Perfect Round / Opposite Genius), `settingsStore.ts`, 2-step `CalibrationScreen`, and the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage contract. Narration reuses `speak()` directly against plain-English question/confirmation strings ("What is the opposite of Big?" / "The opposite of Big is Small!") — no new formatting helper needed, continuing the pattern from ADR-041.

**Verification:** `tsc --noEmit` and `vite build` both clean on the first pass. Built via `node scripts/build-games.js opposites-match` into `public/games/opposites-match/` (423KB JS / 15.5KB CSS gzipped to 135.3KB/3.8KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — gesture/dwell timing and narration output could not be exercised live; recommend a quick webcam pass before shipping.

**Files added:**
- `games/opposites-match/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/opposites.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,OppositeIcon}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,OppositeBin,GameplayScreen,EndScreen}.tsx`)
- `public/games/opposites-match/` — built dist
- `src/games/registry.ts` — added `opposites-match` entry
- `supabase/seed_opposites_match.sql` — upsert-safe game row (Puzzle, published, featured, age_group `3-7`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-043 — Musical Instrument Sounds game
**Date:** 2026-07-02
**Status:** Accepted

**Decision:** Add Musical Instrument Sounds, a gesture-only sound-recognition game, to `games/musical-instrument-sounds/`, built to `public/games/musical-instrument-sounds/` and served the same way as the sibling games. This is the ninth game in the family and the **first with an audio-first prompt**: every prior game narrates a visual prompt as an *optional* accessibility layer, but here the prompt itself has no visual content at all — the player must listen to a synthesized instrument sound and then pick the matching instrument visually.

**Core loop:** each round plays a short (~0.2-0.6s) procedurally synthesized instrument sound; the player hovers the bin showing the matching instrument icon + name among 2-4 distractors. A **Replay** `HoverButton` lets the child re-trigger the prompt sound as many times as needed — necessary here since, unlike a visual prompt that stays on screen, an audio cue can be missed or forgotten mid-round. `PromptDisplay.tsx` auto-plays the sound once on round start (via a `useEffect` keyed on the instrument id) in addition to being replayable on demand.

**Modes split by instrument family**, the same three-mode shape as Alphabet Zoo's `letter`/`animal`/`mixed` and Opposites Match's `word`/`picture`/`mixed` — a content-grouping split rather than a presentation-direction split, since the prompt is always audio and bins are always icon+name here: **Percussion** (drum, tambourine, xylophone, cymbal, maracas), **Melodic** (piano, guitar, flute, violin, trumpet), **Mixed** (all ten).

**New audio infrastructure (`audio/instruments.ts`):** one procedural synthesis recipe per instrument built on the same `AudioContext`/oscillator/gain-envelope pattern as `audio/sound.ts`'s existing `tone()` helper, plus a new `noiseBurst()` helper (a randomized `AudioBuffer` through a highpass/bandpass `BiquadFilterNode`) for the percussion family's noise-based timbres. `sound.ts` gained two small exports (`getAudioContext()`, `getSfxVolume()`) so `instruments.ts` can share the same context and volume setting rather than opening a second `AudioContext` — the first cross-module audio dependency in the game family, since every prior game's SFX lived entirely inside its own `sound.ts`.

**Types reshaped again:** like Opposites Match, `BinDef`/`RoundPrompt` reference an instrument id directly (`{ instrumentId }`) rather than a lookup-by-scenario pattern, since distractors are drawn from a flat per-family pool rather than "other whole scenarios."

**Scoring, achievements, settings, calibration, App shell:** all reused verbatim in structure from Opposites Match — `finalizeSession`/`RoundTally`, the 6-achievement pattern (First Round / Percussion Master / Melodic Master / Mixed Master / Perfect Round / Music Maestro), `settingsStore.ts`, 2-step `CalibrationScreen`, and the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage contract.

**Verification:** `tsc --noEmit` and `vite build` both clean on the first pass. Built via `node scripts/build-games.js musical-instrument-sounds` into `public/games/musical-instrument-sounds/` (423KB JS / 15.5KB CSS gzipped to 135.5KB/3.8KB) and smoke-checked serving (`vite preview` → HTTP 200). **Extra caveat beyond the usual one:** this build environment has no audio output either, so the 10 synthesized timbres could not be listened to or distinguished live — a careful ear-check pass (are drum vs. tambourine vs. cymbal actually distinguishable to a young child?) is strongly recommended before shipping, in addition to the usual gesture/dwell check.

**Files added:**
- `games/musical-instrument-sounds/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/instruments.ts`, `audio/{sound,instruments}.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,InstrumentIcon}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,InstrumentBin,GameplayScreen,EndScreen}.tsx`)
- `public/games/musical-instrument-sounds/` — built dist
- `src/games/registry.ts` — added `musical-instrument-sounds` entry
- `supabase/seed_musical_instrument_sounds.sql` — upsert-safe game row (Puzzle, published, featured, age_group `3-7`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-044 — Fruit & Vegetable Sorter game
**Date:** 2026-07-03
**Status:** Accepted

**Decision:** Add Fruit & Vegetable Sorter, a gesture-only categorization game, to `games/fruit-vegetable-sorter/`, built to `public/games/fruit-vegetable-sorter/` and served the same way as the sibling games. This is the tenth game in the family and the **first with a pure binary choice**: every prior game, even the simplest two-choice ones (Alphabet Zoo letter/animal, Opposites Match word pairs), had unique correct answers to match against distractors; here, the prompt is always "Is this a fruit or vegetable?" and the two bins are "Fruit" or "Vegetable" — categorization instead of matching.

**Core loop:** each round shows a colorful emoji picture of a produce item (apple, banana, strawberry, watermelon, orange, grape, carrot, broccoli, lettuce, tomato, bell pepper, corn); the player hovers the matching bin ("Fruit" or "Vegetable") among two choices. A simple two-bin format with no distractors — the answer space is always the same. Ten rounds per session. Same no-penalty philosophy: wrong bin = gentle wobble + soft tone, no score deduction, no fail state, every session earns ≥1 star.

**Modes split by content family**, the same grouping shape as Alphabet Zoo, Weather Sorter, and Opposites Match — a confidence-building and testing split: **Fruits** (apple, banana, strawberry, watermelon, orange, grape — learn what counts as fruit), **Vegetables** (carrot, broccoli, lettuce, tomato, bell pepper, corn — learn what counts as vegetable), **Mixed** (both families — the real categorization test).

**New icon infrastructure (`components/common/ProduceIcon.tsx`):** emoji-based icons (simpler than SVG). A `ProduceIcon` component maps produce IDs to emoji, eliminating the need for hand-drawn SVG art per item — fast, legible, culturally recognized. Same no-image-assets philosophy, just with a different asset type (emoji instead of SVG or procedural generation).

**Types reshaped for binary-choice simplicity:** `BinDef` carries just `{ category: 'fruit' | 'vegetable', isCorrect }` — no produce ID needed on the bin itself, since both bins are always present. `RoundPrompt` still carries `produceId` (which item is shown), but the bin matching is trivial (one bin for each category).

**Scoring, achievements, settings, calibration, App shell:** all reused verbatim in structure from Musical Instrument Sounds — `finalizeSession`/`RoundTally`, the 6-achievement pattern (First Round / Fruit Expert / Veggie Expert / Mixed Master / Perfect Round / Food Champion), `settingsStore.ts`, 2-step `CalibrationScreen`, and the App.tsx screen-state-machine + `GAME_COMPLETE` postMessage contract.

**Verification:** `tsc --noEmit` and `vite build` both clean on the first pass. Built via `node scripts/build-games.js fruit-vegetable-sorter` into `public/games/fruit-vegetable-sorter/` (418KB JS / 15.8KB CSS gzipped to 134KB/3.9KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — gesture/dwell timing could not be exercised live; recommend a quick webcam pass before shipping.

**Files added:**
- `games/fruit-vegetable-sorter/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/produce.ts`, `game/{roundLogic,scoring}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `hooks/useDwellProgress.ts`, `stores/{settingsStore,progressStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed,ProduceIcon}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{PromptDisplay,CategoryBin,GameplayScreen,EndScreen}.tsx`)
- `public/games/fruit-vegetable-sorter/` — built dist
- `src/games/registry.ts` — added `fruit-vegetable-sorter` entry
- `supabase/seed_fruit_vegetable_sorter.sql` — upsert-safe game row (Puzzle, published, featured, age_group `3-7`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-045 — Little Farm Builder game
**Date:** 2026-07-03
**Status:** Accepted

**Decision:** Add Little Farm Builder, a gesture-only farming simulation, to `games/farm-builder/`, built to `public/games/farm-builder/` and served the same way as the sibling games. This is the eleventh game in the family and a deliberate step up in complexity, chosen after the user asked for "something more complex" than the session-based match/sort games. It introduces two genuinely new pieces of infrastructure the prior ten games never needed: a **persistent, evolving save state** (a farm that keeps growing in real time between visits, not a per-session best score) and **continuous pinch-and-drag** as the core interaction (not hover-and-dwell).

**Core loop:** the player pinch-grabs a seed tile from the tray and drags it onto an empty plot to plant it (costs coins); the crop grows through three stages — seed → sprout → ripe — based on real elapsed wall-clock time (`game/growth.ts`'s `getGrowthFraction`/`getGrowthStage`), so it keeps maturing even while the game is closed, since growth is derived from a persisted `plantedAt` timestamp compared against `Date.now()` on load, not a running timer. Once ripe, the player pinch-grabs the crop out of its plot and drags it to the basket to harvest it for coins. Four crops with escalating pace/value — Carrot (20s, cheap, unlocked from the start), Tomato (60s), Corn (3 min), Pumpkin (8 min) — plus a 4-to-12 expandable plot grid, both gated behind coin costs and unlocked via ordinary `HoverButton` dwell (only planting/harvesting use the new pinch-drag mechanic; the shop/expansion economy deliberately stays on the proven dwell pattern). No fail state: coins only go up, plots only unlock, matching the no-punishment philosophy of every other KinetoFun game.

**New gesture primitive — `isPinching`:** `mediaPipe/handTrackingCore.ts`'s `HandFrame` gains a fourth boolean classification (alongside `isPalmOpen`/`isFist`) computed as thumb-tip-to-index-tip distance < 0.07 normalized units — the exact threshold already proven in `games/gesture-love-balls`'s pinch-to-draw mechanic, reused here for consistency rather than re-derived. Unlike `isFist`/`isPalmOpen`, raw `isPinching` is jitter-prone frame to frame near the threshold boundary, so `hooks/usePinchDrag.ts` adds a 100ms sustain-before-grab debounce (`PINCH_CONFIRM_MS`) — again mirroring gesture-love-balls' `PINCH_CONFIRM_MS` fix for the same underlying noise problem. Release is intentionally *not* debounced (matches gesture-love-balls too) so letting go still feels immediate.

**New interaction primitive — `usePinchDrag`:** rather than building a canvas-based drag engine, the hook extends the same DOM-rect hit-testing idiom `HoverButton` already uses (`getBoundingClientRect()` vs. `cursorX/Y * window.innerWidth/innerHeight`) to a grab/carry/drop flow: on confirmed-pinch-start it hit-tests a caller-supplied `getGrabbables()` list (computed lazily, only at that instant — not every frame) to find what's being picked up; while held, a floating emoji ghost tracks the raw cursor position; on pinch-release it hit-tests `getDropzones()` to resolve the drop target and calls back into `FarmScreen`'s `handleDrop`, which is the only place that touches `farmStore` actions (`plantCrop`/`harvestCrop`). `FarmScreen` owns the plot/tray/basket DOM refs directly rather than routing them through a context/registry — colocated state, matching how `GameplayScreen` in every other game owns its round state directly rather than distributing it.

**New persistence shape — `stores/farmStore.ts`:** still zustand + `persist` → localStorage (`'farm-builder-progress'`), the exact same mechanism as every other game's `progressStore.ts`, but the data shape is new: `coins` (spendable balance), `totalCoinsEarned` (lifetime, monotonic — this is what gets submitted to `public.scores` on exit, since it only ever grows, preserving the platform's "max score per user" leaderboard semantics even though the underlying game has no discrete rounds), `totalHarvests`, `unlockedCropIds`, `unlockedPlotCount`, and the 12-slot `plots` array (`{ cropId, plantedAt }` per slot). No prior game's save data models something that evolves *outside of active play* — this is genuinely new territory, confirmed via a full explore pass that found no existing `inventory`/`currency`/`dailyState` pattern anywhere in the codebase.

**No DB schema changes:** confirmed via the same explore pass that `public.scores` is a minimal, generic `(game_id, user_id, score, achieved_at)` leaderboard table with no JSON/blob column anywhere — exactly the same shape every other game already targets. The farm's actual save state stays client-side only, exactly like every other game's `bestStarsByMode`/achievements; only a single derived number (lifetime coins) gets submitted per exit.

**Verification:** `tsc --noEmit` and `vite build` both clean on the first pass (after one self-caught refinement: added the `PINCH_CONFIRM_MS` debounce proactively, based on the known gesture-love-balls precedent, rather than after observing jitter). Built via `node scripts/build-games.js farm-builder` into `public/games/farm-builder/` (419KB JS / 16.3KB CSS gzipped to 134KB/3.9KB) and smoke-checked serving (`vite preview` → HTTP 200). No camera in this build environment — the pinch-drag mechanic in particular has never been exercised against a live hand here, and is the highest-risk piece of this game to get right; a webcam pass (does a 100ms confirm feel responsive? is the 0.07 pinch threshold comfortable at typical webcam distance? does the held-item ghost track cleanly?) is strongly recommended before shipping, more so than for any prior game in this family.

**Files added:**
- `games/farm-builder/` — full Vite project (`src/{App.tsx,main.tsx,index.css}`, `types/`, `data/crops.ts`, `game/growth.ts`, `hooks/{useDwellProgress,usePinchDrag}.ts`, `mediaPipe/{handTrackingCore,GestureProvider}.tsx`, `stores/{settingsStore,farmStore}.ts`, `audio/sound.ts`, `components/common/{HoverButton,ProgressRing,GestureSlider,GestureCursorDot,HandLostOverlay,CameraFeed}.tsx`, `components/menu/{CalibrationScreen,MainMenu,SettingsScreen}.tsx`, `components/game/{Plot,SeedTray,Basket,FarmScreen}.tsx`)
- `public/games/farm-builder/` — built dist
- `src/games/registry.ts` — added `farm-builder` entry
- `supabase/seed_farm_builder.sql` — upsert-safe game row (Adventure category — no existing category fits a persistent building sim better; Puzzle didn't apply since there's no puzzle-solving here — published, featured, age_group `4-9`, difficulty `easy`) + a commented example leaderboard query

---

## ADR-046 — Pocket Pal: Virtual Pet Companion (persistent sim, no fail state)
**Date:** 2026-07-03
**Status:** Accepted

**Decision:** Add Pocket Pal, a gesture-only virtual pet companion game, to `games/pocket-pal/`, built to `public/games/pocket-pal/` and served the same way as sibling games. This is the twelfth game overall and the *second* persistent-state sim after Little Farm Builder (ADR-045), proving that the real-time growth-from-timestamp infrastructure is generic enough to support multiple game domains beyond farming.

**Core loop:** a single fixed companion (emoji-based creature, no species picker in v1) that the player feeds, plays with, and pets via gesture. Two stats — **Hunger** and **Happiness** — deliberately not three; this family has never asked kids to juggle more core mechanics simultaneously. A separately-tracked, always-forward **Growth Stage** (Baby → Child → Teen → Adult → Elder) driven by lifetime care-action count, not by stat management. No fail state ever: both stats have a floor of 40/100, so the pet never "dies" or enters a game-over state even if totally neglected; it just looks mildly sad (💧 badge + droopy animation) and perks back up the instant the player interacts. Same no-punishment philosophy as every KinetoFun game — wrong actions wobble, never penalize.

**Stat decay — reusing farm-builder's real-time growth math:** Hunger and Happiness are persisted as (value, lastTickAt) pairs, recomputed on load by comparing `lastTickAt` against `Date.now()` rather than using a running timer, exactly like farm-builder's crop growth. Decay window constants: Hunger → 40/100 over 90 min, Happiness → 40/100 over 180 min (guessed constants, flagged as needing real playtesting). Both stats use the same `getGrowthFraction` helper from `game/growth.ts` (copied from farm-builder, unchanged), rescaled onto `[40,100]`: `value = 100 - getGrowthFraction(lastTickAt, decayWindowMs, now) * 60`. The floor of 40 means the pet can never decay below "looks a little sad"; a single Feed/Play/Pet action instantly restores max or near-max (depending on item value). Mood tiers derived from `min(hunger, happiness)`: **joyful** (both ≥80), **happy** (both ≥60), **okay** (the floor state, never framed as sick/dying, only "a little droopy").

**Interactions — pinch-drag for Feed/Play, hover-dwell for Pet/shop:**
- **Feed:** pinch-drag a food tile onto the pet drop zone → `feedPet(itemId)` → hunger restores by item's `restoreAmount`, +1 Heart earned.
- **Play:** pinch-drag a toy tile onto the pet drop zone → `playWithPet(itemId)` → happiness restores, +1 Heart earned.
- **Pet/pat:** hover-dwell (~700ms) directly on the pet sprite → `petPat()` → +15 happiness, +1 Heart (no item consumed).
- **Unlock items / shop navigation:** hover-dwell on locked item tiles or menu options, reusing the proven `HoverButton` dwell pattern from farm-builder.

No new gesture primitive needed — `isPinching` (thumb-index distance < 0.07) and `usePinchDrag` (grab/carry/drop with 100ms confirm debounce) both inherited from ADR-045 / farm-builder unchanged. The hook works here identically: caller supplies `getGrabbables()` (food/toy tiles) and `getDropzones()` (pet drop zone), hook handles hit-testing and calls back on drop.

**Currency and progression — Hearts, no cooldowns:** Every successful Feed/Play/Pet earns +1 Heart (uncapped, no per-use cost, no cooldown). Hearts only buy cosmetics (9 unlockable items: 3 foods, 3 toys, 3 accessories like hat/bandana/glasses — all CSS/emoji overlays, no new asset pipeline). Since Hearts only unlock nice-to-haves rather than enabling core play, grinding is harmless and encouraged. Using an already-unlocked food/toy is always free (no per-use cost), avoiding a "can't afford to feed my pet" state which would edge toward punishment. On exit, `GAME_COMPLETE` submits **lifetime total Hearts earned** (monotonic, like farm-builder's `totalCoinsEarned`) as the leaderboard score — preserving the "max score per user" shape despite having no discrete play sessions.

**Achievements (6):** New Best Friend (first care action), Best Buddy (50 actions), All Grown Up (reach elder), Full Closet (unlock all 9 items), Heart of Gold (100 Hearts lifetime), Picture Perfect (both stats at 100 simultaneously). Achievements computed by thresholds on state after each action, cached in the store, matching farm-builder's pattern.

**Persistence shape — `stores/petStore.ts`:** Zustand + `persist` → localStorage (`'pocket-pal-progress'`), same mechanism as all games. Data shape: `{ hunger, happiness, lastHungerTickAt, lastHappinessTickAt, hearts, totalHeartsEarned, totalCareActions, unlockedItemIds, equippedAccessories, achievements }`. No DB schema changes — same generic `public.scores` (game_id, user_id, score) table already used by all 12 games; only the lifetime total Hearts is submitted per exit.

**Verification:** `tsc --noEmit` and `vite build` clean (after stripping leftover farm-builder scaffolding: removed `farmStore.ts`, `progressStore.ts`, fixed `DragPayload` field names to match `usePinchDrag`'s expected shape (`cropId` not `itemId`, `emoji` field added)). Built via `node scripts/build-games.js pocket-pal` into `public/games/pocket-pal/` (418KB JS / 16.4KB CSS gzipped to 134KB/4KB) and smoke-checked serving. No camera in this environment — pinch-drag (the same risky mechanism from farm-builder) remains unexercised against a live hand; a webcam pass is still strongly recommended before shipping, doubly so since this game reuses the same primitive for *both* core verbs (Feed and Play). Decay-window constants (90/180 min) are guesses, not verifiable headless, and flagged for real playtesting.

---

## ADR-047 — Circuit Racer: Multi-course Racing with AI (13th game, gesture racing)
**Date:** 2026-07-03
**Status:** Accepted

**Decision:** Add Circuit Racer, a gesture-controlled racing sim with 6 hand-authored courses and 3 AI opponents, to `games/circuit-racer/`, built to `public/games/circuit-racer/`. This is the thirteenth game overall and the first racing sim in the catalog — a genuine gap (gesture-hill-adventure is a hill-climb test, not circuit racing). It proves that the persistent-sim + level-progression infrastructure is reusable across *three* game domains: farm economy (ADR-045), pet care (ADR-046), and now racing competition.

**Core loop:** Player selects one of 6 progressively harder courses (unlocked by finishing top-3 in the prior course, linear unlock pattern from the-sniper-code). Once a course is active, the player races 3 AI opponents for 3–5 laps (course-dependent) around a closed-loop stadium-shaped track. Gesture controls: hand-X steers, raise hand accelerates, lower hand brakes, fist holds for turbo boost. Position at finish (1st/2nd/3rd/4th) awards coins (3/2/1/0 respectively). Race ends the instant the player finishes their laps; rank is computed from how many AI cars already finished by that moment. No fail state: player always scores based on final position, no DNF penalties, and a "Quit Race" hover-dwell button lets the player leave anytime without penalty. Score submitted to platform is **lifetime total coins earned** (monotonic, matching farm-builder/pocket-pal patterns). 6 courses unlock linearly; star rating (⭐⭐⭐ for 1st, ⭐⭐ for 2nd, ⭐ for 3rd) persists and is re-earned if the player beats their prior finish position.

**Correction (same day, before ship): the first implementation pass was a non-functional placeholder.** `RaceScreen.tsx` initially contained no real game loop at all — just a `setInterval` incrementing a fake counter that declared "1st place" after 3 seconds, with an empty canvas behind it. None of the vehicle physics, AI, track rendering, or gesture input described in the original version of this entry were actually wired together; the user caught this immediately ("black screen and cursor... after some time shows I won the race"). The description below reflects what was rebuilt to actually work.

**Physics: arcade kinematic model, NOT the Matter.js suspension physics forked from gesture-hill-adventure.** The original plan called for forking `vehiclePhysics.ts`'s Matter.js suspension rig (vertical spring-and-damper wheels) from hill-adventure. That model is built for a *side-view* hill-climb vehicle with no steering axis — it doesn't apply to a top-down circuit racer at all, and wiring it up was where the placeholder stalled. Replaced with a standard arcade top-down car model (`game/carKinematics.ts`): `{x, y, heading, speed}` state, `updateCar(car, throttle, steer, boost, params, dt)` integrates acceleration/friction into speed, then integrates speed/heading into position; steering authority ramps in with speed (no steering while stationary) and reverses correctly when going backward. No rigid-body engine needed or used.

**Track: procedural stadium-shaped loop (`game/track.ts`).** Two straights joined by two semicircle turns, generated as an ordered waypoint array (`buildOvalTrack()`). AI difficulty variety comes from `course.aiSpeedMultiplier`, not per-course track geometry (all 6 courses currently share the same track shape — a known scope-cut, see Known limitations below).

**AI: waypoint-follow pure pursuit (`game/aiRacer.ts`).** Each AI car aims at a target waypoint ~3 points ahead, steers proportionally to the heading error (clamped, full authority at 60° off), advances to the next waypoint on arrival (70px radius), and eases off throttle on sharp turns so cars don't spin out. Three AI cars get slightly different speed variance (0.92×/0.98×/1.04× × `course.aiSpeedMultiplier`) for natural-looking separation.

**Lap detection: waypoint-index wraparound, not a proximity zone.** The first working version used a fixed-radius circle around the start point and counted a lap on every frame the car dwelled inside it — verified via a standalone Node/tsx simulation (`__simtest.ts`, temporary, deleted after use) that ran the actual physics/AI/lap-tracker modules through a full race. That simulation caught two real bugs before they shipped:
1. **Every-frame re-trigger:** a car sitting inside the finish-line radius for multiple consecutive frames incremented its lap count every frame, not once per crossing. Fixed with rising-edge detection (`wasInFinishZone` boolean, only count on outside→inside transition).
2. **False starts from the starting grid:** even with rising-edge detection, cars spawn on a 4-car grid clustered within ~120px of the finish point — a radius-100 zone is too close to that grid to be reliable. A car spawning just outside the zone that drove straight during its initial no-steering ramp-up could drift *through* the zone and register a "lap" in 0.4 seconds, before it had gone anywhere near the actual track. Root-caused and fixed by replacing proximity detection entirely: `lapTracker.ts` now tracks each car's nearest-waypoint index and only counts a lap when that index wraps from the far end of the array (>75%) back to the near end (<25%) — a transition that requires having actually traversed most of the loop, which a few dozen pixels of starting-grid drift can never produce.

**Track geometry bug caught by the same simulation:** the AI, once lap-detection was fixed, still recorded zero laps after 68 simulated seconds while the player (a separately-driven simulated "competent driver") completed 3. Debugging traced it to the semicircle-turn waypoint math: the formula for where each semicircle starts didn't match where the preceding straight segment ended, producing a ~1000px teleport at every straight→curve boundary. The AI's fixed-target-until-arrival steering had no way to recover from a target that discontinuously jumped 1000px away and spun out trying to chase it; the player's simulated driver (which re-picks a fresh lookahead target every single frame rather than committing to one until arrival) incidentally self-corrected past the same bug within a frame or two, which is why the player finished fine while AI silently failed. Fixed the angle math in `buildOvalTrack()` so each semicircle's start angle matches its connecting straight's end point exactly.

**Rendering: fixed top-down canvas view, not the mob-rally trapezoid projection.** The original plan called for reusing mob-rally's behind-the-car trapezoid projection. Replaced with a simpler, more reliably-testable fixed north-up top-down camera centered on the player car (`camera = playerPos - canvasSize/2`, no rotation) — track, checkered start/finish line, and all 4 cars (rotated rects) drawn directly in world space each frame. HUD (course name, lap count, speed, live position) is drawn directly on canvas every frame via `ctx.fillText`, not React state, so it updates at 60fps without triggering re-renders. A 3-2-1-GO countdown overlay renders immediately from the first frame (fixing the literal "black screen" symptom — track and stationary cars are visible during the whole countdown, not a blank canvas).

**Gesture input wiring:** reads `frameRef.current` (ref-based, not React state) inside the RAF loop for 60fps performance, matching the established pattern from every other game. `cursorX` (index fingertip, 0–1) maps to steering; `cursorY < 0.38` = accelerate, `> 0.72` = brake, between = coast; `isFist` = boost. All thresholds are first-guess constants, not yet tuned against a live camera.

**Verification:** Since this environment has no camera, gesture-driven interaction can't be tested end-to-end in a browser. Instead, verified the actual simulation pipeline (physics + AI + lap tracking, the exact modules `RaceScreen.tsx` wires together) via a standalone script that ran full races to completion with a scripted "competent driver" standing in for gesture input. Confirmed: realistic lap times (~14s/lap, consistent across all 4 cars after the fixes), correct AI difficulty scaling (harder courses' AI reliably out-races the baseline driver), correct finish-order-to-coins mapping. Also confirmed `tsc --noEmit` and `vite build` clean, and a headless-Chromium pass showed zero console/page errors through calibration and main-menu screens. **Known limitations, left for a follow-up pass:** all 6 courses currently render the same track shape (only lap count and AI speed differ; per-course track variety is unbuilt); no wall/track-boundary collision (cars can drive off the paved area with no consequence — consistent with the no-punishment philosophy but visually odd); steering/throttle gesture thresholds are unverified against a live camera and will likely need tuning; no achievements are wired up yet despite being planned.

**Files:** `game/{carKinematics,aiRacer,track,lapTracker}.ts` (new), `data/courses.ts`, `stores/raceStore.ts`, `components/game/RaceScreen.tsx`, `components/menu/{MainMenu,CourseSelect}.tsx`, `App.tsx` routing. `src/games/registry.ts` — added `circuit-racer` entry. `supabase/seed_circuit_racer.sql` — upsert-safe game row (Sports category, published, featured, age_group `5-9`, difficulty `medium`).

**Files added:**
- `games/pocket-pal/` — full Vite project scaffold (copied from farm-builder, stripped farm-specific code). Core new files: `data/careItems.ts` (9 items: 3 foods, 3 toys, 3 accessories; `itemById`/`itemsByKind` helpers), `game/petStats.ts` (decay math reusing `getGrowthFraction`, mood derivation, growth-stage thresholds), `stores/petStore.ts` (Zustand + persist, `feedPet`/`playWithPet`/`petPat`/`unlockItem`/`equipAccessory` actions, achievement checks), `components/game/{PetScreen,PetSprite,CareTray}.tsx` (game loop, stat readout, pinch-drag wiring, petting dwell). Updated: `App.tsx` (exit posts `totalHeartsEarned` as score), `types/index.ts` (new `PetSaveData` interface, reused `HandFrame`/`GestureSettings`), `components/menu/{MainMenu,SettingsScreen}.tsx` (new titles/stat readout).
- `public/games/pocket-pal/` — built dist
- `src/games/registry.ts` — added `pocket-pal` entry
- `supabase/seed_pocket_pal.sql` — upsert-safe game row (Adventure category, published, featured, age_group `4-9`, difficulty `easy`) with inline documentation on scores wiring and persistent state pattern

---

## ADR-048 — Zoo & Aquarium Architect (14th game, free-form creative building)
**Date:** 2026-07-03
**Status:** Accepted

**Decision:** Add Zoo & Aquarium Architect, a gesture-only creative zoo-building sim, to `games/zoo-architect/`, built to `public/games/zoo-architect/`. This is the fourteenth game and the third to reuse the persistent-sim + pinch-drag architecture proven by Little Farm Builder (ADR-045) and Pocket Pal (ADR-046) — deliberately returning to that proven template after Circuit Racer (ADR-047) shipped its first pass as a non-functional placeholder and needed unproven physics/rendering built from scratch to fix. Chosen from a second round of genre brainstorming (Marble Run Builder, Robot Battle Arena, Detective Mystery Cases, Zoo & Aquarium Architect) after a first round (Tower Defense, Escape Room, 2-Player Duel, City Builder, Rhythm/Dance) was rejected outright.

**Core loop:** unlock zones (biomes) with Tickets, then pinch-drag animals and decorations from a shop tray onto the active zone's canvas at **any position** (free-form placement, not a grid or single fixed dropzone like prior games) to design habitats. Four zones act as the natural progression tier, unlocked in order: Savanna (starter, free), Arctic (40 tickets), Ocean/Aquarium (90 tickets), Rainforest (160 tickets) — same linear-unlock-in-order gating as every prior game's level/plot/course progression. ~28 unlockable items (animals + decorations) across the 4 zones, each with an `appealValue` that contributes to its zone's and the zoo's total appeal score. No fail state: appeal only ever increases, nothing decays, nothing can be placed "wrong."

**Free-form placement — the one genuinely new mechanic, built as a small extension of the existing hook, not a new subsystem.** `usePinchDrag` (copied from pocket-pal) already exposes `cursorPx` (screen-space cursor position, already used by every prior pinch-drag game to render the held-item ghost) and hit-tests dropzones by `DOMRect`. Rather than modifying the shared hook, `ZooScreen.tsx`'s `handleDrop` converts `cursorPx` into zone-canvas-relative fractional coordinates using the canvas element's `getBoundingClientRect()` (a ref, same idiom as pocket-pal's `petDropZoneRef`): `relX = clamp((cursorPx.x - rect.left) / rect.width, 0, 1)`, same for Y. Placed items are stored as `{ itemId, zoneId, x, y }` (fractional, so placement stays correct across window resizes) and rendered in `ZoneCanvas.tsx` via `left: ${x*100}%, top: ${y*100}%` with a centering transform — the exact inverse of the capture math, so the round-trip is consistent by construction. Because `usePinchDrag`'s rect-based hit-test already guarantees the drop cursor position falls within the dropzone's bounds before `onDrop` fires at all, the resulting `relX`/`relY` naturally land in `[0,1]` without the defensive clamp ever actually triggering in practice.

**Ticket accrual — same timestamp-based real-time pattern proven twice, adapted to be uncapped.** `game/ticketAccrual.ts`'s `computeAccruedTickets(lastCollectedAt, totalAppealScore, now)` returns `totalAppealScore * 0.02 * elapsedSeconds` — unlike `getGrowthFraction`'s `[0,1]`-capped fraction (farm-builder's crop growth, pocket-pal's stat decay), this is intentionally uncapped since Tickets only ever go up, matching the family's currency rule. A "Collect Tickets" `HoverButton` banks the live-accrued amount into the spendable `tickets` balance and resets `lastCollectedAt`, mirroring farm-builder's harvest action.

**Verification — applying the Circuit Racer lesson.** Given that game's first pass shipped as a fake placeholder that only *looked* complete, this game's actual logic was verified at runtime before considering it done, not just typechecked. A temporary Node/tsx script (`__simtest.ts`, deleted after use) mocked a minimal `localStorage` and exercised `useZooStore`'s real actions directly: confirmed `placeItem` correctly rejects locked items, locked zones, and wrong-zone item/zone pairs; confirmed `unlockItem` correctly gates on affordability and zone-unlocked status; confirmed `unlockZone` enforces the linear unlock chain (can't skip ahead, can't double-unlock); confirmed all 6 achievement thresholds fire at the correct state transitions (first placement, 10 items, one zone fully unlocked, all 4 zones, 1000 lifetime tickets, 50 placements); confirmed the ticket-accrual formula's arithmetic directly. All 25 assertions passed. Also ran a headless-Chromium pass (fake media stream) confirming zero console/page errors through calibration and main-menu screens, and that the main menu correctly renders the game title and ticket count.

**Files added:** `data/{zones,zooItems}.ts` (4 zone defs; ~28 unified item defs with a `kind: 'animal'|'decoration'` field, mirroring pocket-pal's `careItems.ts` pattern), `game/ticketAccrual.ts`, `stores/zooStore.ts` (Zustand + persist → localStorage `'zoo-architect-progress'`; `placeItem`/`unlockItem`/`unlockZone`/`collectTickets` actions with achievement checks), `components/game/{ZooScreen,ZoneCanvas,ShopTray}.tsx` (main loop + pinch-drag wiring modeled directly on `PetScreen.tsx`; free-form canvas renderer; unlock tray modeled on `CareTray.tsx`), updated `App.tsx` (exit posts `totalTicketsEarned` as score) and `components/menu/MainMenu.tsx`. Scaffolded by copying `games/pocket-pal/` and stripping pet-specific files (removed the now-unused `game/growth.ts` too, since ticket accrual uses its own uncapped formula instead). `hooks/usePinchDrag.ts`'s `DragPayload` type was narrowed from farm-builder's `'seed'|'crop'` union to this game's `'animal'|'decoration'` (each game keeps its own copy of the hook, so this is a local, expected divergence, not a shared-code break).

**Platform wiring:** `src/games/registry.ts` — added `zoo-architect` entry. `supabase/seed_zoo_architect.sql` — upsert-safe game row (Adventure category, published, featured, age_group `4-9`, difficulty `easy`, modeled on `seed_pocket_pal.sql`). No DB schema changes — same generic `public.scores` table as every other game.

**Caveat:** No camera in this environment — pinch-drag (the core interaction, proven twice already but still) remains untested against a live hand. A webcam pass is recommended before shipping, same standing caveat as every pinch-drag game in this family.

---

## ADR-049 — Cascade Arrows (15th game, release-order logic puzzle)
**Date:** 2026-07-06
**Status:** Reverted — deleted at the user's request (no reason given). Kept as a historical record of the design (16-mechanic shared simulation engine, 20 verified levels, built-in Level Editor); nothing described here is live in the catalog. See the closing addendum below.

**Decision:** Add Cascade Arrows, a gesture-only logic puzzle, to `games/cascade-arrows/`, built to `public/games/cascade-arrows/`. The user's brief was modeled on the "Arrow Puzzle" genre (core loop only — release fixed-direction arrows in the correct order to solve a board) and explicitly asked for original assets/code/levels/sounds/naming with no copyrighted material.

**Engine-choice conflict, resolved before writing code:** the brief specified Phaser 3 + a from-scratch gesture-integration layer. Every other game on the platform (14 at the time) uses one consistent stack instead — Vite + React + TS + hand-rolled Canvas2D + a single shared MediaPipe `HandLandmarker` session + Zustand `persist` — and Phaser is not a dependency anywhere in the repo. Introducing it here would have meant a first-of-its-kind build pipeline, asset pipeline, and gesture layer with zero precedent to build on. This was flagged to the user via `AskUserQuestion` (engine choice is architecture-defining and not implied by "build a game like X") before any implementation; the user chose to match platform convention. The gameplay concept, level design, and all mechanics below are unaffected by this choice — only the rendering/build technology changed from what the brief literally specified.

**Core loop:** a grid of fixed-direction arrows. Hover a fingertip over an idle arrow (~600ms, the same dwell threshold used platform-wide) to select it, then close a fist to launch it — or, if fist detection is turned off in Settings, keep holding for ~0.8s total instead (`hoverDwellMs` + 200ms). Both release methods are configurable, per the brief. Idle (unreleased) arrows and already-rested (finished) arrows both act as obstacles for every other arrow's path, identically to walls — this single rule is the entire source of puzzle difficulty: solving requires inferring the correct release order from the static board, never reaction speed.

**Engine:** one shared grid-simulation module, `game/boardEngine.ts`'s `simulateRelease`, steps an arrow cell-by-cell against precomputed `LevelLookup` maps/sets (`game/levelLookup.ts`, built once per level so every per-cell check is O(1)). Runtime state (`BoardRuntimeState`: destroyed breakables, open doors, hit targets, triggered bombs, resting arrows) is plain `Set`/`Map` data, cloned cheaply for Undo snapshots. Sixteen mechanics are implemented as branches in one loop rather than 16 separate systems: Wall/Metal/Breakable all stop an arrow one cell short of the blocking cell (Breakable additionally destroys itself, permanently freeing the cell for later arrows — **a mid-build design reversal**: the first version let the breaking arrow continue through and rest on top of the broken cell, but that meant the destroyer's own body would still occupy — and re-block — the exact cell "opened" for future arrows, defeating the brief's "may open new routes" requirement; switched back to a wall-like stop-before-entry so the cell is genuinely empty for everyone else). Colored Gates filter by an `ArrowColor` field on `ArrowDef` (a property distinct from direction). Buttons open linked Doors by id. Paired Teleporters warp position while preserving direction. Conveyors override an arrow's direction for as long as it keeps re-entering conveyor tiles. Ice cancels exactly one Sticky stop (tracked via a one-step `onIce` flag) — chosen over a numeric "momentum" model as the simplest rule consistent with the base "arrows travel until blocked" behavior, since a momentum system would contradict that baseline unless every level constantly reinforced it. Mirrors ("/","\\") redirect 90° via a fixed direction-map. Bombs detonate on entry and recursively chain-trigger any other bomb within their Chebyshev blast radius, destroying breakables in range. One-Way Barriers gate on `arrow.direction === allowed`. Rotators redirect using a `Math.floor(elapsedMs / periodMs) % 2` toggle between two 90° turn modes — elapsed time is captured once at release and held fixed for that arrow's whole flight (a deliberate simplification: the mover/rotator's *visual* patrol on `BoardCanvas` still animates continuously in real time so the player can watch and time their release, but the collision math for one release is a single frozen snapshot, avoiding the complexity of sub-stepping mid-flight state changes). Movers patrol a `Cell[]` path back-and-forth on a real-time period and block whichever cell they currently occupy, using the same frozen-elapsed convention. Wind Zones nudge an arrow sideways exactly one cell on entry, if the nudge target is unobstructed.

**Levels:** 20 hand-authored puzzles across the five tiers from the brief's difficulty table — Beginner (3×3, arrows/targets only, teaches release order itself), Easy (5×5, adds Wall/Metal/Breakable), Medium (7×7, adds Colored Gates/Buttons+Doors/Teleporters), Hard (9×9, adds chain-reacting Bombs/Conveyors/Mirrors/Ice/Sticky), Expert (adds One-Way/Rotators/Movers/Wind, systems combined). Not "hundreds" as the brief's stretch language suggested — the level-data format (`LevelData`, one plain object per puzzle in `data/levels/*.ts`) makes adding more a pure data-authoring exercise with zero engine changes, which is the actual scalability requirement; 20 was chosen to demonstrate every mechanic at least once plus several genuine multi-arrow order-dependencies, matching how other large games in this catalog (Flag Quest's 31 flags, Circuit Racer's 6 courses) scoped sample content vs. architectural capacity.

**Verification — applying the Circuit Racer lesson that a clean build doesn't guarantee correct logic.** A temporary Node/tsx script (`scripts/verify-levels.mjs`, deleted after use) imported the real `buildLevelLookup`/`simulateRelease`/`isLevelSolved` directly and replayed each level's hand-designed intended release order, asserting the puzzle actually solves — all 20 passed. Seven levels were additionally designed to be genuinely order-dependent (not just superficially multi-arrow), and a negative check replaying the *wrong* order on each confirmed it does **not** solve the puzzle — all 7 passed, proving the sequencing mechanic is real rather than decorative. A headless-Chromium pass (Playwright, launched via a scratch npm install since the repo has no Playwright devDependency) confirmed the app loads, calibration gracefully reports "Camera unavailable" and auto-advances through all 3 steps via timeout with no camera present, and the main menu renders correctly ("0/20 solved", "Cascade Arrows" title) with zero *unexpected* console errors — the one `camera/model init failed` log is identical boilerplate already present in every sibling game's `handTrackingCore.ts` when no webcam exists in the build environment, not a regression.

**Scoring/hints/undo:** 3-star rating (par moves + zero hints → 3★, always ≥1★ on any solve, matching the platform's no-punishment philosophy). `game/hintSystem.ts` simulates every still-idle arrow from a scratch copy of the current state and suggests one that would hit a fresh target, falling back to one that unlocks progress (opens a door / triggers a bomb / uses a teleporter), never a full solution. Undo pops a state snapshot off a history stack (pushed before every release); Restart resets to a fresh `BoardRuntimeState`; neither is penalized. Open palm held ~1s toggles pause via its own small `rAF` loop in `GameplayScreen`, independent of `BoardCanvas`'s own per-frame hover/dwell loop.

**Level Editor:** `components/editor/EditorScreen.tsx` renders the grid as DOM `HoverButton` cells (not canvas) since editing doesn't need 60fps — a deliberate difference from gameplay's canvas renderer, chosen because it let the editor reuse the exact same dwell-selection primitive as every menu screen with no new hit-testing code. A tool palette covers all 17 placeable object kinds; teleporters, button+door pairs, and movers use a two-click "pending" ref (first click = entrance/door/path-start, second click completes the pair) rather than a modal. Export shows live JSON in a `<textarea>` (with a clipboard-copy button); Import parses pasted JSON through the same `validateLevel` warnings used to sanity-check hand-authored levels (duplicate-cell detection, dangling button→door references, teleporters pointing at themselves, targetless levels). A "Test Play" button hands the in-progress `LevelData` straight to `GameplayScreen` for a live playtest loop. **The one deliberate exception to "no keyboard/mouse" anywhere in this game:** the JSON textarea accepts normal keyboard paste, because the editor is an internal developer tool for authoring level data, not part of the gesture-only player-facing experience.

**Files added:** `games/cascade-arrows/` — full Vite project (`types/index.ts` — level schema + engine types; `mediaPipe/{handTrackingCore,GestureProvider}`, `hooks/useDwellProgress.ts`, `components/common/{HoverButton,ProgressRing,GestureCursorDot,HandLostOverlay,CameraFeed,GestureSlider}.tsx` copied near-verbatim from the proven scaffold; `audio/sound.ts` — new SFX set: launch/impact/break/explosion/switch/door/portal/target-hit/undo/restart/hint + ambient pad; `stores/{settingsStore,progressStore}.ts` — settings add `releaseGesture`/`hoverDwellMs`/`reducedMotion`, progress tracks per-level best-stars/moves + 8 achievements including cross-level counters (teleport-use, bomb-trigger); `game/{levelLookup,boardEngine,hintSystem,scoring,levelLoader,editorOps,particles}.ts`; `data/levels/{beginner,easy,medium,hard,expert,index}.ts` — 20 levels; `components/game/{BoardCanvas,GameplayScreen,EndScreen}.tsx`; `components/menu/{CalibrationScreen,MainMenu,LevelSelectScreen,SettingsScreen}.tsx`; `components/editor/EditorScreen.tsx`; `App.tsx`). `public/games/cascade-arrows/` — built dist (461KB JS / 145KB gzipped). `src/games/registry.ts` — added `cascade-arrows` entry. `supabase/seed_cascade_arrows.sql` — upsert-safe game row (Puzzle category, published, featured, age_group `6-12`, difficulty `medium`).

**Caveat:** gesture thresholds (hover-dwell timing, fist-vs-open-hand classification, palm-hold pause) are unverified against a live camera in this build environment — recommend a webcam pass before wide release, the same standing caveat as every gesture game in this catalog.

**Reverted (2026-07-06) — removed at the user's request.** No reason was given. `games/cascade-arrows/`, `public/games/cascade-arrows/`, and `supabase/seed_cascade_arrows.sql` deleted; the `cascade-arrows` entry dropped from `src/games/registry.ts`. Nothing here had ever been committed to git, so the removal is clean with no dangling references elsewhere in the app. One operational note for future cleanups on this machine: after `rm -rf` cleared the folder's contents (including its `node_modules`), OneDrive's sync process held a transient lock on the now-empty top-level directory for roughly a minute before it could actually be deleted — the folder was already functionally gone (empty, unregistered) well before the lock cleared, so this is cosmetic, not a sign anything failed. This ADR is kept (marked Reverted, not deleted) as a record of the design, matching how [[ADR-054]] (Gesture Boxing) was handled.

---

## ADR-050 — Word Search: Hidden Words (16th game, gesture-only word search)
**Date:** 2026-07-06
**Status:** Accepted

**Decision:** Add Word Search: Hidden Words to `games/word-search-hidden-words/`, built to `public/games/word-search-hidden-words/`. The brief was unusually explicit about architecture (mandatory folder layout, hook names, a named state machine) and about one constraint above all others: this is **not** a drag-and-select word search — no mouse-style drag logic is allowed anywhere, and every interaction, including menu buttons, must come from hover-dwell gestures. Followed platform convention (Vite + React + TS + one shared MediaPipe `HandLandmarker`) rather than introducing anything new, matching every prior game including [[ADR-049]].

**Selection state machine (the golden rule, made literal):** `systems/selectionEngine.ts` exports a pure `tickSelection` function implementing exactly the required `IDLE -> HOVERED -> START_SELECTED -> TRACING -> CONFIRMING -> VALIDATED_SUCCESS/VALIDATED_FAIL` machine — no transition may be skipped, and it is driven every frame by `hooks/useSelection.ts`'s own `requestAnimationFrame` loop rather than by React event handlers, so gesture data (dwell duration, off-grid duration, open-palm/fist flags) is the only thing that can move the state forward. Hovering a cell for 500ms (`HOVER_START_MS`, within the spec's 400-600ms band) transitions `HOVERED -> START_SELECTED`; moving to an adjacent cell locks a direction after the second letter (`normalizeDirection` in `utils/directions.ts` rejects any move that isn't exactly one of the 8 straight/diagonal rays, so off-axis drift is simply ignored rather than breaking the trace); an open-palm gesture or 1000ms off-grid (`GRID_EXIT_CONFIRM_MS`) confirms into `CONFIRMING`; a fist at any active stage cancels straight back to `IDLE`. `hooks/useSelection.ts` reads the confirmed path in a separate `useEffect` (kept out of the RAF loop so React state settles before validation), checks it against the puzzle's unfound words in both directions (forward and reversed, since words can be traced backwards), and flashes `VALIDATED_SUCCESS`/`VALIDATED_FAIL` for 500ms before auto-resetting to `IDLE`.

**Word placement:** `systems/wordPlacementEngine.ts`'s `generatePuzzle` places words first (up to 200 randomized start+direction retries per word, skipping impossible-length words), then fills every remaining cell with a random letter — the standard "reserve then backfill" approach, chosen over post-hoc validation because it guarantees every listed word has a real traceable path with no separate verification pass needed. Difficulty gates which of the 8 directions are eligible (`utils/directions.ts`'s `directionsForDifficulty`): Easy is horizontal/vertical only, Medium+Hard add all 4 diagonals; reversed placement is likewise Medium/Hard only. A `mulberry32` seeded PRNG (`utils/helpers.ts`) is injected into the generator so Daily Puzzle mode can build the exact same grid for everyone on a given UTC date (`dailySeed()`), while Classic/Timed/Zen draw a fresh `Math.random()`-seeded grid each time.

**Gesture API abstraction:** `hooks/useGesture.ts` returns exactly the shape specified in the brief (`cursorX, cursorY, isHovering, isOpenPalm, isFist, isTwoHandsRaised`) and is the only surface every other hook/component depends on — `mediaPipe/GestureProvider.tsx` (real MediaPipe `HandLandmarker`, `numHands: 2`, copied-and-extended from [[ADR-049]]'s pattern) is the sole implementation, but nothing outside `mediaPipe/` imports it directly. `isTwoHandsRaised` requires both hands open (`spread > 1.15`, same palm-spread heuristic as every sibling game) and above `wristY < 0.55` continuously for 700ms, tracked by a small `DurationTracker` primitive in `systems/gestureEngine.ts`; `App.tsx` polls it every 100ms to trigger a full level restart, satisfying the brief's "two hands raised = restart" rule without adding a second RAF loop.

**No drag-select, anywhere in the UI:** the brief's golden rule was interpreted to cover every clickable-looking element, not just the grid — `hooks/useDwellButton.ts` is a generic "hover this DOM rect for N ms" primitive used identically by the Hint/Pause/Restart/Exit HUD buttons, every menu screen button (mode/difficulty pickers, Start Game, Play Again), and the grid's own letter-hover detection conceptually mirrors it (though the grid uses cell-index math in `systems/gridEngine.ts`/`hooks/useGrid.ts` instead of DOM-rect hit-testing, since cells are laid out in a CSS grid rather than being individually measured). There is no `onClick` anywhere in the gameplay or menu code.

**Modes & difficulty:** Classic (no timer), Timed (180s countdown, ends the round on expiry), Zen (no timer, no urgency), and Daily (seeded, `systems/save.ts` tracks `lastDailyCompletedDate` so the menu shows "Daily ✓" once already solved today). Grid sizes 8x8/10x10/12x12 per `DIFFICULTY_CONFIG` in `types.ts`, matching the brief's easy/medium/hard table.

**Hints, audio, save:** Hint hovers show a pulsing marker over one unfound word's start cell for 1.5s and increment a `hintsUsed` counter (used as a completion-score penalty and persisted) — it never reveals direction or auto-solves, per the brief. `systems/audio.ts` is Web Audio oscillator synthesis (hover tick/letter select/path connect/word found/fail fade/victory chord), no audio files, consistent with every other game in the catalog. `systems/save.ts` persists completed-level count, best time per mode+difficulty combo, and lifetime hints-used to `localStorage`.

**Scoring/completion wiring:** on all-words-found, `App.tsx` posts `window.parent.postMessage({ type: 'GAME_COMPLETE', score })` with `words*100 + max(0, 600-elapsedSeconds) - hintsUsed*20`, the same `GameIframe` contract every other game uses (see [[ADR-049]]) — no new platform-side wiring needed.

**Files added:** `games/word-search-hidden-words/` — full Vite project (`types.ts`; `utils/{directions,helpers,wordBank}.ts`; `systems/{gridEngine,wordPlacementEngine,selectionEngine,gestureEngine,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useGrid,useWordSearch,useSelection,useDwellButton}.ts`; `components/{Grid,LetterCell,WordList,UIOverlay,PathCanvas}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/word-search-hidden-words/` — built via `npm run build:games word-search-hidden-words`. `src/games/registry.ts` — added `word-search-hidden-words` entry. `supabase/seed_word_search_hidden_words.sql` — upsert-safe game row (Puzzle category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — gesture thresholds (hover-dwell timing, direction-lock behavior, two-hands-raised detection) are unverified against a live hand, the same standing caveat as every gesture game in this catalog; `typecheck` and `build` both pass clean.

**Addendum (2026-07-06) — pinch-to-select replaces hover-dwell-to-start / open-palm-to-confirm.** User feedback: the index finger should only ever move the cursor; selecting/tracing letters should be a pinch ("pick") held down, and releasing the pinch should be the confirm trigger, matching a more natural pinch-drag-release mental model than dwell timers. Changed `mediaPipe/handTrackingCore.ts` to compute a normalized thumb-tip/index-tip distance per frame and expose `isPinching` with hysteresis (enters at `<0.35x` hand-scale, exits at `>0.45x`, so the signal doesn't chatter right at the trigger boundary) — added to `RawHandFrame`, `GestureState` (`types.ts`), and threaded through `GestureProvider.tsx`. `systems/selectionEngine.ts`'s `tickSelection` now transitions `HOVERED -> START_SELECTED` on pinch-down over the hovered cell (no 500ms wait) and `TRACING -> CONFIRMING` on pinch-up (no open-palm gesture, no 1s off-grid grace period) — `HOVER_START_MS`/`GRID_EXIT_CONFIRM_MS`/`forceConfirm` were removed as dead code. `hooks/useSelection.ts` dropped its hover/off-grid duration tracking accordingly; a pinch released after only the start letter (path length < 2) resets straight to `IDLE` with no fail-flash, since that's an accidental tap rather than a real attempt. Fist-to-cancel is unchanged. Menu/HUD dwell-buttons (Hint/Pause/Restart/Exit/mode-pickers) are unaffected — they still use hover-dwell (`useDwellButton`), since the user's request was specifically about letter selection, not general UI navigation. `typecheck` and `build:games` both pass clean; redeployed to `public/games/word-search-hidden-words/`.

---

## ADR-051 — Gesture Archery Range (17th game, aim/draw/release archery)
**Date:** 2026-07-06
**Status:** Accepted

**Decision:** Add Gesture Archery Range to `games/gesture-archery-range/`, built to `public/games/gesture-archery-range/`. This fills a genre gap flagged by request — no archery, bowling, boxing, or number-puzzle game existed among the prior 90+ — chosen over the alternatives because its three-step gesture flow (aim / draw / release) is unlike anything already in the catalog, whereas bowling/boxing would have leaned on gesture vocabulary (swing, punch) already covered by Circuit Racer/Samurai Slice/Knife Hit-adjacent games. Followed the exact same platform convention as [[ADR-050]]/[[ADR-049]] (Vite + React + TS + one shared MediaPipe `HandLandmarker`, `numHands: 2`), reusing `useGesture`'s abstract shape and `useDwellButton` for all menu/HUD navigation.

**Three-gesture shot flow, made an explicit state machine.** `systems/shotEngine.ts`'s `tickShot` implements `AIMING -> DRAWING -> IN_FLIGHT -> RESOLVED`, driven every frame by `hooks/useShot.ts`'s own RAF loop exactly like [[ADR-050]]'s selection machine: the index finger (`cursorX/cursorY`) is the *only* thing that ever moves the aiming reticle, in every state; a held fist (`isFist`) is the sole trigger to enter `DRAWING` and charge a power meter over `DRAW_CHARGE_MS` (1.4s to full draw); opening the palm (`isOpenPalm`) is the sole trigger to release. One deliberate special case sits outside the pure `tickShot` function: the actual release transition (`DRAWING -> IN_FLIGHT`) needs to call `systems/physics.ts`'s `resolveShot`, which consumes a wind-RNG value as a side effect — so `useShot.ts` intercepts `isOpenPalm` during `DRAWING` directly, computes the outcome once, and only calls `tickShot` for every other (pure) transition. Relaxing the fist *without* opening the palm resets straight back to `AIMING` with power zeroed and no arrow consumed — a "let-down," matching how a real bow is lowered without firing, and giving players a way to abort a bad draw.

**Shot resolution (`systems/physics.ts`) — the actual skill mechanic.** The reticle position is where the arrow *would* land with exactly the right power and zero wind. `requiredPower(distance)` scales 0.35→0.95 across the difficulty range; drawing below ~75% of that required power auto-fails as `'short'` (arrow drops before the target) with zero points, so a shot can't be won on aim alone. Above that threshold, `powerError = power - needed` drives a vertical impact offset (underdraw drops the hit low, overdraw sails it high — `verticalError = -powerError * 2.2`), and `config.windStrength` (0 on Easy, up to 0.65 on Hard) adds a random lateral drift consumed once per shot from a seeded RNG owned by `hooks/useRound.ts`. The resulting radial distance from center is checked against `SCORE_RINGS` (bullseye/inner/mid/outer, 10/8/5/2 points) to get both a `ShotResult` and a point value. This makes the skill loop genuinely two-dimensional: aim corrects for wind, draw strength must be judged for distance — not just "point and click."

**Modes & difficulty:** Classic (fixed 8-arrow quiver, no clock), Timed (90s to loose as many arrows as possible), Zen (no timer), Daily (seeded via `mulberry32(dailySeed())` in `useRound.ts` — the per-shot wind draws are identical for everyone on a given UTC day; target distance/size/wind-strength themselves still come from the chosen difficulty tier, not the mode). `DIFFICULTY_CONFIG` in `types.ts` sets distance/targetRadius/windStrength per tier (Easy: close, no wind; Medium: mid-range, light wind; Hard: long range, strong gusts, small rings).

**Rendering:** `components/Range.tsx` is a single DOM-based target view (four absolutely-positioned concentric `div` rings sized by `SCORE_RINGS` radius fractions) rather than canvas — chosen because the entire visual surface is a handful of positioned circles/dots with CSS transitions, not per-frame pixel work, so DOM absolute-positioning (same technique as [[ADR-049]]'s editor screen) is simpler than a canvas render loop for no performance cost. The arrow-in-flight is a single dot lerped from the reticle's aim position to the computed impact point over `FLIGHT_DURATION_MS` (450ms); `components/PowerMeter.tsx` shows a fill bar with a marker at `requiredPower(distance)` so players can learn to read "how far to draw" visually over a session.

**Files added:** `games/gesture-archery-range/` — full Vite project (`types.ts`; `utils/helpers.ts`; `systems/{gestureEngine,shotEngine,physics,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useRound,useShot}.ts`; `components/{Range,PowerMeter,UIOverlay}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-archery-range/` — built via `npm run build:games gesture-archery-range`. `src/games/registry.ts` — added `gesture-archery-range` entry. `supabase/seed_gesture_archery_range.sql` — upsert-safe game row (Sports category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — gesture thresholds (fist/open-palm classification, draw-charge feel, let-down responsiveness) are unverified against a live hand, the same standing caveat as every gesture game in this catalog; `typecheck` and `build` both pass clean.

**Bugfix (2026-07-06) — release only fired intermittently on open palm.** User-reported: opening the palm didn't always fire the shot. Root cause: `classifyHand`'s spread metric leaves a "neutral" gap between the fist threshold (`<0.55`) and the open-palm threshold (`>1.15`) that a hand almost always passes through for a frame or two while opening from a fist. `hooks/useShot.ts`'s RAF loop only checked for release via `current.state === 'DRAWING' && gesture.isOpenPalm`; on every other frame (including that neutral transition frame) it fell through to `tickShot`, whose `DRAWING` case treated *any* non-fist frame as an immediate let-down back to `AIMING` — with `AIMING` never checking `isOpenPalm` at all. So a release only worked when `isFist` flipped false and `isOpenPalm` flipped true on the exact same detection frame, a race that only sometimes won. Fix: added `LETDOWN_GRACE_MS` (260ms) to `systems/shotEngine.ts` — `tickShot`'s `DRAWING` case now only lets down on a *sustained* neutral hand (neither fist nor open palm) past that grace window, holding the current power steady while transiently neutral instead of cancelling. `hooks/useShot.ts` tracks the neutral streak with a `neutralSinceRef` timer, reset the moment the hand is a fist or an open palm again. A genuine "put your hand down and relax" still cancels the draw after ~a quarter second, same intent as before, but a normal fist→palm release motion no longer races against it. `typecheck`/`build:games` both pass clean; redeployed to `public/games/gesture-archery-range/`.

---

## ADR-052 — Gesture Bowling Lane (18th game, swing-through ten-pin bowling)
**Date:** 2026-07-06
**Status:** Accepted

**Decision:** Add Gesture Bowling Lane to `games/gesture-bowling-lane/`, built to `public/games/gesture-bowling-lane/`. Chosen (over Boxing/Punching or a Sudoku-style number puzzle, the other two catalog gaps flagged alongside Archery) because its gesture vocabulary — a continuous swing-through motion — is unlike anything in the platform: [[ADR-051]]'s archery is aim-then-hold-then-release, [[ADR-050]]'s word search is hover-then-pinch-then-release, but bowling needed a motion *itself* (raise, then swing down) to carry meaning, with power and curve both read off that single continuous gesture rather than a held pose. Same platform stack as every prior game (Vite + React + TS + one shared MediaPipe `HandLandmarker`), `useDwellButton` reused verbatim for all menu/HUD navigation.

**Position-threshold swing detection, not velocity-peak detection.** The original design sketch tracked instantaneous Y-velocity peaks to detect the swing (analogous to how [[ADR-051]]'s archery reads a held draw), but per-frame velocity off an already-EMA-smoothed cursor is noisy and hard to tune sight-unseen (no live camera in this environment to calibrate against — a real risk given [[ADR-051]]'s own release bug came from exactly this kind of frame-to-frame gesture-classification fragility). Switched to edge-triggered position-line crossings instead: `systems/swingEngine.ts` defines `BACK_LINE` (0.38) and `RELEASE_LINE` (0.68) in normalized frame-Y; `READY -> BACKSWING` fires the instant the hand crosses above `BACK_LINE` (locking the lane position, like a bowler settling their approach), `BACKSWING -> FORWARD_SWING` fires on the hand's vertical direction reversing (tracked via a running minimum-Y-since-backswing, with a small `REVERSAL_MARGIN` hysteresis), and the release itself (`FORWARD_SWING -> ROLLING`) fires on crossing back below `RELEASE_LINE` — computing **power** from how little time the whole downswing took (`swingPower()`, 150ms floor for full power up to 900ms for near-zero) and **curve** from how far the hand drifted sideways during that same downswing (`cursorX` at release minus `cursorX` at the start of the forward swing). Both of these — like [[ADR-051]]'s release interception — are computed as a side effect directly in `hooks/useSwing.ts` rather than inside the pure `tickSwing` transition function, which only handles `READY`/`BACKSWING`/`ROLLING`/`RESOLVED`.

**Shot resolution (`systems/pinEngine.ts`).** The ball's final lateral position at the pin deck is the locked lane position plus the release curve, scaled by `config.curveSensitivity` and damped by power (`curveDamping = 1.3 - power*0.6` — a harder, straighter throw has less time to hook than a soft one, mirroring [[ADR-051]]'s "overdraw sails, underdraw drops" tradeoff but for lateral curve instead of vertical drop). A knocked-down pin is any *standing* pin within a power-scaled hit radius of that final lateral position — a deliberate simplification over row-by-row pin-on-pin physics, documented plainly rather than hidden, the same "approximate the read, keep the code simple" tradeoff [[ADR-049]] used for its own simplifications. Going beyond `config.gutterThreshold` laterally is a clean gutter ball (0 pins) regardless of power.

**Official 10-frame scoring, verified against known scenarios.** `systems/scoringEngine.ts`'s `computeFrames` (scoreboard display/cumulative) and `advanceRollContext` (which frame/ball is next, when pins reset to a fresh rack) implement the real rules: frames 1-9 reset after a strike or after the second ball; the 10th frame resets *mid-frame* after a strike or a spare so the bonus ball(s) are thrown at a full rack — the single trickiest part of bowling scoring to get right. Verified with a temporary `tsx` script (deleted after use, per the pattern established in [[ADR-049]]'s `scripts/verify-levels.mjs`) asserting seven scenarios directly against the real engine functions: a perfect game (12 strikes → exactly 300), an all-gutter game (→ 0), all-spares-plus-bonus (→ 150), a single opening strike followed by nine `3/4` frames (→ 80, confirms strike-bonus lookahead), ten plain open frames (→ 70), a 10th-frame strike-then-two-bonus-balls (→ 17), and a 10th-frame spare-then-one-bonus-ball (→ 15) — all seven passed on the first implementation.

**Modes & difficulty:** Classic (full untimed 10-frame game), Timed (5-minute cutoff, ends the game with whatever's been thrown), Zen (no timer), Daily (`mulberry32(dailySeed())` in `hooks/useGame.ts` produces a small shared `laneBias` added to every roll's curve that day — everyone plays the same subtly-biased lane, the bowling equivalent of [[ADR-051]]'s daily wind or [[ADR-050]]'s daily grid). `DIFFICULTY_CONFIG` in `types.ts` scales pin-hit radius and curve sensitivity per tier (Easy: forgiving/straight; Hard: tight pocket, twitchy curve).

**Rendering:** `components/Lane.tsx` is DOM-absolute-positioned (percentage-based lateral offsets via a `LANE_TO_PERCENT` scale), matching [[ADR-051]]'s `Range.tsx` precedent — a lane with a handful of positioned pin/ball divs doesn't need a canvas render loop. `components/Scoreboard.tsx` renders a real 10-box bowling score sheet (X/spare-slash/open-frame notation) reading directly off `computeFrames`' output.

**Files added:** `games/gesture-bowling-lane/` — full Vite project (`types.ts`; `utils/helpers.ts`; `systems/{gestureEngine,swingEngine,pinEngine,scoringEngine,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useGame,useSwing}.ts`; `components/{Lane,SwingMeter,Scoreboard,UIOverlay}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-bowling-lane/` — built via `npm run build:games gesture-bowling-lane`. `src/games/registry.ts` — added `gesture-bowling-lane` entry. `supabase/seed_gesture_bowling_lane.sql` — upsert-safe game row (Sports category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — the swing thresholds (`BACK_LINE`/`RELEASE_LINE`/`REVERSAL_MARGIN`, power/curve feel) are unverified against a live hand and are the most likely thing to need retuning on first real play, the same standing caveat as every gesture game in this catalog. Scoring/pin logic itself is verified deterministically (above); `typecheck` and `build` both pass clean.

---

## ADR-053 — Gesture Mini-Golf (19th game, swing-through putting with real per-tick physics)
**Date:** 2026-07-06
**Status:** Accepted

**Decision:** Add Gesture Mini-Golf to `games/gesture-mini-golf/`, built to `public/games/gesture-mini-golf/`. Chosen by the user from a shortlist of remaining catalog gaps (Boxing, Sudoku, Golf, Darts) after [[ADR-051]]/[[ADR-052]] filled Archery and Bowling. Scaffolded directly from `games/gesture-bowling-lane/` (mediaPipe layer, `gestureEngine.ts`, `useGesture`/`useDwellButton`, `utils/helpers.ts` copied verbatim) since it deliberately **reuses Bowling's exact swing vocabulary** — raise the hand to cross a backswing line, swing it down through a release line to let the ball go — rather than inventing a fourth gesture flow. The planning note going in was explicit that this is intentional reuse, not a missed opportunity for a "distinct" mechanic: the two games feel different in play (one lane vs. free-roam green, fixed pin animation vs. real physics) even though the swing trigger is identical.

**What's actually new vs. Bowling: aim comes from where the hand points, and the ball needs real continuous physics, not a lerp.** Bowling's `lanePosition` is a single locked X value because the lane is fixed-direction; golf's ball can go anywhere on a 2D green, so `systems/swingEngine.ts`'s `BACKSWING` lock captures a full `aimTarget` point (the hand's live `cursorX/cursorY`, treated as a point directly on the green) instead of a 1D offset — `Course.tsx` draws this locked target as a dashed aim line from the ball so the player can see exactly where they're compensating for a wall or slope before swinging. `tickSwing` itself only implements `READY -> BACKSWING -> FORWARD_SWING` (identical edge-triggered `BACK_LINE`/`RELEASE_LINE`/`REVERSAL_MARGIN` crossings, same constants, as [[ADR-052]]); the release, ROLLING, and RESOLVED steps are deliberately **not** modeled in the pure engine at all this time (a further step past Bowling's "hook intercepts one transition" pattern) — `hooks/useSwing.ts` computes the release velocity from `aimTarget` vs. ball position and power, then steps `systems/ballPhysics.ts`'s `stepBall` every animation frame with a real fixed-timestep-ish `dt` until the ball naturally stops, sinks, or hits water, because a putt's duration depends on the shot itself (bowling's roll was always a fixed 1.5s lerp — that shortcut doesn't work once walls/slopes/friction can meaningfully change how long a shot takes).

**`systems/ballPhysics.ts` (the new engine)** is a simplified top-down 2D stepper: slope obstacles add constant acceleration while the ball is inside them; sand multiplies friction; walls use a simple AABB penetration-depth reflection (push out along whichever edge was penetrated least, flip that velocity axis, apply a `0.65` restitution) rather than true rigid-body collision — the same "approximate the read, keep the code simple" tradeoff [[ADR-049]] and [[ADR-052]]'s `pinEngine.ts` both used and documented plainly rather than hid. Six hand-authored holes (`systems/courseData.ts`) increase in obstacle density from a plain straight tap-in (hole 1, par 2, no obstacles) to a combination hole with side-rail walls, a sand strip, and a water hazard (hole 6, par 5) — the same "small hand-authored level list, no engine changes needed to add more" pattern as [[ADR-049]]'s level data and [[ADR-050]]'s word bank.

**Verified with a temporary `tsx` script** (deleted after use, same pattern as [[ADR-052]]'s `verify-scoring.ts` and [[ADR-049]]'s `verify-levels.mjs`), asserting directly against the real `stepBall`/`initialBallState` functions: a full-power straight putt on hole 1 sinks; a weak putt on the same hole falls short without sinking; a putt aimed straight through hole 4's known water rect registers `inWater`; a putt aimed at hole 2's wall center bounces off rather than ending up stuck inside the wall's rect; and a full-power shot with no obstacles never leaves the 0..1 course bounds. All five passed on the first implementation.

**Scoring (`systems/scoringEngine.ts`)** is deliberately much simpler than Bowling's official 10-frame rules — golf stroke-play is just "count the strokes per hole, compare to par" (`relativeToParLabel` gives the familiar birdie/par/bogey/hole-in-one labels for the scoreboard and result flashes). Since golf's own scoring convention is lowest-strokes-wins, `toLeaderboardScore` converts a completed round into a "higher is better" number (`(par*3 - strokes) * 10`, floored at 0) before posting `GAME_COMPLETE`, so the platform's shared leaderboard convention (used by every other game) still holds without a special case anywhere else in the app.

**Modes & difficulty:** Classic (full untimed round), Timed (4-minute cutoff), Zen (no timer), Daily (`mulberry32(dailySeed())` in `hooks/useGame.ts` produces a shared `frictionScale` "green speed" for everyone that day — the golf equivalent of [[ADR-052]]'s daily lane-oil drift or [[ADR-051]]'s daily wind). `DIFFICULTY_CONFIG` in `types.ts` scales which holes are played (`holeCount`: Easy 4, Medium/Hard 6) and how forgiving the cup/putt power are (`cupRadiusMultiplier`, `maxPuttSpeedMultiplier`).

**Files added:** `games/gesture-mini-golf/` — full Vite project (`types.ts`; `utils/helpers.ts`; `systems/{gestureEngine,swingEngine,ballPhysics,scoringEngine,courseData,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useGame,useSwing}.ts`; `components/{Course,SwingMeter,Scoreboard,UIOverlay}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-mini-golf/` — built via `npm run build:games gesture-mini-golf`. `src/games/registry.ts` — added `gesture-mini-golf` entry. `supabase/seed_gesture_mini_golf.sql` — upsert-safe game row (Sports category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — the swing thresholds (shared with Bowling, so subject to the same retuning risk noted in [[ADR-052]]) and the ball-physics feel (friction/restitution/slope-accel constants) are unverified against live play, the same standing caveat as every gesture game in this catalog. The physics and scoring math themselves are deterministically verified (above); `typecheck` and `build` both pass clean.

**Addendum (2026-07-06) — fist-hold-to-charge/fist-release-to-shoot replaces the swing-through-a-line gesture.** User feedback: shooting the ball should happen on releasing a fist, not by physically swinging the hand down through a position threshold. Replaced the Bowling-derived `BACK_LINE`/`RELEASE_LINE`/`REVERSAL_MARGIN` edge-crossing detection with the same charge/release vocabulary [[ADR-051]]'s archery already uses: `SwingState` shrank to `READY -> CHARGING -> ROLLING -> RESOLVED` (dropped `BACKSWING`/`FORWARD_SWING`); `systems/swingEngine.ts`'s `tickSwing` now transitions `READY -> CHARGING` the instant `isFist` goes true (locking nothing — aim keeps tracking the live cursor throughout `CHARGING` so the player can fine-tune it while charging), and power ramps via a plain `chargeHeldMs / CHARGE_MS` (1200ms to full power) exactly like archery's draw. The shoot trigger itself — deliberately simpler than archery's design — is *any* `isFist: true -> false` transition, not specifically a transition into a classified open palm: `hooks/useSwing.ts` tracks `wasFistRef` and fires the moment it flips false, using whatever `aimTarget`/`power` had been reached. This sidesteps the exact race [[ADR-051]]'s bugfix addendum had to patch after the fact (a hand opening from a fist passes through a "neither fist nor open palm" gap for a frame or two) — since golf's trigger only cares that the fist is no longer a fist, that in-between frame *is* the release, not a false cancel. No let-down/cancel concept exists here at all, unlike archery, since there's no real downside to a putt firing slightly early on an unintentional fist relax. `Course.tsx`'s aim-line visibility and `SwingMeter.tsx`'s state labels/copy were updated for the two renamed states; `App.tsx`'s menu subtitle now describes "make a fist to charge, release your fist to shoot." `typecheck`/`build:games` both pass clean; redeployed to `public/games/gesture-mini-golf/`.

---

## ADR-054 — Gesture Boxing (20th game, reactive sparring with real two-hand tracking)
**Date:** 2026-07-06
**Status:** Reverted same day — see the closing addendum below. Kept as a historical record of the design (dual-hand tracking, velocity-based punch detection, telegraph/strike AI) in case a future attempt reworks rather than repeats it; nothing described here is live in the catalog.

**Decision:** Add Gesture Boxing to `games/gesture-boxing/`, built to `public/games/gesture-boxing/`. The user picked it from a shortlist (Boxing/Sudoku/Darts) specifically for having the most distinct gesture vocabulary left in the catalog — fast reactive combat rather than the aim-charge-release rhythm shared by [[ADR-051]] (archery), [[ADR-052]] (bowling), and [[ADR-053]] (mini-golf). That distinctness has a real architectural consequence: boxing is the first game built this session where the abstract `GestureState` is **not** a single smoothed cursor plus a few booleans — it's `{ left: HandState, right: HandState, isTwoHandsRaised }`, because blocking fundamentally requires knowing both hands' fist/position state at once, and punches need real velocity (not just position) to detect a fast swing versus a resting hand. `mediaPipe/handTrackingCore.ts` was rebuilt on `numHands: 2` with `handedness`-based left/right assignment (the same dual-hand pattern already proven by Gesture Drums, not a new approach for this platform); velocity is computed in `GestureProvider.tsx` from frame-to-frame position deltas (with a small jitter deadzone) rather than being smoothed away, since a punch's speed is the entire signal — the `CursorSmoother` primitive every single-cursor game in this catalog uses was deliberately **not** reused here, because smoothing would blunt exactly the fast motion this game needs to detect.

**Punch detection and classification (`systems/combatEngine.ts`).** Either hand, while a fist, registers a punch the instant its speed crosses `PUNCH_SPEED_THRESHOLD` (2.2 units/sec), debounced per-hand by `PUNCH_COOLDOWN_MS` (280ms) so one swing can't multi-register. `classifyPunch` is a one-line rule — whichever velocity axis dominated (`|vx| > |vy|` = hook, otherwise jab) — deliberately simple and fully deterministic rather than any kind of gesture-recognition model, consistent with every other "cheap, explainable heuristic over the real thing" decision in this catalog (e.g. [[ADR-052]]'s pin-hit-radius, [[ADR-053]]'s AABB wall reflection). Landing punches builds a streak (`comboMultiplier`, up to +50% damage at a 10-hit streak) that resets to zero the instant the player takes an unblocked hit, rewarding sustained pressure without needing a separate "counter" mechanic.

**The opponent's independent attack cycle (`systems/opponentEngine.ts`) is the real state machine of this game**, mirroring the rigor of [[ADR-050]]'s selection machine and [[ADR-051]]'s shot machine: `IDLE -> TELEGRAPH -> STRIKE -> RECOVER -> IDLE`, with `TELEGRAPH`'s duration and `RECOVER`'s duration both difficulty-scaled and `IDLE`'s wait randomized (seeded, so Daily mode reproduces the same attack timing sequence for everyone via `mulberry32(dailySeed())`). Whether a strike actually lands is **not** decided inside the pure engine — `hooks/useCombat.ts` reads the player's live block posture (`isBlocking`: both hands fists, both raised above `GUARD_LINE`) at the exact frame `TELEGRAPH` transitions into `STRIKE` and resolves damage as a side effect, the same "engine stays pure, hook intercepts the one meaningful transition" pattern used by every physics/combat game built this session. This also means the restart gesture (`isTwoHandsRaised`, both hands **open** and raised) can never collide with blocking (both hands **fists** and raised) — same body posture, different hand shape, cleanly distinguishable by the existing fist/open-palm classifier with zero new logic needed.

**Verified with a temporary `tsx` script** (deleted after use, same pattern as [[ADR-052]]'s `verify-scoring.ts` and [[ADR-053]]'s `verify-physics.ts`): a 30-second simulated run asserted every single transition the opponent engine took was on the legal `IDLE→TELEGRAPH→STRIKE→RECOVER→IDLE` list (no skips), that `TELEGRAPH`/`STRIKE`/`RECOVER` each held for at least their configured minimum duration, and that the initial attack delay landed inside its configured range. All 6 checks passed on the first implementation.

**Modes & difficulty:** Classic (fight to a knockout either way, no clock), Timed (90-second sparring session, decided on remaining health if nobody's KO'd), Zen (`passive: true` — the opponent engine never ticks, so there's no incoming damage at all, turning the same fight structure into a heavy-bag combo-practice session with zero risk), Daily (Classic's structure with a shared seeded RNG for attack timing and strike-damage rolls). `DIFFICULTY_CONFIG` in `types.ts` scales opponent health, telegraph/recover duration, attack frequency, and strike damage per tier.

**Files added:** `games/gesture-boxing/` — full Vite project (`types.ts`; `utils/helpers.ts`; `systems/{gestureEngine,opponentEngine,combatEngine,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useCombat}.ts`; `components/{Ring,HealthBars,ComboMeter,UIOverlay}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-boxing/` — built via `npm run build:games gesture-boxing`. `src/games/registry.ts` — added `gesture-boxing` entry. `supabase/seed_gesture_boxing.sql` — upsert-safe game row (Sports category, published, not featured, age_group `8-14` given the combat theme vs. the platform's usual `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — `PUNCH_SPEED_THRESHOLD`, `PUNCH_COOLDOWN_MS`, and `GUARD_LINE` are reasoned-through constants, not tuned against a live hand throwing real punches, and are the most likely thing to need adjustment on first real play (a too-low speed threshold would read normal hand movement as constant punching; too high would miss real jabs) — the same standing caveat as every gesture game in this catalog, arguably sharper here since velocity thresholds are inherently harder to eyeball than position thresholds. The opponent state machine itself is deterministically verified (above); `typecheck` and `build` both pass clean.

**Bugfix (2026-07-06) — hand cursor wasn't visible.** User-reported: no visible indicator of where the tracked hand(s) were. Root cause: every other single-cursor game in this catalog renders a `position: fixed` dot mapped directly to viewport percentages, but `components/Ring.tsx` instead rendered `.gbx-glove` markers `position: absolute` *inside* the small centered `.gbx-ring` box, using the same raw camera-frame-fraction `x`/`y` values — a coordinate-space mismatch (frame-relative coordinates plotted against a box far smaller than the viewport), so the markers ended up in the wrong place relative to the ring, and there was no hand indicator at all on the menu screen (`MenuScreen` never rendered anything hand-related, unlike every other game's menu). Fix: removed the in-ring markers entirely and added `components/HandCursors.tsx`, a small component rendered once at the `App.tsx` root (inside `CameraGate`, so it only shows once tracking is actually active) that renders both hands as `position: fixed` dots — the established pattern from every prior game, just doubled for two hands (blue-tinted left, red-tinted right, both glowing yellow when classified as a fist). `typecheck`/`build:games` both pass clean; redeployed to `public/games/gesture-boxing/`.

**Reverted (2026-07-06) — removed at the user's request.** Shortly after the cursor-visibility fix above, the user tried the game and said it wasn't working as they'd expected, without further specifics (possibly the velocity-threshold punch detection itself feeling off in practice, which was already flagged as the sharpest-risk caveat above — untested against a live camera, unlike the position-threshold gestures every other game in this catalog uses). Rather than iterate blind on a mechanic neither of us could verify hands-on, the whole game was deleted: `games/gesture-boxing/`, `public/games/gesture-boxing/`, and `supabase/seed_gesture_boxing.sql` removed; the `gesture-boxing` entry dropped from `src/games/registry.ts`. Nothing here had ever been committed to git, so the removal is entirely clean with no dangling references anywhere else in the app. This ADR is kept (marked Reverted, not deleted) purely as a record of what was tried and why it didn't land, rather than rewriting history — a future attempt at the Boxing genre gap should start from a different gesture design rather than assume this one just needs retuning.

---

## ADR-055 — Gesture Sudoku (20th game, number-logic puzzle built entirely from proven gesture primitives)
**Date:** 2026-07-06
**Status:** Accepted

**Decision:** Add Gesture Sudoku to `games/gesture-sudoku/`, built to `public/games/gesture-sudoku/`. The user's ask was explicit and different from every prior pick this session: **simple to build, but interesting to play**. Chosen over Darts (the other remaining catalog gap) specifically because of the lesson from [[ADR-054]]'s revert — Boxing's core problem was a brand-new gesture-detection mechanic (raw velocity thresholds) with no way to verify it against a live camera in this environment, and it "didn't work as expected" on the very first real play. Sudoku sidesteps that risk entirely: it needs **zero new gesture-detection code**. Cell selection is hover-then-pinch, the exact mechanic Word Search's grid already uses post-[[ADR-050]]'s pinch addendum; digit entry is hover-dwell on a number pad, the exact mechanic every menu and HUD button on the platform already uses. The only genuinely new code in this entire game is ordinary, deterministic puzzle logic — ​the safest possible kind of "new" for a build with no camera to test against.

**Selection is a tap, not a drag — deliberately simpler than Word Search's machine.** `hooks/useCellSelect.ts` has no state machine at all: it's a single RAF loop that tracks which cell is hovered (via `useGrid.ts`'s cursor-to-cell mapping, copied near-verbatim from Word Search's `gridEngine.ts`) and fires `onSelect` the instant `isPinching` edge-triggers from false to true while a cell is hovered. Word Search needed `IDLE→HOVERED→START_SELECTED→TRACING→CONFIRMING→VALIDATED_*` because a traced word is a *path*; Sudoku has nothing to trace, so the full machine would have been unnecessary ceremony for what's really just "pinch = tap this cell."

**`systems/sudokuEngine.ts`** is the one real new engine: `generateFullGrid` is a standard randomized-backtracking fill (shuffled 1-9 candidates per cell, backtrack on dead ends) producing a genuine valid solution every time; `removeCellsForClues` reduces it to a difficulty's clue count (Easy 40 / Medium 32 / Hard 26) via a shuffled removal order — **deliberately not** running a uniqueness solver (which would need constraint propagation or exhaustive search to guarantee a single solution), the same "approximate the read, keep the code simple" tradeoff this catalog has made before ([[ADR-052]]'s pin-hit-radius, [[ADR-053]]'s AABB wall reflection) — clue count alone is the standard, good-enough difficulty proxy real Sudoku apps use. `findConflicts` checks every row/column/3x3-box for duplicate values (live highlighting only, no penalty — the same no-punishment philosophy as Word Search's fading incorrect traces); `isSolved` is just "every cell filled and zero conflicts." `hooks/usePuzzle.ts` keeps the generated `solution` grid alongside the visible puzzle purely so **Hint** can reveal one correct digit for the selected cell without ever touching the rest of the board, matching every other game's "hint nudges, never auto-solves" rule.

**Verified with a temporary `tsx` script** (deleted after use, same pattern as every prior game's engine verification): `generateFullGrid` produces a fully valid 9x9 solution across 10 different seeds; `removeCellsForClues` leaves exactly the configured clue count at each difficulty with zero conflicts among the remaining clues; `findConflicts` correctly flags a manually-introduced duplicate; `isSolved` is false with one empty cell and true once the real solution is filled in. All 10 checks passed on the first implementation.

**Modes & difficulty:** Classic (untimed single puzzle), Timed (5-minute countdown), Zen (no timer), Daily (`mulberry32(dailySeed())` seeds the same puzzle for everyone that day, the same convention as every other game's Daily mode). `DIFFICULTY_CONFIG` in `types.ts` is just a clue count per tier — the simplest difficulty axis of any game in this catalog, intentionally, per the "simple to build" brief.

**Files added:** `games/gesture-sudoku/` — full Vite project (`types.ts`; `utils/helpers.ts`; `systems/{gestureEngine,sudokuEngine,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useGrid,usePuzzle,useCellSelect}.ts`; `components/{Grid,NumberPad,UIOverlay}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-sudoku/` — built via `npm run build:games gesture-sudoku`. `src/games/registry.ts` — added `gesture-sudoku` entry. `supabase/seed_gesture_sudoku.sql` — upsert-safe game row (Puzzle category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — the pinch-tap and hover-dwell thresholds are each individually proven elsewhere in this catalog, but their specific feel in *this* game (grid cell sizing, pinch hysteresis at small target sizes) is still unverified against a live hand. Meaningfully lower risk than [[ADR-054]]'s velocity detection, per the whole point of this pick, but not zero risk. The puzzle-generation and validation logic itself is deterministically verified (above); `typecheck` and `build` both pass clean.

---

## ADR-056 — Gesture Darts (21st game, real 301/501/Cricket vs a turn-based CPU opponent)
**Date:** 2026-07-08
**Status:** Accepted

**Decision:** Add Gesture Darts to `games/gesture-darts/`, built to `public/games/gesture-darts/`. Darts was the one catalog gap explicitly flagged and left unbuilt back at [[ADR-051]] (archery) and [[ADR-055]] (Sudoku) — every other shortlisted gap (Boxing, twice) either shipped or was reverted, leaving Darts as the last item on that original list. Scaffolded directly from `games/gesture-archery-range/` (mediaPipe layer, `gestureEngine.ts`, `useGesture`/`useDwellButton`, `utils/helpers.ts` copied near-verbatim) because darts and archery share the exact same real-world gesture vocabulary — aim, draw back, release — so reusing [[ADR-051]]'s proven `AIMING -> DRAWING -> IN_FLIGHT -> RESOLVED` state machine (renamed `useThrow`/`throwEngine.ts` here) sidesteps inventing any new gesture-detection code, the same risk-reduction lesson [[ADR-055]] drew from [[ADR-054]]'s revert.

**What's actually new: a real dartboard, real 301/501/Cricket rules, and a turn-based CPU opponent — none of which existed anywhere in this catalog.** `systems/dartboard.ts` models a regulation board's real proportions (double-bull, bull, triple ring, and double ring radii computed as fractions of a 170mm board, matching real tournament dimensions) and the true clockwise sector order (20-1-18-4-13-...-5), so `scoreImpact(x, y)` — the single source of truth for scoring — resolves any impact point into an actual sector+ring+multiplier, not a simplified concentric-rings target like [[ADR-051]]'s. `pointForTarget` is its exact inverse, letting the AI opponent aim at a specific board target using the same function space as the player. `systems/physics.ts`'s `resolveThrow` keeps [[ADR-051]]'s under/over-draw-scatters-the-impact idea but drops wind entirely (darts is thrown from one fixed, unchanging oche distance, unlike archery's per-difficulty distance) — difficulty in this game instead only scales the *AI opponent's* throw jitter (`DIFFICULTY_AI`), never the rules or the player's own physics, since a real dartboard's scoring shouldn't change with a difficulty picker.

**Rules engines are pure functions, verified independently of any gesture code.** `systems/x01Engine.ts`'s `applyX01Throw` enforces the real bust rules for 301/501: going below zero, or landing exactly on a remaining score of 1 (unfinishable, since the lowest possible checkout is double-1 = 2), busts; reaching exactly zero only wins if the final dart was a double (the double-bull's multiplier of 2 counts identically for checkout purposes). `systems/cricketEngine.ts`'s `applyCricketThrow` implements real cricket marking: a dart contributes marks equal to its multiplier toward closing a number (15-20 plus bull), and once a number is closed by a player, any further marks on it only convert to points if the opponent hasn't also closed that same number — a single formula (`marksToClose`/`overflow`) handles both "first closes it this dart" and "already closed, purely scoring now" without a special case for either. `systems/matchEngine.ts`'s `applyDart` is the one place turn logic lives (mirroring this catalog's one-pure-engine-function-per-game convention): it tracks `turnStartScore` specifically so a mid-turn bust reverts the *entire* three-dart visit, not just the busting dart — the subtle part of the real bust rule most simplified implementations get wrong.

**The CPU opponent plays by the identical rules, not a shortcut AI.** `systems/aiOpponent.ts`'s `simulateAiThrow` picks a sensible target (the checkout double when an x01 score is in range, otherwise the highest-value scoring area; the highest-value open number in cricket, or a closed-but-scoreable one once everything's closed) and then throws through the *exact same* `resolveThrow`/`scoreImpact` functions the player's gesture throw uses, at ideal power with scatter scaled only by `DIFFICULTY_AI[difficulty].jitter` — so difficulty is purely "how shaky is the CPU's simulated hand," never a rules exception. `hooks/useMatch.ts` drives the CPU's three darts on a short cosmetic delay once it's `CPU_TURN`, and `hooks/useThrow.ts` gained an `enabled` flag (not needed by any single-player game in this catalog) so the player's real gesture input is ignored entirely during the CPU's turn.

**Rendering:** `components/Dartboard.tsx` is the first SVG-based render in this catalog rather than the DOM-absolute-positioned-divs approach every prior game ([[ADR-051]]'s `Range.tsx` precedent) used — a segmented, non-uniform 20-sector board with four ring bands per sector genuinely needs wedge geometry (`wedgePath`, an annular-sector SVG path per ring band) that plain rectangular/circular divs can't express, so this is a deliberate, documented departure from the established pattern rather than an oversight. `components/ScoreCard.tsx` renders either a simple two-line x01 countdown or a real cricket marks table (three-pip trackers per number, CSS dots rather than text glyphs — sidestepping the exact class of unsupported-glyph rendering bug [[ADR-047]]/Zoo Architect's fix already hit once in this catalog).

**Verified with a temporary `tsx` script** (deleted after use, same pattern as every prior game's engine verification): every sector's `pointForTarget` round-trips correctly back through `scoreImpact` for both triple and double rings across all 20 sectors; center and near-bull impacts resolve to double-bull/bull correctly; an x01 dart busts on going below zero, busts on landing exactly on 1, busts on reaching zero via a single (no double), and wins on both a double-ring and a bullseye checkout; cricket marks close correctly from zero, score overflow points once already closed (and only while the opponent hasn't also closed), and correctly split a single triple's marks between closing a number and scoring the overflow in the same dart; and — the one most likely to be wrong in a naive implementation — a mid-turn bust reverts the running score all the way back to what it was at the *start* of that three-dart turn, not just to the score before the busting dart. 57 checks passed on the first implementation.

**Modes:** 301, 501, and Cricket, each playable against Easy/Medium/Hard CPU, plus a Daily Challenge toggle (`mulberry32(dailySeed())` seeds the CPU's throw jitter identically for everyone that day, the same convention as every other game's Daily mode — the player's own throws are never seeded, since real hand movement is never deterministic anyway).

**Files added:** `games/gesture-darts/` — full Vite project (`types.ts`; `utils/helpers.ts`; `systems/{gestureEngine,dartboard,physics,throwEngine,x01Engine,cricketEngine,matchEngine,aiOpponent,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useThrow,useMatch}.ts`; `components/{Dartboard,PowerMeter,ScoreCard,UIOverlay}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-darts/` — built via `npm run build:games gesture-darts`. `src/games/registry.ts` — added `gesture-darts` entry. `supabase/seed_gesture_darts.sql` — upsert-safe game row (Sports category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — the throw scatter constants (`jitterBase`/`overUnderScale`/`DIFFICULTY_AI` jitter values) are reasoned-through, not tuned against a live hand throwing real darts, the same standing caveat as every gesture game in this catalog. Verified in a headless Playwright check with a fake camera device: the menu renders cleanly (mode/difficulty buttons, Daily toggle, Start Match) with zero console errors; actually progressing past the menu requires a real tracked hand for the hover-dwell buttons (mouse clicks intentionally do nothing, matching the platform's gesture-only convention), so full match play is unverified against live input. The rules/scoring engines themselves are deterministically verified (above); `typecheck` and `build` both pass clean.

---

## ADR-057 — Liquid Puzzle (22nd game, water-sorting puzzle with a real solver and two new hand poses)
**Date:** 2026-07-08
**Status:** Accepted

**Decision:** Add Liquid Puzzle to `games/liquid-puzzle/`, built to `public/games/liquid-puzzle/`. User-specified, not chosen from a catalog-gap shortlist like every prior pick this session — a detailed brief for a "Water Sort"-style color-sorting puzzle, TV-first and gesture-only, with a much larger surface area than any single game built so far (calibration onboarding, three modes, a real solver, hint/undo systems, full statistics/settings). Scaffolded from `games/gesture-sudoku/` (`gestureEngine.ts`'s `CursorSmoother`, `useDwellButton.ts`, the mediaPipe wrapper shape, config files) since Sudoku's hover-then-pinch-tap selection is the closest existing analog to this game's hover-then-hold gesture, and its `isPinching`-with-hysteresis pattern in `handTrackingCore.ts` was the template adapted for two poses no prior game needed.

**Two brand-new hand poses, built from the same per-finger-extension primitive every classifyHand in this catalog already uses.** `mediaPipe/handTrackingCore.ts` computes each of the four non-thumb fingertips' distance from the palm center (normalized by hand scale) exactly like every other game's fist/open-palm check, then adds: thumbs-up (`fourCurled && thumbExt > 0.75 && thumbPointsUp`, where "points up" is just the thumb tip sitting above its own MCP joint in screen-Y) and a victory/peace sign (index+middle both extended past 1.0, ring+pinky both curled under 0.75, and the index-to-middle tip distance wide enough to be a genuine "V" rather than two fingers pressed together). Both reuse the exact same geometric vocabulary as fist/open-palm detection — no new landmark math, no ML gesture classifier, keeping the "reasoned heuristic over the real thing" convention this whole catalog follows. Tube grab/pour is hover-plus-held-fist for `SELECT_HOLD_MS` (`hooks/useTubeInteraction.ts`, a dwell-button variant keyed to a fist instead of hover-alone); undo and hint are edge-triggered on thumbs-up/victory-sign rather than held, since both poses are already distinctive enough not to need a hold-timer on top; pause is an open palm held continuously for a full 2 seconds *anywhere* on screen (`hooks/useActionGestures.ts`), not tube-scoped.

**A calibration onboarding flow — the first in this catalog.** No prior game gates the main menu behind an onboarding sequence; every other game either shows a menu immediately or a bare "starting hand tracking" message. `hooks/useCalibration.ts` sequences wait-for-hand → hold-palm → sweep left/right/up/down, each step needing its condition held for `HOLD_CONFIRM_MS` (500ms) with a `STEP_TIMEOUT_MS` (4s) safety net so the flow can never truly get stuck if a pose doesn't register cleanly. Functionally this doesn't feed back into the cursor mapping (already a normalized 0..1 index-fingertip position, matching every other game — no per-user calibration is actually needed), but it does verify a hand is present and responsive to real motion before handing off to the menu, so it isn't pure theater.

**A real solvability bug was caught and fixed during engine verification — worth recording in detail.** The first design for `utils/puzzleGenerator.ts` tried to *construct* guaranteed-solvable boards by starting from the solved state and applying random "reverse pours" (moving a homogeneous top run from one tube onto another with no color-matching restriction, on the theory that undoing such a move is always a legal forward pour). That reasoning was wrong: the forward pour needed to undo a reverse-pour requires the destination's *newly-exposed* top color (after removing the reverse-poured units) to match the source's top color, which isn't guaranteed once the destination had other units underneath. This was caught by a ground-truth exhaustive plain-BFS check inside the temporary verification script — the same script also using the real (buggy) generator produced a board a full brute-force search proved had zero solutions, disproving the "guaranteed by construction" claim outright. Fixed by switching to generate-then-verify: `dealRandom` deals colors uniformly at random into the level's tubes, and `generateBoard` retries with a fresh deal (up to 150 attempts) until `utils/solver.ts` confirms a solution exists — correctness now rests entirely on the solver being right, which is independently verified (see below), rather than on an unsound construction proof.

**The solver itself needed two real optimizations to make the generator fast enough to use live.** A first working version (plain BFS, no heuristic) found solutions for small boards but took 9-19 seconds on the level curve's higher tiers (colorCount 7-9, tubeCount 11-15) — unusable for on-demand level loading. Two fixes cut that to single-digit milliseconds: (1) `movesForSolver` collapses every "pour onto *some* empty tube" option from a given source down to one representative move, since which particular empty slot receives the color never affects solvability but multiplies the branching factor by the empty-tube count with zero real diversity; (2) the A*-style priority-queue search (a hand-rolled binary min-heap, since no such structure exists in the standard library) weights its heuristic (`f = moves + 3×h`, where `h` is "how many separate same-color groups exist across all tubes, summed and offset by one per color" — an undercount, so it steers greedily without ever overestimating) instead of using it unweighted, trading A*'s shortest-path guarantee for a search fast enough to actually finish. The same `solve()` function, just with a smaller `budget` parameter, serves generation-time verification; the full-budget version serves in-game hints and the `optimalMoveCount` used for star grading.

**Verified with a temporary `tsx` script** (deleted after use, same pattern as every prior game's engine verification): `levelConfig`'s color/tube-count progression matches the requested curve at levels 1, 15, 30, 60, and 200; every generated board across levels 1-200 preserves exactly 4 units per color and isn't trivially pre-solved; a representative level from every tier (1 through 80) has its solver-found solution replayed move-by-move and confirmed to end in a solved state; pour legality/capacity rules (mismatched tops rejected, matching tops and empty destinations accepted, a pour moves the whole top run capped by destination space) are asserted directly; and `legalMoves` is checked to exhaustively agree with `isMoveLegal` on a sample board. 96 checks passed after the generator fix above.

**Rendering and screens:** `components/Tube.tsx` uses Framer Motion's `layout`/`AnimatePresence` on each liquid unit so pours read as a smooth drain/fill purely from the unit array changing length — no manual pour-duration bookkeeping needed for the liquid itself. `components/PourEffect.tsx` layers a separate two-phase arc-stream-then-splash-particle flourish on top (purely decorative, decoupled from state correctness), and `components/AnimatedBackground.tsx` gives every menu screen the same floating-bubble/wave backdrop via pure CSS keyframes, never a per-frame JS loop, so it can never compete with the gesture RAF loops for CPU. Screens cover Calibration, Main Menu, Level Select (paginated, since there's no scroll gesture in this game's vocabulary), Endless, Daily Challenge, Statistics, Settings (every numeric option is a stepped +/- control rather than a drag-slider, since this game has no pinch-drag gesture defined), Credits, Pause, and a confetti Win overlay. Colorblind mode overlays one plain geometric glyph per color (●■▲★◆…) rather than any emoji, sidestepping the exact unsupported-glyph rendering bug this catalog already hit once (Zoo Architect, ADR-047).

**Files added:** `games/liquid-puzzle/` — full Vite+Tailwind+Framer Motion project (`types.ts`; `utils/{helpers,colors,puzzleGenerator,solver,scoring}.ts`; `systems/{puzzleRules,gestureEngine,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useCalibration,useTubeInteraction,useActionGestures,useGameSession}.ts`; `components/{Tube,PourEffect,GameBoard,Cursor,HUD,DwellButton,AnimatedBackground,MainMenu,LevelSelect,StatisticsScreen,SettingsScreen,CreditsScreen,CalibrationScreen,CameraGate,PauseMenu,WinOverlay,GameScreen}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/liquid-puzzle/` — built via `npm run build:games liquid-puzzle`. `src/games/registry.ts` — added `liquid-puzzle` entry. `supabase/seed_liquid_puzzle.sql` — upsert-safe game row (Puzzle category, published, not featured, age_group `6-12`, difficulty `medium`).

**Caveat:** no camera in this build environment — the two new pose classifiers (thumbs-up, victory sign) and the fist-hold tube interaction are reasoned-through geometric heuristics, not tuned against a live hand, the sharpest-risk item in this build given they're entirely new poses this catalog hasn't used before (unlike fist/open-palm, proven across ~20 prior games). Verified in a headless Playwright check with a fake camera device: the calibration flow correctly falls through its timeout safety net to the Main Menu with zero console errors, and a standalone render of `Tube.tsx` in isolation (bypassing the gesture requirement) confirmed the glass/liquid styling, selection glow, hint highlighting, hold-progress ring, and colorblind symbols all render correctly. Full gesture-driven gameplay (grabbing and pouring tubes live) is unverified against real hand input, the same standing caveat as every gesture game in this catalog. The puzzle/solver engine itself is deterministically verified (above); `typecheck` and `build` both pass clean.

**Bugfix (2026-07-08) — holding a fist never grabbed a tube.** User-reported, on the first real live-camera play of this game: hovering a tube and closing a fist did nothing at all, not even the hold-progress ring appearing. Root cause: `mediaPipe/handTrackingCore.ts` tracked the cursor from the index fingertip (`lm[8]`), the same convention every other game in this catalog uses — but every other game's held-fist gesture (archery's draw, darts' throw charge, mini-golf's charge) only needs *power* to accumulate while aiming continues wherever the hand ends up; none of them require the cursor to stay locked over a specific discrete UI element while the hand changes shape. Liquid Puzzle's tube grab is the first gesture in this catalog that does: the index fingertip physically folds back toward the palm the instant the fingers curl into a fist, so `hooks/useTubeInteraction.ts`'s per-frame hit-test against the tube's `getBoundingClientRect()` immediately lost the tube the moment a fist was made — hovering worked perfectly, but the act of grabbing itself yanked the tracked point away from the target before the hold timer could ever accumulate. Fixed by switching the cursor anchor to the palm center (`classifyHand`'s existing `palmX`/`palmY`, averaged from the wrist and the four MCP knuckles) instead of the index fingertip — the palm's knuckle structure barely moves between an open hand and a closed fist, so the tracked cursor position stays put under whatever it was hovering right through the grab. `typecheck`/`build:games` both pass clean; redeployed to `public/games/liquid-puzzle/`. This is worth flagging as a design lesson for any future gesture requiring "hold position while changing hand shape": anchor the cursor to the most rigid part of the hand (palm/wrist), not the part whose whole job is to move.

**Redesign (2026-07-08) — fist-hold-twice replaced with pinch-and-drag.** User-requested, immediately after the bugfix above: rather than hover-hold-fist-500ms on a source tube, then hover-hold-fist-500ms again on a destination, grab and pour should work like actually tipping a bottle — pinch to grab, drag while still pinching onto another tube to pour into it, release to let go. This is a genuinely different interaction shape (continuous drag rather than two discrete dwell confirmations), not just a threshold tweak, so `hooks/useTubeInteraction.ts` was rewritten around it: a pinch-down while hovering a tube sets `grabbedRef`; each subsequent frame, if the pinch is still held and the hover target is a *different* tube than both the grabbed source and the last-poured-into target, `onPour` fires once (guarded by `lastPourTargetRef` so lingering over the same destination doesn't repeat the pour every frame, but drifting off and back — or onto a third tube — fires a fresh one, matching how you'd naturally redirect a bottle you're still holding); releasing the pinch anywhere clears the grab. `mediaPipe/handTrackingCore.ts` gained the `isPinching` classifier (thumb-to-index distance with the same on/off hysteresis gap `gesture-sudoku`'s pinch detection already established in this catalog, now reading its threshold from a live `pinchSensitivityRef` each frame — driven by the existing Gesture Sensitivity setting — rather than a value captured once at tracking start, so the setting takes effect without restarting the camera) and dropped the now-unused fist/`FIST_ON` classification entirely, since nothing in this game needs it anymore. `components/Tube.tsx` swapped its hold-progress ring (no longer meaningful — there's no hold timer left) for a tilt-and-lift transform while grabbed, reading as a tube being physically picked up. `typecheck`/`build:games` both pass clean; a standalone `Tube.tsx` render confirmed the grabbed tilt renders correctly; redeployed to `public/games/liquid-puzzle/`.

---

## ADR-058 — Gesture Tower Defense (23rd game, pinch-and-drop tower placement against procedural enemy waves)
**Date:** 2026-07-08
**Status:** Accepted

**Decision:** Add Gesture Tower Defense to `games/gesture-tower-defense/`, built to `public/games/gesture-tower-defense/`. User-picked from a 3-option shortlist (Trivia Arena, Platform Jumper, Tower Defense) as the next new genre for this catalog — the first strategy/placement game, and the first to use a real pinch-and-drop mechanic for *placing objects onto a field* rather than a puzzle-piece pick-up (contrast Liquid Puzzle's pour-by-dragging-a-container). Scaffolded from `games/zoo-architect/` rather than any of this session's other recent games, specifically because Zoo Architect's `usePinchDrag.ts` already solves exactly this shape of interaction — grab a palette tile, drop it onto a placement zone — including the `PINCH_CONFIRM_MS` (100ms) debounce that stops a single noisy frame of raw `isPinching` from registering as a real grab, a fix this catalog had already found necessary once (Gesture Love Balls' pinch-to-draw) before Zoo Architect generalized it.

**The cursor-anchor lesson from [[ADR-057]]'s bugfix was applied proactively here, before any live-camera testing could surface the same bug.** Zoo Architect's own `handTrackingCore.ts` (and every other game using `usePinchDrag`) tracks the cursor from the index fingertip, which moves somewhat as the fingers close into a pinch — a smaller version of the exact problem that broke Liquid Puzzle's fist-based tube grab. Rather than wait to hit it, `mediaPipe/handTrackingCore.ts` was written from the start to track the palm center (wrist + MCP knuckles) instead, which barely moves across any hand shape. This is the first game in this catalog to apply that lesson pre-emptively rather than as a post-launch fix.

**The combat simulation is one pure per-tick function, matching this catalog's established engine convention, extended with a discrete event log.** `systems/combatEngine.ts`'s `tickBattle(state, dtMs, slotPositions, preparedPath, enemyDefs)` spawns due enemies, advances everyone along the path (arc-length-parametrized via `systems/pathing.ts`'s `preparePath`/`pointAtProgress` so movement speed is visually constant regardless of a hand-authored path's uneven segment lengths), lets towers acquire the furthest-along in-range enemy and fire, advances projectiles, and resolves hits/kills/base damage — all in one function, like Gesture Mini-Golf's `stepBall`. New for this game: it also returns a parallel `events` array (`shot`/`kill`/`baseHit`/`waveCleared`) alongside the next state, so the UI layer can trigger the right sound effect and lifetime-stat update for exactly what happened this tick without diffing two states to infer it — a cleaner pattern than this catalog's earlier engines used, worth carrying forward.

**A real economy, not just a damage race.** `placeTower`/`sellTower`/`moveTower` are pure functions guarding slot occupancy and affordability; selling refunds 60% of a tower's cost (`SELL_REFUND_FRACTION`) so placing and immediately re-selling isn't free optimization, while relocating an already-placed tower to a different empty slot (dragging it, not selling it) is free, since that's just repositioning rather than re-buying. Three tower types create real trade-offs: Blaster (cheap, fast, single-target), Cannon (expensive, slow, splash radius), and Frost (low damage, slows enemies for a duration) — the frost slow (`speedFactor`/`slowUntilMs` on `Enemy`) is applied and expires purely by comparing `simTimeMs` against a stored timestamp, no separate timer bookkeeping needed.

**A genuine bug was caught in the engine-verification script itself, not the engine — worth recording as a reminder that test code needs the same scrutiny as production code.** Three of the temporary verification script's checks initially failed: two used `while (state.enemies.length > 0 ...)` as a loop-entry condition, but `enemies.length` is 0 immediately after `startWave` (a spawn is merely *scheduled* until the first tick processes it), so the loop bodies never executed at all — a bounded `for` loop keyed on `state.waveActive` fixed both. The third reused a single `mulberry32` generator instance across two `generateWave` calls to test determinism, which meant the second call started from whatever internal state the first call had already advanced to, rather than from a fresh identical seed — giving two different results and looking exactly like a non-determinism bug in `generateWave` when the real issue was the test reusing an already-consumed RNG. All three were diagnosed by writing an isolated one-off debug script per failure rather than assuming the engine was wrong; the engine itself needed zero changes.

**Verified with a temporary `tsx` script** (deleted after use, same pattern as every prior game's engine verification): arc-length parametrization places progress 0/1 at the path's start/end and splits proportionally by segment length; placing a tower deducts its cost and rejects an occupied slot or insufficient funds; selling refunds the documented 60% and removes the tower; a wave's enemy spawns on schedule, damages the base exactly once on reaching the end (no double-counting), and clearing the only wave sets `won`; a placed Cannon kills a grunt before it reaches the base and pays out its reward; a Frost tower measurably reduces an enemy's progress-per-tick relative to no tower at all (isolated via progress-after-fixed-ticks rather than ticks-to-clear-the-wave, since the frost tower's own damage can also kill the enemy mid-path and end the run early, confounding that metric); and wave generation produces more enemies at higher wave numbers and is fully reproducible from the same seed. 20 checks passed after fixing the three test-script bugs above.

**Modes:** Campaign (15 levels cycling through 3 hand-authored maps — Riverbend, Switchback, Spiral Approach — with waves-per-level growing every 2 levels, star-graded on remaining base-health fraction at victory, unlocking one level at a time), Endless (a single map with an effectively unbounded wave count, tracking the highest wave ever reached), and Daily Challenge (a fixed 8-wave run on the first map, wave composition seeded by `mulberry32(dailySeed())` so every player faces identical waves that day — the player's own tower placement and pinch timing are never seeded, matching every other Daily mode's convention that only the deterministic *content* is shared, not the human input).

**Files added:** `games/gesture-tower-defense/` — full Vite+Tailwind+Framer Motion+Zustand project (`types/index.ts`; `utils/helpers.ts`; `data/{towers,enemies,maps}.ts`; `systems/{pathing,combatEngine,waveEngine,campaign}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{usePinchDrag,useDwellProgress}.ts`; `stores/{settingsStore,gameStore}.ts`; `audio/sound.ts`; `components/common/{HoverButton,ProgressRing,GestureCursorDot,HandLostOverlay,CameraFeed,GestureSlider}.tsx`; `components/menu/{MainMenu,MapSelect,StatisticsScreen,SettingsScreen,CreditsScreen,CalibrationScreen}.tsx`; `components/game/{Battlefield,BuildTray,HUD,GameScreen}.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-tower-defense/` — built via `npm run build:games gesture-tower-defense`. `src/games/registry.ts` — added `gesture-tower-defense` entry. `supabase/seed_gesture_tower_defense.sql` — upsert-safe game row (Strategy category, published, not featured, age_group `8-14`, difficulty `medium`).

**Caveat:** no camera in this build environment — the pinch trigger/release distances and the proactive palm-center cursor fix are reasoned-through, not tuned against a live hand, the same standing caveat as every gesture game in this catalog (though meaningfully lower-risk here than a from-scratch gesture, since both the pinch classifier and the cursor-anchor choice are directly reused/adapted from proven prior art rather than invented fresh). Verified in a headless Playwright check with a fake camera device: the calibration flow correctly falls through to the Main Menu with zero console errors (the expected "Hand Lost" overlay also correctly appears, since no real hand is ever detected by the fake device); a standalone render of `Battlefield`/`BuildTray` confirmed the path, towers, range rings, enemy HP bars/slow-tint, and projectiles all render correctly, and separately confirmed the economy guard (a third tower correctly failed to place when the test script under-funded it). Full pinch-drag gameplay is unverified against real hand input. The combat/wave engine itself is deterministically verified (above); `typecheck` and `build` both pass clean.

---

## ADR-059 — Gesture Trivia Arena (24th game, open-domain quiz duel needing zero new gesture code)

**Date:** 2026-07-08
**Status:** Accepted

**Decision:** Add Gesture Trivia Arena to `games/gesture-trivia-arena/`, built to `public/games/gesture-trivia-arena/`. User-picked from a 3-option shortlist (Trivia Arena, Platform Jumper, Card Duel) specifically as the lowest-risk, fastest-to-build option — a multiple-choice quiz only ever needs hover-dwell selection, which every menu on this platform already implements, so this is the first game in the catalog that genuinely requires no new gesture classifier of any kind. Scaffolded from `games/gesture-darts/` for its turn-based CPU-opponent match structure (`matchEngine.ts`'s single pure state-transition function, `aiOpponent.ts`'s difficulty-scaled-only AI, the Daily-toggle-alongside-mode-and-difficulty menu pattern) rather than any of its dart-throwing specifics, all of which were deleted.

**`mediaPipe/handTrackingCore.ts` was stripped down further than any prior game's** — no fist, palm, pinch, or two-hands classifier at all, just index-fingertip position and a hand-detected boolean, since hover-dwell is the *only* interaction this game ever needs and the hand shape never has to change mid-selection. This sidesteps the entire class of bug ADR-057 hit and fixed (a gesture requiring the hand to change shape while staying over a fixed target) by construction — there's no pose change here for the cursor to be disrupted by, so tracking the raw fingertip position is safe, unlike it would have been for a fist- or pinch-based interaction.

**The quiz/match engine follows this catalog's usual pure-function convention, with the question sequence and CPU outcomes decided up front rather than simulated turn-by-turn.** `systems/matchEngine.ts`'s `createMatch` draws all 9 rounds' questions in one seeded shuffle (`systems/quizEngine.ts`) and precomputes the first round's CPU outcome (`systems/aiOpponent.ts`'s `simulateCpuAnswer`, difficulty scaling only `accuracy` and `thinkMs` — never the rules, the same principle Gesture Darts' AI follows); `submitPlayerAnswer`/`submitTimeout` score the round and reveal both results, `advanceRound` moves to the next question and precomputes *its* CPU outcome. Because CPU outcomes are decided by a fixed, input-independent sequence of rng calls (one per round, always in the same order regardless of how long the player takes), Daily Challenge mode gets full determinism for free: the same date-seed produces the same 9 questions *and* the same CPU performance for every player, without needing to seed anything at the moment of "reveal."

**A genuine indexing bug was caught by the TypeScript compiler during the first typecheck pass, not by manual review.** `App.tsx`'s post-match stats recording originally did `match.history.filter(h => h.playerCorrect).map((h, i) => match.questions[i].category)` — using `i`, the index *within the filtered array*, to look back into the *original, unfiltered* `match.questions` array. Once a single wrong answer occurred anywhere before the last correct one, every subsequent category attributed to `correctByCategory` would be off by however many wrong answers preceded it. `tsc` flagged the parameter as unused-and-untyped (a symptom of an unrelated import-path error elsewhere cascading through the file), and looking at *why* it was unused surfaced the indexing bug underneath. Fixed by looking up each correct answer's category from its `questionId` via `data/questions.ts`'s `questionById`, which needs no index arithmetic at all. Worth flagging as a general lesson: a compiler warning that looks like simple unused-variable noise is worth reading the surrounding logic for, since the fix for the "real" error can sometimes uncover an entirely separate bug in the same expression.

**Verified with a temporary `tsx` script** (deleted after use, same pattern as every prior game's engine verification): the 90-question bank has unique ids and every question has exactly 4 options with a valid `correctIndex`; `pickQuestions` is deterministic for a given seed, returns the requested count with no repeats, and respects a category filter; `simulateCpuAnswer`'s observed correctness rate over 2000 trials lands within 5 percentage points of its configured accuracy, and its answer time stays within the configured think-time-plus-jitter window; a full match plays through all 9 rounds to a `winner` that's independently re-derived from the final scores and matches; a Blitz-mode timeout scores zero and records a null answer time; and two matches created from the identical seed produce byte-identical question sequences *and* identical first-round CPU outcomes (the Daily-determinism guarantee). 28 checks passed.

**Modes:** Classic (untimed per question, though answering faster still earns a tapering speed bonus) and Blitz (an 8-second visible countdown per question; timing out counts as wrong) — both combined with a Daily Challenge toggle exactly like Gesture Darts' menu, rather than being separate top-level modes.

**Files added:** `games/gesture-trivia-arena/` — full Vite+Tailwind project (`types.ts`; `data/questions.ts`; `utils/helpers.ts`; `systems/{quizEngine,aiOpponent,matchEngine,audio,save}.ts`; `mediaPipe/{handTrackingCore,GestureProvider}.tsx`; `hooks/{useGesture,useDwellButton,useMatch}.ts`; `components/AnswerTile.tsx`; `App.tsx`, `main.tsx`, `index.css`). `public/games/gesture-trivia-arena/` — built via `npm run build:games gesture-trivia-arena`. `src/games/registry.ts` — added `gesture-trivia-arena` entry. `supabase/seed_gesture_trivia_arena.sql` — upsert-safe game row (Puzzle category, published, not featured, age_group `6-14`, difficulty `easy`).

**Caveat:** no camera in this build environment — but this is the lowest-risk gesture surface built so far (plain fingertip tracking, no pose classifier of any kind to get wrong), so the usual "reasoned, not tuned" caveat applies with less force than for any prior game. Verified in a headless Playwright check with a fake camera device: the Main Menu renders correctly (mode/difficulty/Daily toggle/Start Match) with zero console errors; a standalone render of the question screen (`AnswerTile` in its correct/wrong/unselected/idle states, alongside the HUD and reveal row) confirmed all visual states render as intended. Actually progressing past the menu via hover-dwell requires a real tracked hand, so full match play is unverified against live input — the quiz/match engine itself is deterministically verified (above); `typecheck` and `build` both pass clean.
