import type { AuthUser, UserRecord } from "@/types/auth";

/**
 * Map a raw database row to the public `AuthUser` shape. This is the single
 * choke point that strips `password_hash` — nothing past this function should
 * ever see the hash.
 */
export function toAuthUser(record: UserRecord): AuthUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role ?? "user",
    createdAt: record.created_at,
    ...(record.username && { username: record.username }),
    ...(record.bio && { bio: record.bio }),
    ...(record.avatar_color && { avatarColor: record.avatar_color }),
  };
}
