# KinetoFun — Architecture Decisions

> Permanent technical decisions. **Append-only — no decision is ever overwritten.**
> Last updated: 2026-06-10 (ADR-019 — auth hardening: rate limiting + revocable sessions)

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
