// Request-body validation for the auth endpoints, using zod.
// Server Actions / Route Handlers must never trust client input — every
// payload is parsed here before it reaches the database or hashing logic.

import * as z from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name must be at most 60 characters."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long.")
    .regex(/[a-zA-Z]/, "Password must include at least one letter.")
    .regex(/[0-9]/, "Password must include at least one number."),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

/**
 * Flatten a ZodError into `{ field: [messages] }`. Written by hand (instead of
 * `error.flatten()`) so it stays stable across zod versions.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}
