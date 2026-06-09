'use client';

import Link from "next/link";
import { cn } from "@/lib/utils";
import { playersLabel } from "@/lib/format";
import type { Game } from "@/types";
import { GlowCard } from "@/components/ui/spotlight-card";
import { Play, Users, Clock } from "lucide-react";

export function GameCard({
  game,
  className,
}: {
  game: Game;
  className?: string;
}) {
  return (
    <GlowCard
      customSize
      glowColor="purple"
      className={cn(
        "w-full aspect-[3/4] !p-0 !gap-0 overflow-hidden cursor-pointer",
        className,
      )}
    >
      <Link
        href={`/games/${game.id}`}
        data-focusable
        className="absolute inset-0 z-10 flex flex-col group"
      >
        {/* ── Cover ──────────────────────────────────────────────── */}
        <div className={cn("relative flex-1 overflow-hidden bg-gradient-to-br", game.cover)}>
          {/* base scrim */}
          <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:bg-black/10" />

          {/* top-left: category */}
          <div className="absolute left-3 top-3 z-20">
            <span className="rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {game.category}
            </span>
          </div>

          {/* top-right: rating */}
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 backdrop-blur-sm">
            <svg className="h-3 w-3 fill-amber-400" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span className="text-[11px] font-bold text-white">{game.rating.toFixed(1)}</span>
          </div>

          {/* center: play button on hover */}
          <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
            <div className="flex h-14 w-14 translate-y-2 items-center justify-center rounded-full border border-white/40 bg-white/20 shadow-xl backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0 group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
            </div>
          </div>

          {/* bottom gradient for title legibility */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

          {/* title on cover */}
          <div className="absolute inset-x-0 bottom-0 z-20 p-3">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-lg">
              {game.title}
            </h3>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm">
          <div className="flex items-center gap-1 text-[11px] text-white/50">
            <Users className="h-3 w-3" />
            <span>{playersLabel(game.players)}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/50">
            <Clock className="h-3 w-3" />
            <span>{game.durationMinutes}m</span>
          </div>
        </div>
      </Link>
    </GlowCard>
  );
}
