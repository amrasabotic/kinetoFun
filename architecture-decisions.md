# KinetoFun — Architecture Decisions

> Permanent technical decisions. **Append-only — no decision is ever overwritten.**
> Last updated: 2026-06-08

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
