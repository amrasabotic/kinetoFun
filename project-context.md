# KinetoFun — Project Context

> **SINGLE SOURCE OF TRUTH.** Read this before making any change. Update it after every feature completion.
> Last updated: 2026-06-08 (Phase 1 frontend complete)

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
- **Backend:** Supabase (PostgreSQL) — *not yet integrated*
- **Auth:** JWT-based — *not yet integrated*
- **Input (current):** Keyboard / mouse
- **Input (future):** Raspberry Pi + camera + MediaPipe hand tracking
- **Runtime:** Node v24.16.0
- **VCS:** Git initialized — `main` (stable, tracking files only) and `dev` (active, scaffold). Currently on `dev`.

> Phase 1 frontend is complete: a full TV-style gaming portal UI driven entirely by mock data. `npm run build` passes; all routes return 200.

---

## Completed Features

- **[2026-06-08] Project foundation / scaffold.** `create-next-app@latest` (App Router, TS, Tailwind v4, ESLint, `src/`, `@/*`). Git initialized with `main`/`dev` branches; tracking files committed on `main`, scaffold on `dev`. Production build verified (`npm run build`).
- **[2026-06-08] Phase 1 — Frontend (TV portal UI).** Full mock-data UI: 9 pages, shared component library, mock session/auth, spatial (arrow-key/remote) navigation, service boundary layer. See **Frontend Architecture** below. Build + route smoke tests pass.

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
      login/page.tsx        # mock login
      signup/page.tsx       # mock signup
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
    auth/     session-context.tsx       # SessionProvider + useSession (mock)
  services/   games | leaderboard | profile | auth (.service.ts) + index.ts
              # the BACKEND BOUNDARY — returns mock data today, becomes API in Phase 2
  mock/       games.ts, users.ts, scores.ts, sessions.ts, index.ts
  types/      index.ts                  # Game, User, Score, Session, LeaderboardEntry
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

### State management (mock, in-memory)
- **`SessionProvider` (`features/auth/session-context.tsx`)** — React Context. **Starts logged-out** (so a fresh visitor sees the animated hero landing); persists to `localStorage` (`kinetofun.session`) and restores a returning user on mount. Exposes `user`, `isAuthenticated`, `login`, `signup`, `logout`. No real auth. The `/login` form pre-fills the demo email for one-click sign-in.
- Page-local `useState` for search/filter/toggles. No global store needed yet.

### Mock data structure (`src/mock/`)
- **`games.ts`** — `Game[]` (10 games). Covers are Tailwind gradient strings (no art). Fields: id, title, tagline, description, category, players (`single|multi|both`), min/maxPlayers, cover, accent, rating, releaseYear, durationMinutes, featured.
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

- No Supabase integration (all data is in-memory mock; see `src/mock`).
- No real authentication — login/signup are **UI + mock session only** (no password check, no token; session persists in `localStorage`).
- No real score persistence — scores/sessions are static mock data.
- No real game SDK or runtime — `/games/[id]/play` is a placeholder screen.
- No multiplayer session handling (sessions are display-only mock records).
- No Raspberry Pi / camera / MediaPipe gesture input. (Spatial-navigation primitive exists and is the seam the gesture layer will plug into.)
- No paywall / purchasing.

### Phase 1 → Phase 2 handoff notes
- Swap `src/services/*.service.ts` internals for Supabase/API calls (signatures may become `async`); UI should not need changes.
- Replace `authService` + `SessionProvider` mock with real JWT auth.
- `src/types` are the contract Supabase tables/queries should map onto.
