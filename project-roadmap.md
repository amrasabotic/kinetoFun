# KinetoFun — Roadmap

> Tracks execution progress. Update whenever a task changes state.
> Last updated: 2026-06-08

---

## Backlog

### Phase 1 — Frontend First (NO HARDWARE)
- [ ] Scaffold Next.js + React project
- [ ] TV interface shell / layout
- [ ] Game browser (grid of games, mocked data)
- [ ] Navigation system (focus-based, keyboard/remote friendly)
- [ ] User profiles (mocked backend)
- [ ] Score display (mocked backend)

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

_None yet._

---

## Blockers

- **[2026-06-08] Node version too old for scaffolding.** Installed Node is v16.14.2 (EOL); Next.js 15 (`create-next-app@latest`) requires Node ≥ 18.18 (recommend Node 20 or 22 LTS). Phase 1 scaffolding is blocked until Node is upgraded, OR we pin an older Next.js version compatible with Node 16 (not recommended).

---

## Future Ideas

- Paywall / purchasing system
