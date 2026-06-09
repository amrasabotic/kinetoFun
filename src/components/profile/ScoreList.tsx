import Link from "next/link";
import { formatScore, relativeTime } from "@/lib/format";
import type { Game, Score } from "@/types";

type ScoreWithGame = Score & { game?: Game };

export function ScoreList({ scores }: { scores: ScoreWithGame[] }) {
  if (scores.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45 backdrop-blur-xl">
        No scores yet — go play something!
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {scores.map((score) => (
        <li key={score.id}>
          <Link
            href={score.game ? `/games/${score.game.id}` : "#"}
            data-focusable
            className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.07] hover:border-white/[0.12] focus:outline-none"
          >
            <span
              className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${
                score.game?.cover ?? "from-zinc-600 to-zinc-800"
              }`}
            />
            <span className="flex-1 min-w-0">
              <span className="block truncate font-semibold text-foreground">
                {score.game?.title ?? "Unknown game"}
              </span>
              <span className="block text-xs text-foreground/45">
                {relativeTime(score.achievedAt)}
              </span>
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-primary">
              {formatScore(score.score)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
