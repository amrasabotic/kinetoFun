# KinetoFun — Roadmap

> Tracks execution progress. Update whenever a task changes state.
> Last updated: 2026-06-10

---

## Backlog

### Phase 1 — Frontend First (NO HARDWARE)
- ✅ Complete — see Done.

### Phase 1.x — Frontend polish (optional, future)
- [ ] Persist display settings (large text / reduce motion) and actually apply them
- [ ] Loading/skeleton states (will matter once services become async)
- [ ] Real cover art instead of gradient placeholders
- [ ] Favorites / wishlist
- [ ] Per-rail "View all" deep links

### Phase 2 — Backend Integration
- [x] **JWT authentication system** — done (custom JWT, scrypt, httpOnly cookie, proxy, DAL, repository). See Done / ADR-013.
- [x] **Supabase PostgreSQL integration** — done & LIVE (`@supabase/supabase-js`, service-role, no Supabase Auth; `users` persisting end-to-end; full schema applied). See Done / ADR-014.
- [x] **Games catalog from Supabase** — done (`/api/games`, `useGames()`, repository; 10 games seeded). See Done / ADR-015.
- [ ] Score persistence (add `scores` repository + `/api/scores`; reuse the games pattern; swap `leaderboardService` off mock)
- [ ] Game-session persistence (`game_sessions`/`session_players`; powers "Continue playing" + multiplayer)
- [ ] User sessions / game-session tracking (add `game_sessions` table; `sessions` table already in migration for token tracking)
- [ ] Auth follow-ups: email verification, password reset, OAuth/social, refresh-token rotation, rate limiting on `/api/auth/*`

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
- [x] **[2026-06-10] Supabase data layer connected (live).** Wired the app to a live Supabase Postgres project as database-only via `@supabase/supabase-js` (service-role, server-only, no Supabase Auth); `src/lib/supabase/server.ts` client; `SupabaseUserRepository` switched to the SDK; full schema (`supabase/schema.sql`) applied; `--use-system-ca` baked into npm scripts via `cross-env` for this TLS-intercepting machine. Verified end-to-end against the real project (register/me/login/duplicate; row persisted with scrypt hash; test rows deleted). (ADR-014)

---

## Blockers

_None active._

**Resolved:**
- ~~[2026-06-08] Node version too old (v16.14.2, EOL).~~ User upgraded to Node v24.16.0; scaffolding proceeded. Also resolved a `UNABLE_TO_VERIFY_LEAF_SIGNATURE` TLS error via `NODE_OPTIONS=--use-system-ca` (see ADR-007).

---

## Future Ideas

- Paywall / purchasing system
