"use client";

import React, { useEffect, useState } from "react";
import {
  Trophy,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  StatCard,
  Skeleton,
  Badge,
  EmptyState,
  InitialsAvatar,
  AdminButton,
  Pagination,
  TableSkeleton,
} from "@/components/superadmin/ui";
import { ActionMenu } from "@/components/superadmin/ActionMenu";
import { ConfirmDialog } from "@/components/superadmin/ConfirmDialog";

interface GameOption {
  id: string;
  title: string;
}

interface LeaderboardPlayer {
  userId: string;
  userName: string;
  userEmail: string;
  bestScore: number;
  bestScoreId: string;
  totalSubmissions: number;
  lastPlayed: string;
  rank: number;
}

interface ScoreEntry {
  id: string;
  score: number;
  achievedAt: string;
}

const PAGE_SIZE = 15;

export default function LeaderboardsPage() {
  const [games, setGames] = useState<GameOption[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<string>("");

  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedScores, setExpandedScores] = useState<ScoreEntry[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [toDeleteScore, setToDeleteScore] = useState<{ id: string; gameId: string; label: string } | null>(null);
  const [resetTarget, setResetTarget] = useState(false);
  const [busy, setBusy] = useState(false);

  // Load games list on mount
  useEffect(() => {
    fetch("/api/admin/games")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed"))
      .then((j) => {
        const list = ((j.games ?? []) as { id: string; title: string }[]).map((g) => ({
          id: g.id,
          title: g.title,
        }));
        setGames(list);
      })
      .catch(() => {})
      .finally(() => setGamesLoading(false));
  }, []);

  // Load leaderboard when game or page changes
  useEffect(() => {
    if (!selectedGame) return;
    setLoading(true);
    setError(null);
    setExpanded(null);
    fetch(`/api/admin/scores?gameId=${selectedGame}&page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => r.ok ? r.json() : r.json().then((j) => Promise.reject(j.error ?? "Failed")))
      .then((j) => {
        setPlayers(j.players ?? []);
        setTotal(j.total ?? 0);
        setTotalPages(j.totalPages ?? 1);
      })
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load leaderboard."))
      .finally(() => setLoading(false));
  }, [selectedGame, page]);

  function handleGameChange(gameId: string) {
    setSelectedGame(gameId);
    setPage(1);
    setPlayers([]);
    setTotal(0);
    setExpanded(null);
  }

  function toggleExpand(userId: string) {
    if (expanded === userId) {
      setExpanded(null);
      return;
    }
    setExpanded(userId);
    setExpandedScores([]);
    setExpandedLoading(true);
    fetch(`/api/admin/scores?gameId=${selectedGame}&userId=${userId}`)
      .then((r) => r.ok ? r.json() : Promise.reject("Failed"))
      .then((j) => setExpandedScores(j.scores ?? []))
      .catch(() => setExpandedScores([]))
      .finally(() => setExpandedLoading(false));
  }

  async function confirmDeleteScore() {
    if (!toDeleteScore) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/scores/${toDeleteScore.id}?gameId=${selectedGame}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to delete score.");
      }
      // Remove from expanded drawer
      setExpandedScores((prev) => prev.filter((s) => s.id !== toDeleteScore.id));
      // Update player row: decrement submissions, reload if best score deleted
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.bestScoreId === toDeleteScore.id) {
            // Best score was deleted — reload the whole leaderboard
            return p;
          }
          return { ...p, totalSubmissions: Math.max(0, p.totalSubmissions - 1) };
        }),
      );
      // If the deleted score was the best score, reload the page
      const deletedBest = players.find((p) => p.bestScoreId === toDeleteScore.id);
      if (deletedBest) {
        setTimeout(() => {
          setLoading(true);
          fetch(`/api/admin/scores?gameId=${selectedGame}&page=${page}&limit=${PAGE_SIZE}`)
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((j) => { setPlayers(j.players ?? []); setTotal(j.total ?? 0); setTotalPages(j.totalPages ?? 1); })
            .catch(() => {})
            .finally(() => setLoading(false));
        }, 300);
      }
      setToDeleteScore(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete score.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/scores?gameId=${selectedGame}&all=true`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to reset leaderboard.");
      }
      setPlayers([]);
      setTotal(0);
      setTotalPages(1);
      setExpanded(null);
      setResetTarget(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reset leaderboard.");
    } finally {
      setBusy(false);
    }
  }

  const selectedGameTitle = games.find((g) => g.id === selectedGame)?.title ?? "this game";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Leaderboard Moderation</h2>
          <p className="mt-1 text-sm text-slate-500">Remove cheated or test scores from game leaderboards.</p>
        </div>
      </div>

      {/* Game selector */}
      <Card className="p-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Select Game
        </label>
        <div className="relative mt-2 max-w-sm">
          <select
            value={selectedGame}
            onChange={(e) => handleGameChange(e.target.value)}
            disabled={gamesLoading}
            className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
          >
            <option value="">{gamesLoading ? "Loading games…" : "Choose a game…"}</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
        </div>
      </Card>

      {/* No game selected */}
      {!selectedGame && (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="Select a game"
          description="Choose a game above to view and moderate its leaderboard."
        />
      )}

      {/* Game selected: stats + table */}
      {selectedGame && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              tint="violet"
              icon={<Trophy className="h-5 w-5" />}
              value={total}
              label="Players on Board"
            />
            <StatCard
              tint="sky"
              icon={<Trophy className="h-5 w-5" />}
              value={players.reduce((s, p) => s + p.totalSubmissions, 0)}
              label="Scores (this page)"
            />
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <p className="text-sm font-medium text-slate-700">
                {total} player{total !== 1 ? "s" : ""}
              </p>
              <AdminButton
                variant="danger"
                onClick={() => setResetTarget(true)}
                disabled={total === 0}
              >
                <RotateCcw className="h-4 w-4" />
                Reset Leaderboard
              </AdminButton>
            </div>

            {loading ? (
              <TableSkeleton cols={5} />
            ) : error ? (
              <p className="p-8 text-center text-sm text-rose-600">{error}</p>
            ) : players.length === 0 ? (
              <EmptyState
                icon={<Trophy className="h-6 w-6" />}
                title="No scores yet"
                description="No scores have been submitted for this game."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <tr className="border-b border-slate-100">
                      <th className="w-8 px-3 py-3" />
                      <th className="px-5 py-3 font-semibold">Rank</th>
                      <th className="px-5 py-3 font-semibold">Player</th>
                      <th className="px-5 py-3 font-semibold">Best Score</th>
                      <th className="px-5 py-3 font-semibold">Submissions</th>
                      <th className="px-5 py-3 font-semibold">Last Played</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => {
                      const isExpanded = expanded === p.userId;
                      return (
                        <React.Fragment key={p.userId}>
                          <tr
                            className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                          >
                            <td className="px-3 py-3">
                              <button
                                onClick={() => toggleExpand(p.userId)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                title={isExpanded ? "Collapse" : "Expand scores"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={p.rank <= 3 ? "amber" : "slate"}>#{p.rank}</Badge>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <InitialsAvatar name={p.userName} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">{p.userName}</p>
                                  <p className="truncate text-xs text-slate-400">{p.userEmail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-semibold text-slate-900">
                              {p.bestScore.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-slate-500">{p.totalSubmissions}</td>
                            <td className="px-5 py-3 text-slate-500">
                              {p.lastPlayed ? formatDate(p.lastPlayed) : "—"}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <ActionMenu
                                items={[
                                  {
                                    label: "Delete best score",
                                    icon: <Trash2 className="h-4 w-4" />,
                                    danger: true,
                                    onClick: () =>
                                      setToDeleteScore({
                                        id: p.bestScoreId,
                                        gameId: selectedGame,
                                        label: `best score (${p.bestScore.toLocaleString()}) for ${p.userName}`,
                                      }),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                          {/* Score drawer */}
                          {isExpanded && (
                            <tr className="border-b border-slate-50 bg-slate-50/40">
                              <td colSpan={7} className="px-5 py-3">
                                {expandedLoading ? (
                                  <div className="space-y-2 py-1">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                      <Skeleton key={i} className="h-9 w-full" />
                                    ))}
                                  </div>
                                ) : expandedScores.length === 0 ? (
                                  <p className="py-2 text-sm text-slate-400">No scores found.</p>
                                ) : (
                                  <div className="overflow-hidden rounded-lg border border-slate-100 bg-white">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                          <th className="px-4 py-2 text-left">Score</th>
                                          <th className="px-4 py-2 text-left">Date</th>
                                          <th className="px-4 py-2" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {expandedScores.map((s) => (
                                          <tr
                                            key={s.id}
                                            className={cn(
                                              "border-b border-slate-50 last:border-0",
                                              s.id === p.bestScoreId && "bg-amber-50/50",
                                            )}
                                          >
                                            <td className="px-4 py-2 font-medium text-slate-900">
                                              {s.score.toLocaleString()}
                                              {s.id === p.bestScoreId && (
                                                <Badge tone="amber" className="ml-2 text-[10px]">best</Badge>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500">
                                              {formatDate(s.achievedAt)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <button
                                                onClick={() =>
                                                  setToDeleteScore({
                                                    id: s.id,
                                                    gameId: selectedGame,
                                                    label: `score of ${s.score.toLocaleString()} for ${p.userName}`,
                                                  })
                                                }
                                                className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                                title="Delete this score"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && players.length > 0 && (
              <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
            )}
          </Card>
        </>
      )}

      {/* Delete single score confirm */}
      <ConfirmDialog
        open={!!toDeleteScore}
        danger
        icon={<Trash2 className="h-5 w-5" />}
        title="Delete score?"
        description={
          <>
            This permanently removes the{" "}
            <span className="font-semibold text-slate-700">{toDeleteScore?.label}</span>.
            This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete score"
        busy={busy}
        onConfirm={confirmDeleteScore}
        onCancel={() => setToDeleteScore(null)}
      />

      {/* Reset leaderboard confirm */}
      <ConfirmDialog
        open={resetTarget}
        danger
        icon={<RotateCcw className="h-5 w-5" />}
        title="Reset leaderboard?"
        description={
          <>
            This permanently deletes <span className="font-semibold text-slate-700">all scores</span> for{" "}
            <span className="font-semibold text-slate-700">{selectedGameTitle}</span>. This can&apos;t be undone.
          </>
        }
        confirmLabel="Reset leaderboard"
        busy={busy}
        onConfirm={confirmReset}
        onCancel={() => setResetTarget(false)}
      />
    </div>
  );
}
