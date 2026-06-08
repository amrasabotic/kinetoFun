# KinetoFun — Project Context

> **SINGLE SOURCE OF TRUTH.** Read this before making any change. Update it after every feature completion.
> Last updated: 2026-06-08

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

> Base Next.js scaffold exists and builds successfully (`npm run build` passes). No KinetoFun-specific UI/features built yet.

---

## Completed Features

- **[2026-06-08] Project foundation / scaffold.** `create-next-app@latest` (App Router, TS, Tailwind v4, ESLint, `src/`, `@/*`). Git initialized with `main`/`dev` branches; tracking files committed on `main`, scaffold on `dev`. Production build verified (`npm run build`).

---

## In-Progress Features

_None yet._

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

- No Supabase integration
- No authentication
- No score persistence
- No real game SDK or game lifecycle
- No multiplayer session handling
- No Raspberry Pi / camera / MediaPipe gesture input
- No paywall / purchasing
