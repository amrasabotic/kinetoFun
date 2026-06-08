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

- **Frontend:** Next.js + React (web-first, TV-oriented UI)
- **Backend:** Supabase (PostgreSQL) — *not yet integrated*
- **Auth:** JWT-based — *not yet integrated*
- **Input (current):** Keyboard / mouse
- **Input (future):** Raspberry Pi + camera + MediaPipe hand tracking

> Nothing is scaffolded yet. The repository currently contains only the tracking files.

---

## Completed Features

_None yet._

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

---

## System Boundaries (NOT built yet)

- No Supabase integration
- No authentication
- No score persistence
- No real game SDK or game lifecycle
- No multiplayer session handling
- No Raspberry Pi / camera / MediaPipe gesture input
- No paywall / purchasing
