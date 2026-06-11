// Core domain types for KinetoFun.
// These are intentionally backend-agnostic so Phase 2 (Supabase) can map
// directly onto them without touching the UI layer.

export type GamePlayers = "single" | "multi" | "both";

export type GameCategory =
  | "Action"
  | "Puzzle"
  | "Sports"
  | "Arcade"
  | "Adventure"
  | "Party";

export interface Game {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: GameCategory;
  players: GamePlayers;
  minPlayers: number;
  maxPlayers: number;
  /** Tailwind gradient classes — used as fallback when coverImage is absent. */
  cover: string;
  /** Supabase Storage URL for the real cover image (optional; gradient used when absent). */
  coverImage?: string;
  /** Accent color token used for detail/launch screens. */
  accent: string;
  rating: number; // 0 - 5
  releaseYear: number;
  durationMinutes: number;
  featured?: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  /** Tailwind classes for the avatar placeholder background. */
  avatarColor: string;
  level: number;
  xp: number;
  joinedAt: string; // ISO date
  bio?: string;
  /** Access role. Optional on the UI type (mock users omit it). */
  role?: "user" | "admin" | "superadmin";
}

export interface Score {
  id: string;
  gameId: string;
  userId: string;
  score: number;
  achievedAt: string; // ISO date
}

export interface Session {
  id: string;
  userId: string;
  gameId: string;
  startedAt: string; // ISO date
  endedAt?: string; // ISO date
  status: "active" | "ended";
  players: string[]; // user ids
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  gameId: string;
}
