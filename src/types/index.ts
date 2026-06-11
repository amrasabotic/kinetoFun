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

/** Publication lifecycle. Only `published` games are shown to normal users. */
export type GameStatus = "draft" | "published" | "archived";

export type GameDifficulty = "easy" | "medium" | "hard";

/** Target age band. Stored as free text but constrained in the admin UI. */
export type GameAgeGroup = "3-5" | "6-8" | "9-12" | "13+";

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
  // ── SuperAdmin platform fields (migration 0004) ─────────────────────────────
  /** FK to the managed `categories` table (the enum `category` is kept in sync). */
  categoryId?: string;
  /** Publication state. Defaults to "published" for legacy rows. */
  status?: GameStatus;
  difficulty?: GameDifficulty;
  ageGroup?: GameAgeGroup;
  shortDescription?: string;
  /** Storage URL for a small admin/list thumbnail (distinct from coverImage). */
  thumbnail?: string;
  /** Total play sessions; surfaced in analytics + sorting. */
  playCount?: number;
  /** Row creation timestamp (admin views only). */
  createdAt?: string;
}

/** A managed category in the SuperAdmin taxonomy (`categories` table). */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** lucide-react icon name (e.g. "Gamepad2"). */
  icon: string;
  /** Optional Storage image URL. */
  image?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  /** Number of games linked to this category (populated by the repository). */
  gamesCount?: number;
}

/** A recorded SuperAdmin action (`audit_logs` table). */
export interface AuditLog {
  id: string;
  adminId: string | null;
  adminName: string;
  /** Dotted action key, e.g. "category.created", "game.published". */
  action: string;
  entityType: "category" | "game" | "user";
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string; // ISO date
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
