# KinetoFun — Roadmap

> Tracks execution progress. Update whenever a task changes state.
> Last updated: 2026-06-09

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
- [ ] Supabase PostgreSQL integration
- [ ] JWT authentication system
- [ ] Score persistence
- [ ] User sessions

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

---

## Blockers

_None active._

**Resolved:**
- ~~[2026-06-08] Node version too old (v16.14.2, EOL).~~ User upgraded to Node v24.16.0; scaffolding proceeded. Also resolved a `UNABLE_TO_VERIFY_LEAF_SIGNATURE` TLS error via `NODE_OPTIONS=--use-system-ca` (see ADR-007).

---

## Future Ideas

- Paywall / purchasing system
