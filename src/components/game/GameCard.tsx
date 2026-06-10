'use client';

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { playersLabel } from "@/lib/format";
import type { Game } from "@/types";
import { Play, Users, Star } from "lucide-react";

export function GameCard({
  game,
  className,
}: {
  game: Game;
  className?: string;
}) {
  return (
    <Link
      href={`/games/${game.id}`}
      data-focusable
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl",
        "border border-white/10 bg-white/5",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(26,172,224,0.25)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1AACE0]/60",
        className,
      )}
    >
      {/* ── Cover ───────────────────────────────────────────────── */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br">
        {game.coverImage ? (
          <Image
            src={game.coverImage}
            alt={game.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", game.cover)} />
        )}

        {/* Depth scrim — lightens on hover to feel interactive */}
        <div className="absolute inset-0 bg-black/20 transition-colors duration-300 group-hover:bg-black/10" />

        {/* Top row: category + rating */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2.5 gap-2">
          <span
            className="truncate rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md"
            style={{
              background: `${game.accent ?? "#1AACE0"}bb`,
              border: `1px solid ${game.accent ?? "#1AACE0"}55`,
            }}
          >
            {game.category}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-amber-400/30 bg-black/35 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            {game.rating.toFixed(1)}
          </span>
        </div>

        {/* Centre: play button — slides up on hover */}
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div
            className={cn(
              "flex h-12 w-12 translate-y-3 scale-90 items-center justify-center rounded-full opacity-0",
              "border border-white/50 bg-white/20 backdrop-blur-md",
              "transition-all duration-300 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100",
            )}
            style={{ boxShadow: "0 0 28px rgba(26,172,224,0.55)" }}
          >
            <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
          </div>
        </div>

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Title on cover */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3">
          <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white drop-shadow-md sm:text-sm">
            {game.title}
          </h3>
        </div>
      </div>

      {/* ── Footer strip ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-white/8 bg-[#0a1438]/70 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-1 text-[10px] text-white/50">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{playersLabel(game.players)}</span>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors duration-200 group-hover:bg-[#1AACE0]/25 group-hover:text-[#1AACE0]"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.40)" }}
        >
          Play →
        </span>
      </div>
    </Link>
  );
}
