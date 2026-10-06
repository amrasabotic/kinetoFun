import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { findShopItem } from "@/lib/rewards/shop";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-4xl",
} as const;

/** Ring thickness per size, so frames look the same weight at every size. */
const FRAME_PADDING = {
  sm: "p-[2px]",
  md: "p-[3px]",
  lg: "p-1",
  xl: "p-1.5",
} as const;

/** Emoji read a little smaller than initials at the same circle size. */
const EMOJI_SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  user,
  size = "md",
  className,
}: {
  user: Pick<User, "displayName" | "avatarColor"> &
    Partial<Pick<User, "equippedAvatar" | "equippedFrame">>;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const emoji = findShopItem(user.equippedAvatar)?.emoji;
  const frame = findShopItem(user.equippedFrame)?.className;

  const face = (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white",
        !frame && "ring-2 ring-white/10",
        user.avatarColor,
        SIZES[size],
        emoji && EMOJI_SIZES[size],
        !frame && className,
      )}
    >
      {emoji ?? initials(user.displayName)}
    </span>
  );

  if (!frame) return face;
  return (
    <span aria-hidden className={cn("inline-flex rounded-full", frame, FRAME_PADDING[size], className)}>
      {face}
    </span>
  );
}
