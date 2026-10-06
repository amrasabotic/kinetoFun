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
    ...(record.xp !== undefined && { xp: record.xp }),
    ...(record.level !== undefined && { level: record.level }),
    ...(record.tickets !== undefined && { tickets: record.tickets }),
    ...(record.equipped_avatar && { equippedAvatar: record.equipped_avatar }),
    ...(record.equipped_frame && { equippedFrame: record.equipped_frame }),
    ...(record.equipped_banner && { equippedBanner: record.equipped_banner }),
    ...(record.large_text !== undefined && { largeText: record.large_text }),
    ...(record.reduce_motion !== undefined && { reduceMotion: record.reduce_motion }),
    // Propagate active=false explicitly so the DAL can block deactivated users.
    ...(record.active === false && { active: false }),
  };
}
