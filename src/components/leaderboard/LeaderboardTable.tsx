import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/format";
import type { LeaderboardEntry } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

const RANK_STYLES: Record<number, string> = {
  1: "text-amber-400",
  2: "text-zinc-300",
  3: "text-orange-400",
};

export function LeaderboardTable({
  entries,
  highlightUserId,
}: {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
        No scores recorded yet.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {entries.map((entry) => {
        const isMe = entry.user.id === highlightUserId;
        return (
          <li
            key={`${entry.gameId}-${entry.user.id}-${entry.rank}`}
            className={cn(
              "flex items-center gap-4 px-5 py-4",
              isMe && "bg-accent/10",
            )}
          >
            <span
              className={cn(
                "w-8 text-center text-lg font-black tabular-nums",
                RANK_STYLES[entry.rank] ?? "text-muted",
              )}
            >
              {entry.rank}
            </span>
            <Avatar user={entry.user} size="sm" />
            <span className="flex-1 truncate font-semibold text-white">
              {entry.user.displayName}
              {isMe ? (
                <span className="ml-2 text-xs font-normal text-accent">
                  (you)
                </span>
              ) : null}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-white">
              {formatScore(entry.score)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
