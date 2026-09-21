import type { Session } from "@/types";

// Mock play sessions. In Phase 3 these become real game lifecycle records;
// for now they only feed "Continue playing" and recent-activity UI.
export const sessions: Session[] = [
  {
    id: "sess-001",
    userId: "u-amra",
    gameId: "shadow-quest",
    startedAt: "2026-06-07T13:00:00.000Z",
    endedAt: "2026-06-07T13:45:00.000Z",
    status: "ended",
    players: ["u-amra"],
  },
  {
    id: "sess-002",
    userId: "u-amra",
    gameId: "neon-drift",
    startedAt: "2026-06-07T18:50:00.000Z",
    endedAt: "2026-06-07T19:02:00.000Z",
    status: "ended",
    players: ["u-amra", "u-nova", "u-kai"],
  },
  {
    id: "sess-003",
    userId: "u-amra",
    gameId: "rune-realms",
    startedAt: "2026-06-08T09:30:00.000Z",
    status: "active",
    players: ["u-amra", "u-lux"],
  },
];
