import type { Score } from "@/types";

// Flat list of high-score records. Leaderboards are derived from these in
// the leaderboard service.
export const scores: Score[] = [
  // Neon Drift
  { id: "s-001", gameId: "neon-drift", userId: "u-nova", score: 184500, achievedAt: "2026-06-06T20:14:00.000Z" },
  { id: "s-002", gameId: "neon-drift", userId: "u-amra", score: 171200, achievedAt: "2026-06-07T19:02:00.000Z" },
  { id: "s-003", gameId: "neon-drift", userId: "u-zed", score: 168900, achievedAt: "2026-06-05T18:40:00.000Z" },
  { id: "s-004", gameId: "neon-drift", userId: "u-kai", score: 142300, achievedAt: "2026-06-04T21:10:00.000Z" },
  { id: "s-005", gameId: "neon-drift", userId: "u-lux", score: 133800, achievedAt: "2026-06-03T17:55:00.000Z" },

  // Block Cascade
  { id: "s-010", gameId: "block-cascade", userId: "u-lux", score: 98750, achievedAt: "2026-06-07T08:21:00.000Z" },
  { id: "s-011", gameId: "block-cascade", userId: "u-amra", score: 91200, achievedAt: "2026-06-06T22:05:00.000Z" },
  { id: "s-012", gameId: "block-cascade", userId: "u-nova", score: 89400, achievedAt: "2026-06-02T11:30:00.000Z" },
  { id: "s-013", gameId: "block-cascade", userId: "u-rex", score: 60100, achievedAt: "2026-05-30T14:12:00.000Z" },

  // Galaxy Strikers
  { id: "s-020", gameId: "galaxy-strikers", userId: "u-zed", score: 76500, achievedAt: "2026-06-07T23:48:00.000Z" },
  { id: "s-021", gameId: "galaxy-strikers", userId: "u-nova", score: 74100, achievedAt: "2026-06-06T23:10:00.000Z" },
  { id: "s-022", gameId: "galaxy-strikers", userId: "u-amra", score: 69850, achievedAt: "2026-06-05T20:33:00.000Z" },
  { id: "s-023", gameId: "galaxy-strikers", userId: "u-kai", score: 51200, achievedAt: "2026-06-01T19:00:00.000Z" },

  // Court Kings
  { id: "s-030", gameId: "court-kings", userId: "u-kai", score: 58, achievedAt: "2026-06-06T16:40:00.000Z" },
  { id: "s-031", gameId: "court-kings", userId: "u-amra", score: 52, achievedAt: "2026-06-04T15:20:00.000Z" },
  { id: "s-032", gameId: "court-kings", userId: "u-rex", score: 44, achievedAt: "2026-06-02T18:05:00.000Z" },

  // Shadow Quest (completion %)
  { id: "s-040", gameId: "shadow-quest", userId: "u-amra", score: 100, achievedAt: "2026-06-07T13:15:00.000Z" },
  { id: "s-041", gameId: "shadow-quest", userId: "u-nova", score: 87, achievedAt: "2026-06-05T12:00:00.000Z" },

  // Party Panic
  { id: "s-050", gameId: "party-panic", userId: "u-rex", score: 31, achievedAt: "2026-06-07T21:30:00.000Z" },
  { id: "s-051", gameId: "party-panic", userId: "u-lux", score: 28, achievedAt: "2026-06-06T20:00:00.000Z" },
  { id: "s-052", gameId: "party-panic", userId: "u-amra", score: 24, achievedAt: "2026-06-05T19:45:00.000Z" },

  // Pixel Racer
  { id: "s-060", gameId: "pixel-racer", userId: "u-nova", score: 121400, achievedAt: "2026-06-03T10:10:00.000Z" },
  { id: "s-061", gameId: "pixel-racer", userId: "u-amra", score: 110900, achievedAt: "2026-06-02T09:50:00.000Z" },

  // Mind Maze
  { id: "s-070", gameId: "mind-maze", userId: "u-amra", score: 45600, achievedAt: "2026-06-06T07:30:00.000Z" },
  { id: "s-071", gameId: "mind-maze", userId: "u-kai", score: 41200, achievedAt: "2026-06-04T08:15:00.000Z" },

  // Aero Dunk
  { id: "s-080", gameId: "aero-dunk", userId: "u-zed", score: 64, achievedAt: "2026-06-07T22:20:00.000Z" },
  { id: "s-081", gameId: "aero-dunk", userId: "u-amra", score: 49, achievedAt: "2026-06-06T21:05:00.000Z" },

  // Rune Realms
  { id: "s-090", gameId: "rune-realms", userId: "u-lux", score: 76, achievedAt: "2026-06-05T16:00:00.000Z" },
  { id: "s-091", gameId: "rune-realms", userId: "u-amra", score: 71, achievedAt: "2026-06-04T15:30:00.000Z" },
];
