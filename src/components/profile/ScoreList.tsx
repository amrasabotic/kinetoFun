import Link from "next/link";
import { formatScore, relativeTime } from "@/lib/format";
import type { Game, Score } from "@/types";

type ScoreWithGame = Score & { game?: Game };

export function ScoreList({ scores }: { scores: ScoreWithGame[] }) {
  if (scores.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface p-6 text-center text-muted">
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
            className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition hover:bg-surface-2 focus:bg-surface-2"
          >
            <span
              className={`h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${
                score.game?.cover ?? "from-zinc-600 to-zinc-800"
              }`}
            />
            <span className="flex-1">
              <span className="block font-semibold text-white">
                {score.game?.title ?? "Unknown game"}
              </span>
              <span className="block text-xs text-muted">
                {relativeTime(score.achievedAt)}
              </span>
            </span>
            <span className="font-mono font-bold tabular-nums text-white">
              {formatScore(score.score)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
