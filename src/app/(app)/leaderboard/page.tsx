"use client";

import { useState } from "react";
import { useGames } from "@/features/games/useGames";
import { useLeaderboard } from "@/features/scores/useLeaderboard";
import { useSession } from "@/features/auth/session-context";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { cn } from "@/lib/utils";
import { searchGames } from "@/services/games.service";

const GLOBAL = "global";

export default function LeaderboardPage() {
  const { user } = useSession();
  const { games: allGames } = useGames();
  const [selected, setSelected] = useState<string>(GLOBAL);
  const [query, setQuery] = useState("");

  const visibleGames = searchGames(allGames, query);

  const { entries, loading, error } = useLeaderboard(
    selected === GLOBAL ? null : selected,
  );

  const selectedGame = allGames.find((g) => g.id === selected);
  const selectedTitle =
    selected === GLOBAL
      ? "Global best scores"
      : `${selectedGame?.title ?? selected} leaderboard`;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Leaderboards
        </h1>
        <p className="text-muted-foreground">Top players across KinetoFun.</p>
      </header>

      {/* Mobile: search + horizontal scrollable strip */}
      <div className="md:hidden space-y-2">
        <SearchInput query={query} onChange={setQuery} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <MobileChip
            active={selected === GLOBAL}
            onClick={() => setSelected(GLOBAL)}
          >
            🌐 Global
          </MobileChip>
          {visibleGames.map((game) => (
            <MobileChip
              key={game.id}
              active={selected === game.id}
              onClick={() => setSelected(game.id)}
            >
              {game.title}
            </MobileChip>
          ))}
        </div>
      </div>

      {/* Desktop: two-panel layout */}
      <div className="hidden md:flex gap-0 h-[560px] rounded-2xl border border-border/30 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-border/30 bg-card/10 flex flex-col">
          <div className="px-3 py-3 border-b border-border/20 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Games
            </p>
            <SearchInput query={query} onChange={setQuery} />
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {!query && (
              <SidebarItem
                active={selected === GLOBAL}
                onClick={() => setSelected(GLOBAL)}
                thumbnail={null}
                cover={null}
                title="Global"
                isGlobal
              />
            )}
            {visibleGames.map((game) => (
              <SidebarItem
                key={game.id}
                active={selected === game.id}
                onClick={() => setSelected(game.id)}
                thumbnail={game.thumbnail ?? game.coverImage ?? null}
                cover={game.cover}
                title={game.title}
              />
            ))}
            {visibleGames.length === 0 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground/50">
                No games found
              </p>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 p-6 gap-4 overflow-y-auto">
          <h2 className="text-xl font-bold text-foreground">{selectedTitle}</h2>
          <LeaderboardContent
            loading={loading}
            error={error}
            entries={entries}
            userId={user?.id}
          />
        </main>
      </div>

      {/* Mobile: leaderboard below the strip */}
      <div className="md:hidden space-y-4">
        <h2 className="text-xl font-bold text-foreground">{selectedTitle}</h2>
        <LeaderboardContent
          loading={loading}
          error={error}
          entries={entries}
          userId={user?.id}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LeaderboardContent({
  loading,
  error,
  entries,
  userId,
}: {
  loading: boolean;
  error: string | null;
  entries: ReturnType<typeof useLeaderboard>["entries"];
  userId?: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45">
        {error}
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 text-center text-sm text-foreground/45">
        No scores yet — be the first to play!
      </p>
    );
  }
  return <LeaderboardTable entries={entries} highlightUserId={userId} />;
}

function SidebarItem({
  active,
  onClick,
  thumbnail,
  cover,
  title,
  isGlobal = false,
}: {
  active: boolean;
  onClick: () => void;
  thumbnail: string | null;
  cover: string | null;
  title: string;
  isGlobal?: boolean;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
        "border-l-2",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-transparent text-muted-foreground hover:bg-muted/20 hover:text-foreground",
      )}
    >
      {/* Thumbnail / fallback */}
      <span className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-base">
        {isGlobal ? (
          <span
            className={cn(
              "w-full h-full flex items-center justify-center rounded-lg text-sm",
              "bg-gradient-to-br from-violet-500/30 to-purple-600/30",
            )}
          >
            🌐
          </span>
        ) : thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "w-full h-full flex items-center justify-center rounded-lg text-xs font-bold text-white/80",
              cover ?? "bg-gradient-to-br from-violet-500 to-purple-600",
            )}
          >
            {title.charAt(0)}
          </span>
        )}
      </span>

      <span className="truncate text-sm font-medium">{title}</span>
    </button>
  );
}

function SearchInput({
  query,
  onChange,
}: {
  query: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games…"
        className={cn(
          "w-full rounded-lg bg-background/40 border border-border/30 py-1.5 pl-8 pr-3",
          "text-xs text-foreground placeholder:text-muted-foreground/40",
          "focus:outline-none focus:border-primary/50 focus:bg-background/60 transition",
        )}
      />
    </div>
  );
}

function MobileChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-focusable
      onClick={onClick}
      className={cn(
        "flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card/20 text-muted-foreground border border-border/40 hover:bg-muted/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
