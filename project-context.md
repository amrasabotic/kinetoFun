# KinetoFun — Project Context

> **SINGLE SOURCE OF TRUTH.** Read this before making any change. Update it after every feature completion.
> Last updated: 2026-06-10 (Scores + game-sessions persistence — ADR-017/018)

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
- **Auth:** **Custom JWT auth — implemented.** scrypt-hashed passwords, HS256 JWT (via `jose`) in an httpOnly cookie, `proxy.ts` route protection, server-side DAL. See ADR-013.
- **⚠️ Next.js 16 conventions (this is a customized v16):** `middleware.ts` → **`proxy.ts`** (function `proxy`, Node.js runtime only); `cookies()`/`params`/`searchParams` are **async**; Turbopack is the default. Always read `node_modules/next/dist/docs/` before writing framework code (per AGENTS.md).
- **Input (current):** Keyboard / mouse
- **Input (future):** Raspberry Pi + camera + MediaPipe hand tracking
- **Runtime:** Node v24.16.0
- **VCS:** Git initialized — `main` (stable, tracking files only) and `dev` (active, scaffold). Currently on `dev`.

> Phase 1 frontend is complete: a full TV-style gaming portal UI driven entirely by mock data. `npm run build` passes; all routes return 200.

---

## Completed Features

- **[2026-06-08] Project foundation / scaffold.** `create-next-app@latest` (App Router, TS, Tailwind v4, ESLint, `src/`, `@/*`). Git initialized with `main`/`dev` branches; tracking files committed on `main`, scaffold on `dev`. Production build verified (`npm run build`).
- **[2026-06-08] Phase 1 — Frontend (TV portal UI).** Full mock-data UI: 9 pages, shared component library, mock session/auth, spatial (arrow-key/remote) navigation, service boundary layer. See **Frontend Architecture** below. Build + route smoke tests pass.
- **[2026-06-08] Futuristic SaaS visual re-skin.** Re-skinned the UI (design language only — no content/layout/flow changes): deep-navy canvas, **neon-green** primary accent (was violet), purple/pink ambient glow, full-page grid + radial-glow backdrop, glassmorphism panels, green/glow buttons. Driven mostly by swapping `@theme` tokens in `globals.css`. (ADR-010)
- **[2026-06-09] Homepage redesign — colorful/playful landing page.** Replaced the logged-out `/` landing page (`LandingPage` in `(app)/page.tsx`) with a full 9-section multi-section page: Hero, How It Works, Featured Games, Multiplayer, Why Kids Love It, Educational Benefits, Perfect For, Leaderboard Preview, Final CTA. Palette: `#6D5DFC` / `#00D4FF` / `#FFB800` / `#32D583`, light (#FAFBFF) and dark (#0d0e1a) alternating sections. Animations added to `globals.css` (float keyframes). Authenticated dashboard unchanged. (ADR-011)
- **[2026-06-10] Games served from Supabase.** Wired the games catalog to the live DB: `lib/data/games-repository.ts` (server, Supabase client) → `/api/games` + `/api/games/[id]` (public) → `useGames()` client hook (module-cached) + pure selectors in `games.service`. Refactored all 5 consumers (library, home landing + dashboard, leaderboard, game detail, launch) off the old sync `gamesService`/mock. Seeded 10 games (`supabase/seed_games.sql`). Build clean; verified `/api/games` returns the 10 rows from Supabase. (ADR-015)
- **[2026-06-10] Game cover images (Supabase Storage).** Optional `Game.coverImage` (maps to `cover_image` column); 4 cover sites render `next/image` when set, gradient fallback otherwise; `next.config` remote patterns; bucket `game-covers` created. Activate by uploading images + UPDATE SQL. (ADR-016)
- **[2026-06-10] Score persistence — real leaderboards + profile stats.** `scores-repository.ts` → `/api/scores` (write, auth), `/api/leaderboard` (public, global or per-game), `/api/profile/stats` (auth); `useLeaderboard`/`useProfileStats` hooks; leaderboard + profile pages off mock; manual score entry on the launch screen. (ADR-017)
- **[2026-06-10] Game-session persistence — "Continue playing".** `sessions-repository.ts` → `/api/sessions` (start), `/api/sessions/[id]` (end), `/api/sessions/recent`; session opened on launch + ended on save with a **clock-skew-safe `ended_at`**; `useContinuePlaying` (module-cached + invalidation). Dashboard is now fully off `@/mock`. (ADR-018)
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
    api/auth/               # custom auth API (Route Handlers)
      register/route.ts     # POST — create account + start session
      login/route.ts        # POST — verify credentials + start session
      logout/route.ts       # POST — clear session cookie
      me/route.ts           # GET  — validate token, return current user
    api/games/              # public games catalog API
      route.ts              # GET  — all games (from Supabase)
      [id]/route.ts         # GET  — one game by id
    api/leaderboard/route.ts # GET  — global or ?gameId= board (public)
    api/scores/route.ts     # POST — submit a score (auth)
    api/profile/stats/route.ts # GET — current user's stats (auth)
    api/sessions/           # play-session lifecycle
      route.ts              # POST — start a session (auth)
      [id]/route.ts         # PATCH — end a session (auth)
      recent/route.ts       # GET  — recent game ids (auth)
  proxy.ts                  # Next 16 route protection (was middleware.ts)
  components/
    layout/   TopBar.tsx, Clock.tsx
    navigation/ SpatialNavigation.tsx   # global arrow-key focus movement
    game/     GameCard.tsx, GameRail.tsx
    leaderboard/ LeaderboardTable.tsx
    profile/  ScoreList.tsx
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
  lib/auth/   config, password (scrypt), jwt (jose/HS256), session (cookies),
              validation (zod), dal (getCurrentUser/requireUser), serialize,
              repository (+ repositories/supabase-user-repository [uses Supabase
              client], local-user-repository [dev fallback])
              # SERVER-ONLY. Never import from a Client Component.
  lib/data/   games-repository.ts       # SERVER-ONLY games reads (Supabase) → Game
              scores-repository.ts      # SERVER-ONLY leaderboards + profile stats + submitScore
              sessions-repository.ts    # SERVER-ONLY create/end/listRecent game_sessions
  lib/supabase/ server.ts  # getSupabaseAdmin() — service-role client, DATABASE ONLY
  mock/       games.ts, users.ts, scores.ts, sessions.ts, index.ts
  types/      index.ts                  # Game, User, Score, Session, LeaderboardEntry
              auth.ts                   # AuthUser, UserRecord, JwtPayload, request/response DTOs
  lib/        utils.ts (cn), format.ts  # score/date/players formatters
```

### Pages (routes)
| Route | File | Purpose |
|---|---|---|
| `/` | `(app)/page.tsx` | **Logged out:** animated "KinetoFun / Play with a wave" Pong hero (`AnimatedHero`) + sign-in CTA. **Logged in:** dashboard — hero spotlight, "Continue playing", featured + per-category rails. |
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

- **Auth is real and working AND wired to live Supabase** (✅ — register/login/logout/me, JWT cookie, hashing, route protection; users persist to Supabase Postgres, verified end-to-end). Email/password only (no OAuth/social, no email verification, no password reset, no refresh-token rotation yet).
- **Supabase data layer is live** (✅ — `@supabase/supabase-js`, service-role, no Supabase Auth). Schema for `users/games/scores/game_sessions` (+ optional `session_players`, `auth_sessions`, `subscriptions`, `game_leaderboards` view) is applied. **`users`, `games`, `scores`, and `game_sessions` are all wired to the DB.**
- **Games are served from Supabase** (✅ — seeded with 10 games via `supabase/seed_games.sql`). Read path: `useGames()` → `/api/games` → `@/lib/data/games-repository` → Supabase.
- **Scores + leaderboards + profile stats are live** (✅ — ADR-017). Write via `POST /api/scores` (auth) from the launch screen; read via `useLeaderboard` → `/api/leaderboard` (public) and `useProfileStats` → `/api/profile/stats` (auth). `leaderboardService`/`profileService` mock files remain on disk but are no longer imported by pages.
- **Game sessions are live** (✅ — ADR-018). "Continue playing" rail + profile activity read real `game_sessions`; session opened on launch (`POST /api/sessions`), ended on save (`PATCH /api/sessions/[id]`); `useContinuePlaying` → `/api/sessions/recent`. The dashboard no longer imports `@/mock`.
- **Game cover images (✅ — infrastructure done, ADR-016):** Storage bucket `game-covers` created; `Game.coverImage` optional (maps to `cover_image` column); all 4 cover sites use `next/image` when set, gradient fallback otherwise. Next step: upload images + run the UPDATE SQL.
- No real game SDK or runtime — `/games/[id]/play` is a placeholder screen (score is entered manually).
- No multiplayer yet — `game_sessions.user_id` is single-player owner; `session_players` reserved for Phase 3.
- No Raspberry Pi / camera / MediaPipe gesture input. (Spatial-navigation primitive exists and is the seam the gesture layer will plug into.)
- No paywall / purchasing.

### Phase 2 handoff notes
- **To go live on Supabase:** copy `.env.example` → `.env.local`, set `JWT_SECRET` (`openssl rand -base64 32`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; run `supabase/migrations/0001_auth.sql`. No code change — `getUserRepository()` auto-selects the Supabase repo when those env vars are present.
- **Next features build on this without restructuring:** add `game_sessions`/`scores`/`subscriptions` tables + repositories alongside `users`; read identity from `getCurrentUser()` (DAL) in new Route Handlers; `JwtPayload.sub` is the stable user id for leaderboards/multiplayer.
- Remaining game/profile/leaderboard `*.service.ts` modules still return mock data — swap their internals for Supabase/API calls (signatures may become `async`); UI should not need changes.
- `src/types/auth.ts` is the contract the `users`/`sessions` tables map onto; `src/types/index.ts` is the contract for the rest.
