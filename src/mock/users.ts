import type { User } from "@/types";

// The currently "signed-in" mock user. Phase 2 will replace this with a
// real authenticated session.
export const CURRENT_USER_ID = "u-amra";

export const users: User[] = [
  {
    id: "u-amra",
    username: "amra",
    displayName: "Amra",
    email: "amrasabo@gmail.com",
    avatarColor: "from-fuchsia-500 to-purple-600",
    level: 14,
    xp: 7340,
    joinedAt: "2024-11-02T10:00:00.000Z",
    bio: "Founder & resident high-score chaser.",
  },
  {
    id: "u-nova",
    username: "nova",
    displayName: "Nova",
    email: "nova@example.com",
    avatarColor: "from-cyan-500 to-blue-600",
    level: 22,
    xp: 12880,
    joinedAt: "2024-06-18T10:00:00.000Z",
    bio: "Speedrunner. Sleep is optional.",
  },
  {
    id: "u-kai",
    username: "kai",
    displayName: "Kai",
    email: "kai@example.com",
    avatarColor: "from-emerald-500 to-teal-600",
    level: 9,
    xp: 4120,
    joinedAt: "2025-01-09T10:00:00.000Z",
  },
  {
    id: "u-zed",
    username: "zed",
    displayName: "Zed",
    email: "zed@example.com",
    avatarColor: "from-orange-500 to-red-600",
    level: 17,
    xp: 9010,
    joinedAt: "2024-09-23T10:00:00.000Z",
  },
  {
    id: "u-lux",
    username: "lux",
    displayName: "Lux",
    email: "lux@example.com",
    avatarColor: "from-pink-500 to-rose-600",
    level: 11,
    xp: 5600,
    joinedAt: "2025-02-14T10:00:00.000Z",
  },
  {
    id: "u-rex",
    username: "rex",
    displayName: "Rex",
    email: "rex@example.com",
    avatarColor: "from-lime-500 to-green-600",
    level: 6,
    xp: 2300,
    joinedAt: "2025-03-30T10:00:00.000Z",
  },
];
