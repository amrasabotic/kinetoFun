import { cn } from "@/lib/utils";
import type { User } from "@/types";

const SIZES = {
  sm: "h-9 w-9 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-4xl",
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
  user: Pick<User, "displayName" | "avatarColor">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white/10",
        user.avatarColor,
        SIZES[size],
        className,
      )}
    >
      {initials(user.displayName)}
    </span>
  );
}
