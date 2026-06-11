"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameCard } from "./GameCard";
import { cn } from "@/lib/utils";
import type { Game } from "@/types";

/**
 * A horizontally scrolling row of games with a heading — the Netflix/console
 * style browsing primitive. The scrollbar is hidden; navigation happens through
 * the gradient-masked arrow buttons (which fade in only when there's overflow
 * in that direction) or by focusing a card (handled by spatial-navigation).
 */
export function GameRail({
  title,
  games,
  subtitle,
  viewAllHref,
}: {
  title: string;
  games: Game[];
  subtitle?: string;
  viewAllHref?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, games.length]);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Advance by ~90% of the visible width so a partially-cut card stays as an anchor.
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  if (games.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>
        {subtitle && viewAllHref ? (
          <Link href={viewAllHref} className="text-sm text-muted transition-colors hover:text-primary">
            {subtitle}
          </Link>
        ) : subtitle ? (
          <span className="text-sm text-muted">{subtitle}</span>
        ) : null}
      </div>

      <div className="group/rail relative">
        {/* Left arrow */}
        <ArrowButton
          side="left"
          visible={canScrollLeft}
          onClick={() => scrollByPage(-1)}
        />

        <div
          ref={scrollerRef}
          className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-2 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {games.map((game) => (
            <div
              key={game.id}
              className="w-40 shrink-0 snap-start transition-transform duration-300 hover:-translate-y-1.5 sm:w-48 lg:w-56"
            >
              <GameCard game={game} />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <ArrowButton
          side="right"
          visible={canScrollRight}
          onClick={() => scrollByPage(1)}
        />
      </div>
    </section>
  );
}

function ArrowButton({
  side,
  visible,
  onClick,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Scroll left" : "Scroll right"}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full",
        "border border-[#1AACE0]/30 bg-white/80 text-[#1A2E74] shadow-lg backdrop-blur-md",
        "transition-all duration-300 hover:scale-110 hover:bg-white hover:text-[#1AACE0]",
        "dark:border-white/15 dark:bg-[#0a1438]/80 dark:text-white dark:hover:bg-[#0a1438]",
        "sm:flex",
        side === "left" ? "-left-3 lg:-left-5" : "-right-3 lg:-right-5",
        // Reveal on rail hover or keyboard focus, but only when actually scrollable.
        visible
          ? "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
