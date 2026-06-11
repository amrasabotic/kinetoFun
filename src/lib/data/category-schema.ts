// Shared zod schemas for the admin category API. Mirrors `CategoryInput`.

import { z } from "zod";

const slug = z
  .string()
  .trim()
  .min(1, "slug is required")
  .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and dashes");

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  slug,
  description: z.string().trim().max(280).default(""),
  icon: z.string().trim().min(1).default("Gamepad2"),
  image: z.string().trim().url().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

// All fields optional for PATCH (partial update).
export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: slug.optional(),
  description: z.string().trim().max(280).optional(),
  icon: z.string().trim().min(1).optional(),
  image: z.string().trim().url().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/** Turn a slug-like string out of any name. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
