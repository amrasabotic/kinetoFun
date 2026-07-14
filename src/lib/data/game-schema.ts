// Shared zod schema for admin game create/update. Mirrors the `Game` type.

import { z } from "zod";
import type { Game } from "@/types";

export const gameSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "id is required")
    .regex(/^[a-z0-9-]+$/, "id must be a lowercase slug (letters, numbers, dashes)"),
  title: z.string().trim().min(1, "title is required"),
  tagline: z.string().trim().default(""),
  description: z.string().trim().default(""),
  shortDescription: z.string().trim().max(160, "Keep it under 160 characters").default(""),
  category: z.enum(["Action", "Puzzle", "Sports", "Arcade", "Adventure", "Party"]),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  players: z.enum(["single", "multi", "both"]),
  minPlayers: z.number().int().min(1).default(1),
  maxPlayers: z.number().int().min(1).default(1),
  cover: z.string().trim().default(""),
  coverImage: z.string().trim().url().optional().or(z.literal("")),
  thumbnail: z.string().trim().url().optional().or(z.literal("")),
  accent: z.string().trim().default(""),
  rating: z.number().min(0).max(5).default(0),
  releaseYear: z.number().int().min(1970).max(2100).default(new Date().getFullYear()),
  durationMinutes: z.number().int().min(0).default(0),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  ageGroup: z.enum(["3-5", "6-8", "9-12", "13+"]).default("6-8"),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  featured: z.boolean().default(false),
});

/** Normalize a validated payload into a `Game` (empty optional strings → undefined). */
export function toGameInput(data: z.infer<typeof gameSchema>): Game {
  return {
    ...data,
    coverImage: data.coverImage ? data.coverImage : undefined,
    thumbnail: data.thumbnail ? data.thumbnail : undefined,
    categoryId: data.categoryId ? data.categoryId : undefined,
  };
}
