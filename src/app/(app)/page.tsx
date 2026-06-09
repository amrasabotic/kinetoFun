"use client";

import { useMemo } from "react";
import Link from "next/link";
import { gamesService, leaderboardService } from "@/services";
import { sessions, games as allGames } from "@/mock";
import { useSession } from "@/features/auth/session-context";
import { GameRail } from "@/components/game/GameRail";
import { ButtonLink } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { InteractiveRobotSpline } from "@/components/blocks/interactive-3d-robot";
import { ShimmerText } from "@/components/ui/shimmer-text";
import { playersLabel } from "@/lib/format";
import type { Game, GameCategory } from "@/types";

const CATEGORY_RAILS: GameCategory[] = ["Action", "Adventure", "Puzzle", "Sports"];

// ─── Shared icon helpers ──────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "from-yellow-400 to-amber-500",
    2: "from-slate-300 to-slate-400",
    3: "from-orange-400 to-amber-600",
  };
  const gradient = colors[rank] ?? "from-zinc-600 to-zinc-700";
  return (
    <span
      className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-lg`}
    >
      {rank}
    </span>
  );
}

// ─── Section: Featured Games ──────────────────────────────────────────────────

function FeaturedGamesSection() {
  const featured = gamesService.featured();
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 bg-[#09090f] py-20">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-400">
            Now Playing
          </p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Featured Games</h2>
        </div>
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none]">
          {featured.map((game) => (
            <Link
              key={game.id}
              href="/login"
              className="group relative w-72 flex-none snap-start overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-900/40 sm:w-80"
            >
              <div className={`relative aspect-[16/9] bg-gradient-to-br ${game.cover}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-sm">
                    <PlayIcon />
                  </div>
                </div>
                <div className="absolute left-3 top-3">
                  <span className="rounded-full border border-white/20 bg-black/40 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
                    {game.category}
                  </span>
                </div>
              </div>
              <div className="bg-[#13131f] p-4">
                <h3 className="text-lg font-bold leading-tight text-white">{game.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-white/60">{game.tagline}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-white/50">
                  <span>{playersLabel(game.players)}</span>
                  <span className="font-semibold text-amber-400">★ {game.rating.toFixed(1)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/login" size="lg" variant="secondary">
            View all games →
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Platform Features ──────────────────────────────────────────────

const FEATURES = [
  {
    index: "01",
    tag: "INPUT",
    title: "Gesture Gaming",
    desc: "Wave your hands to control games — no controller needed. Powered by AI motion detection.",
    badge: "Coming soon",
    accent: "#a78bfa",
    wide: true,
  },
  {
    index: "02",
    tag: "SOCIAL",
    title: "Multiplayer",
    desc: "Challenge friends locally or join global lobbies across dozens of titles.",
    accent: "#60a5fa",
    wide: false,
  },
  {
    index: "03",
    tag: "RANKINGS",
    title: "Leaderboards",
    desc: "Real-time global rankings. Climb the charts and earn your place among the elite.",
    accent: "#fbbf24",
    wide: false,
  },
  {
    index: "04",
    tag: "DISPLAY",
    title: "TV Optimized",
    desc: "Designed from the ground up for your living room — 4K crisp, couch-friendly navigation.",
    accent: "#34d399",
    wide: true,
  },
  {
    index: "05",
    tag: "PERFORMANCE",
    title: "Instant Launch",
    desc: "Zero installs. Click play and your game loads in seconds, right in the browser.",
    accent: "#facc15",
    wide: false,
  },
  {
    index: "06",
    tag: "AI",
    title: "Motion AI",
    desc: "Next-gen gesture recognition trained on millions of movements. The future of input.",
    badge: "Future",
    accent: "#f472b6",
    wide: false,
  },
] as const;

function PlatformFeaturesSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.25em] text-white/30">
              Why KinetoFun
            </p>
            <h2 className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Built for the<br />
              <span className="text-white/30">Next Generation</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/40 lg:text-right">
            Every feature engineered for the living room experience.
            Premium gaming without the hardware.
          </p>
        </div>

        {/* Bento grid — alternating wide/narrow */}
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            /* Row pattern: [wide, narrow] [narrow, wide] [wide, narrow] */
            const isLastInRow = i % 3 === 2;
            const spanClass = f.wide ? "lg:col-span-2" : "";
            return (
              <div
                key={f.title}
                className={`group relative overflow-hidden bg-white/[0.02] p-8 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.05] ${spanClass}`}
                style={{ "--feature-accent": f.accent } as React.CSSProperties}
              >
                {/* Top accent line — grows on hover */}
                <div
                  className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: f.accent }}
                />
                {/* Static dim line always visible */}
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-20"
                  style={{ background: f.accent }}
                />

                {/* Giant background index */}
                <span
                  className="pointer-events-none absolute -right-4 -top-6 select-none font-mono text-[7rem] font-black leading-none opacity-[0.04] transition-opacity duration-500 group-hover:opacity-[0.07]"
                  style={{ color: f.accent }}
                >
                  {f.index}
                </span>

                {/* Tag + badge row */}
                <div className="mb-6 flex items-center gap-3">
                  <span className="font-mono text-[10px] font-medium tracking-[0.2em] text-white/25">
                    // {f.tag}
                  </span>
                  {"badge" in f && f.badge && (
                    <span
                      className="rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                      style={{
                        background: `${f.accent}18`,
                        color: f.accent,
                        border: `1px solid ${f.accent}40`,
                      }}
                    >
                      {f.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="mb-3 text-2xl font-black tracking-tight text-white transition-colors duration-300">
                  {f.title}
                </h3>

                {/* Description */}
                <p className="max-w-sm text-sm leading-relaxed text-white/40 transition-colors duration-300 group-hover:text-white/60">
                  {f.desc}
                </p>

                {/* Bottom accent dot */}
                <div
                  className="absolute bottom-6 right-6 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: f.accent }}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom rule */}
        <div className="mt-px h-px bg-white/[0.06]" />
      </div>
    </section>
  );
}

// ─── Section: How It Works ────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    title: "Connect Device",
    desc: "Open KinetoFun on your TV, browser, or smart display. No downloads, no installs — just a URL.",
    accent: "#a78bfa",
    stat: "0s",
    statLabel: "setup time",
  },
  {
    num: "02",
    title: "Browse Games",
    desc: "Explore dozens of titles across every genre. Filter by players, category, or mood.",
    accent: "#60a5fa",
    stat: "50+",
    statLabel: "titles",
  },
  {
    num: "03",
    title: "Launch Game",
    desc: "Hit play. Your game streams instantly — no waiting, no friction, no friction.",
    accent: "#34d399",
    stat: "<3s",
    statLabel: "load time",
  },
  {
    num: "04",
    title: "Play & Compete",
    desc: "Challenge friends, climb leaderboards, and earn your place in the hall of fame.",
    accent: "#fbbf24",
    stat: "∞",
    statLabel: "replayability",
  },
] as const;

function HowItWorksSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header — consistent with PlatformFeatures */}
        <div className="mb-20 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-white/25">
              // Get Started
            </p>
            <h2 className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              How It<br />
              <span className="text-white/25">Works</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/35 lg:text-right">
            Four steps from zero to playing. No hardware, no friction, no downloads.
          </p>
        </div>

        {/* Steps — full-width rows */}
        <div className="relative">
          {/* Vertical gradient connector line */}
          <div
            className="pointer-events-none absolute bottom-0 left-[7px] top-0 w-px sm:left-[11px]"
            style={{
              background:
                "linear-gradient(to bottom, #a78bfa, #60a5fa 33%, #34d399 66%, #fbbf24)",
              opacity: 0.25,
            }}
          />

          {STEPS.map((step) => (
            <div
              key={step.num}
              className="group relative grid cursor-default grid-cols-1 items-center gap-6 border-t border-white/[0.06] py-10 pl-8 sm:grid-cols-[1fr_auto] sm:pl-12 lg:grid-cols-[260px_1fr_auto] lg:gap-16"
            >
              {/* Hover radial fill */}
              <div
                className="pointer-events-none absolute inset-0 -mx-6 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:-mx-10"
                style={{
                  background: `radial-gradient(ellipse 60% 120% at 0% 50%, ${step.accent}0a, transparent 70%)`,
                }}
              />

              {/* Connector dot on the vertical line */}
              <div
                className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 opacity-40 transition-all duration-300 group-hover:scale-125 group-hover:opacity-100"
                style={{
                  borderColor: step.accent,
                  background: `${step.accent}20`,
                  boxShadow: `0 0 0 0 ${step.accent}`,
                }}
              />

              {/* Left: number + title */}
              <div className="relative flex items-baseline gap-5">
                <span
                  className="font-mono text-[2.5rem] font-black leading-none opacity-15 transition-opacity duration-300 group-hover:opacity-35 lg:text-[3rem]"
                  style={{ color: step.accent }}
                >
                  {step.num}
                </span>
                <h3 className="text-xl font-black tracking-tight text-white lg:text-2xl">
                  {step.title}
                </h3>
              </div>

              {/* Center: description */}
              <p className="relative max-w-md text-sm leading-relaxed text-white/35 transition-colors duration-300 group-hover:text-white/65">
                {step.desc}
              </p>

              {/* Right: stat */}
              <div className="relative hidden flex-col items-end lg:flex">
                <span
                  className="font-mono text-3xl font-black leading-none tabular-nums opacity-20 transition-opacity duration-300 group-hover:opacity-70"
                  style={{ color: step.accent }}
                >
                  {step.stat}
                </span>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/20">
                  {step.statLabel}
                </span>
              </div>
            </div>
          ))}

          {/* Closing rule */}
          <div className="border-t border-white/[0.06]" />
        </div>

      </div>
    </section>
  );
}

// ─── Section: Popular Categories ─────────────────────────────────────────────

const CATEGORIES = [
  {
    name: "Arcade",
    color: "from-emerald-500 via-teal-600 to-cyan-700",
    count: 8,
    tags: ["Retro", "Fast-paced"],
    wide: true,
  },
  {
    name: "Sports",
    color: "from-orange-500 via-amber-500 to-yellow-600",
    count: 6,
    tags: ["Competitive", "Teams"],
    wide: false,
  },
  {
    name: "Racing",
    color: "from-fuchsia-600 via-purple-600 to-violet-700",
    count: 4,
    tags: ["Speed", "Precision"],
    wide: false,
  },
  {
    name: "Puzzle",
    color: "from-cyan-500 via-sky-600 to-blue-700",
    count: 7,
    tags: ["Strategy", "Logic"],
    wide: false,
  },
  {
    name: "Family",
    color: "from-pink-500 via-rose-500 to-red-600",
    count: 5,
    tags: ["Co-op", "All ages"],
    wide: false,
  },
  {
    name: "Multiplayer",
    color: "from-violet-600 via-indigo-600 to-blue-700",
    count: 9,
    tags: ["Social", "Online"],
    wide: true,
  },
] as const;

/** Dot-grid texture applied via inline backgroundImage */
const DOT_TEXTURE =
  "radial-gradient(circle at 1.5px 1.5px, rgba(255,255,255,0.18) 1.5px, transparent 0)";

function CategoryCard({
  cat,
}: {
  cat: (typeof CATEGORIES)[number];
}) {
  return (
    <Link
      href="/login"
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.color} transition-all duration-500 hover:shadow-2xl hover:shadow-black/60 hover:brightness-110 ${cat.wide ? "col-span-2 aspect-[2.4/1]" : "aspect-square"}`}
    >
      {/* Dot-grid texture overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: DOT_TEXTURE, backgroundSize: "22px 22px" }}
      />

      {/* Dark vignette at edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

      {/* Shimmer on hover */}
      <div className="absolute inset-0 -translate-x-full skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[200%]" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">

        {/* Top row: tags */}
        <div className="flex flex-wrap gap-1.5">
          {cat.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/20 bg-black/25 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Center: big name (wide cards only) */}
        {cat.wide && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <span
              className="select-none font-black leading-none text-white/[0.07] transition-all duration-500 group-hover:text-white/[0.12]"
              style={{ fontSize: "clamp(4rem, 10vw, 9rem)", letterSpacing: "-0.04em" }}
            >
              {cat.name.toUpperCase()}
            </span>
          </div>
        )}

        {/* Bottom: name + count + arrow */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-black leading-none tracking-tight text-white sm:text-2xl">
              {cat.name}
            </p>
            <p className="mt-1 font-mono text-xs text-white/50">
              {cat.count} games
            </p>
          </div>
          <div className="flex h-8 w-8 translate-x-1 items-center justify-center rounded-full border border-white/25 bg-black/20 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PopularCategoriesSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 bg-[#0c0c18] py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-white/25">
              // Explore
            </p>
            <h2 className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">
              Popular<br />
              <span className="text-white/25">Categories</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-white/35 lg:text-right">
            Every genre. Every mood. Find your next obsession.
          </p>
        </div>

        {/* Bento grid: [wide][sq][sq] / [sq][sq][wide] */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.name} cat={cat} />
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── Section: Leaderboard Preview ────────────────────────────────────────────

function LeaderboardPreviewSection() {
  const topPlayers = leaderboardService.global(5);
  const avatarColors = [
    "from-fuchsia-500 to-purple-600",
    "from-cyan-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
  ];
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 bg-[#09090f] py-20">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-400">
              Hall of Fame
            </p>
            <h2 className="text-3xl font-black text-white sm:text-4xl">Top Players</h2>
            <p className="mt-3 text-white/60">Global rankings based on your best single score.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#13131f]">
            {topPlayers.map((entry, i) => (
              <div
                key={entry.user.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors duration-200 hover:bg-white/5 ${
                  i < topPlayers.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <RankBadge rank={entry.rank} />
                <div
                  className={`h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br ${entry.user.avatarColor ?? avatarColors[i % avatarColors.length]} flex items-center justify-center font-bold text-white shadow-md`}
                >
                  {entry.user.displayName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white truncate">{entry.user.displayName}</p>
                  <p className="text-xs text-white/40">Lv {entry.user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400 tabular-nums">
                    {entry.score.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40">pts</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <ButtonLink href="/login" size="lg" variant="secondary">
              View full leaderboard
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Featured Game Showcase ─────────────────────────────────────────

function GameShowcaseSection() {
  const featured = gamesService.featured();
  const spotlight = featured.find((g) => g.id === "shadow-quest") ?? featured[0];
  if (!spotlight) return null;
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 bg-[#0c0c18] py-20">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${spotlight.cover}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-purple-600/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                  Spotlight
                </span>
                <span className="text-xs text-white/60">{spotlight.releaseYear}</span>
              </div>
              <h2 className="text-4xl font-black text-white drop-shadow sm:text-5xl lg:text-6xl">
                {spotlight.title}
              </h2>
              <p className="mt-3 text-lg font-medium text-white/80">{spotlight.tagline}</p>
              <p className="mt-4 max-w-md leading-relaxed text-white/60">{spotlight.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/70">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">★</span>
                  <span className="font-semibold text-white">{spotlight.rating.toFixed(1)}</span>
                  <span>/ 5.0</span>
                </div>
                <span aria-hidden>·</span>
                <span>{playersLabel(spotlight.players)}</span>
                <span aria-hidden>·</span>
                <span>{spotlight.durationMinutes} min avg</span>
                <span aria-hidden>·</span>
                <span>{spotlight.category}</span>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/login" size="lg">
                  ▶ Play now
                </ButtonLink>
                <ButtonLink href="/login" size="lg" variant="secondary">
                  Learn more
                </ButtonLink>
              </div>
            </div>
            {/* Stats panel */}
            <div className="hidden lg:flex lg:justify-end">
              <div className="grid w-64 gap-3">
                {[
                  { label: "Rating", value: `${spotlight.rating.toFixed(1)} / 5` },
                  { label: "Players", value: `${spotlight.minPlayers}–${spotlight.maxPlayers}` },
                  { label: "Avg session", value: `${spotlight.durationMinutes} min` },
                  { label: "Released", value: String(spotlight.releaseYear) },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm"
                  >
                    <span className="text-sm text-white/60">{stat.label}</span>
                    <span className="font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Testimonials ────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "KinetoFun changed family game night forever. No controllers, no setup — just wave and play.",
    name: "Jordan M.",
    title: "Parent of 3",
    avatar: "J",
    color: "from-blue-500 to-cyan-600",
    rating: 5,
  },
  {
    quote: "The gesture controls feel like actual magic. I showed it off at a party and everyone lost their minds.",
    name: "Sam K.",
    title: "Casual Gamer",
    avatar: "S",
    color: "from-purple-500 to-fuchsia-600",
    rating: 5,
  },
  {
    quote: "Leaderboards are super competitive. I spend way too much time trying to beat my friends' scores.",
    name: "Alex R.",
    title: "Competitive Player",
    avatar: "A",
    color: "from-emerald-500 to-green-600",
    rating: 5,
  },
  {
    quote: "Zero installs, no subscription fees for basic games, and it works on my old TV. Incredible.",
    name: "Pat L.",
    title: "Tech Enthusiast",
    avatar: "P",
    color: "from-amber-500 to-orange-600",
    rating: 5,
  },
];

function TestimonialsSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 bg-[#09090f] py-20">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-400">
            Community
          </p>
          <h2 className="text-3xl font-black text-white sm:text-4xl">What Players Say</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13131f] p-6 transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-900/20"
            >
              <div className="flex text-amber-400">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-white/70">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} font-bold text-white`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/40">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section: CTA ─────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 overflow-hidden bg-[#0c0c18] py-24">
      {/* decorative glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-[1600px] px-6 text-center sm:px-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-400">
          Ready to Play?
        </p>
        <h2 className="text-4xl font-black text-white sm:text-5xl lg:text-6xl">
          Join KinetoFun Today
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/60">
          Free to start. No downloads. No controllers. Just you, your screen, and a wave of your hand.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/signup" size="lg">
            Create free account
          </ButtonLink>
          <ButtonLink href="/library" size="lg" variant="secondary">
            Browse games
          </ButtonLink>
          <ButtonLink href="/login" size="lg" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

// ─── Section: Footer ──────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="relative z-10 -mx-6 sm:-mx-10 border-t border-white/10 bg-[#06060c] py-12">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-1 text-xl font-black text-white">KinetoFun</p>
            <p className="text-sm text-white/50">Gesture-ready gaming for your TV.</p>
            <div className="mt-4 flex gap-3">
              {["𝕏", "▶", "📸", "💬"].map((icon, i) => (
                <button
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm text-white/60 transition-colors hover:border-white/40 hover:text-white"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              Games
            </p>
            {["Browse Library", "Featured", "New Releases", "Multiplayer"].map((link) => (
              <Link
                key={link}
                href="/login"
                className="block py-1 text-sm text-white/60 transition-colors hover:text-white"
              >
                {link}
              </Link>
            ))}
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              Platform
            </p>
            {["Leaderboard", "Profile", "Settings", "How It Works"].map((link) => (
              <Link
                key={link}
                href="/login"
                className="block py-1 text-sm text-white/60 transition-colors hover:text-white"
              >
                {link}
              </Link>
            ))}
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              Legal
            </p>
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact"].map((link) => (
              <button
                key={link}
                className="block py-1 text-sm text-white/60 transition-colors hover:text-white"
              >
                {link}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/30 sm:flex-row">
          <p>© {new Date().getFullYear()} KinetoFun. All rights reserved.</p>
          <p>Made with ❤️ for the living room</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Landing page (logged-out) ────────────────────────────────────────────────

function LandingPage() {
  return (
    <>
      {/* Hero — interactive 3D robot + CTA */}
      <section className="relative -mx-6 -mt-8 w-screen h-screen overflow-hidden sm:-mx-10">
        {/* Robot: full-bleed background */}
        <InteractiveRobotSpline
          scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
          className="absolute inset-0 z-0 w-full h-full"
        />

        {/* Left gradient scrim — desktop: keeps left-panel text legible */}
        <div
          className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.32) 42%, transparent 66%)",
          }}
        />

        {/* Bottom gradient scrim — mobile/tablet: lifts bottom text off robot */}
        <div
          className="pointer-events-none absolute inset-0 z-10 lg:hidden"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.28) 45%, transparent 72%)",
          }}
        />

        {/* CTA — vertically centered left panel on desktop, bottom panel on mobile */}
        <div className="absolute inset-0 z-20 flex items-end lg:items-center">
          <div className="w-full px-6 pb-24 sm:px-10 lg:w-[44%] lg:pb-0 lg:pl-14">

            {/* Monospace eyebrow */}
            <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-white/40">
              // Next-gen gaming
            </p>

            {/* Headline */}
            <h1
              className="flex flex-col font-black leading-none tracking-tight text-white"
              style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)" }}
            >
              <span>Play with</span>
              <ShimmerText
                className="text-white/30 font-black leading-none tracking-tight"
                duration={2}
                delay={1}
              >
                a wave.
              </ShimmerText>
            </h1>

            {/* Subtext */}
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55 sm:text-base">
              Gesture-ready gaming for your TV. No controllers, no installs —
              just you and the screen.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/login" size="lg">
                Sign in to play
              </ButtonLink>
              <ButtonLink href="/library" size="lg" variant="secondary">
                Browse games
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1 text-white/35">
          <span className="font-mono text-[10px] uppercase tracking-widest">Scroll</span>
          <svg className="h-4 w-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      <FeaturedGamesSection />
      <PlatformFeaturesSection />
      <HowItWorksSection />
      <PopularCategoriesSection />
      <LeaderboardPreviewSection />
      <GameShowcaseSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isAuthenticated } = useSession();
  const featured = gamesService.featured();
  const spotlight = featured[0];

  const continuePlaying = useMemo<Game[]>(() => {
    if (!user) return [];
    const ids = new Set(
      sessions
        .filter((s) => s.players.includes(user.id))
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .map((s) => s.gameId),
    );
    return [...ids]
      .map((id) => allGames.find((g) => g.id === id))
      .filter((g): g is Game => Boolean(g));
  }, [user]);

  if (!isAuthenticated || !user) {
    return <LandingPage />;
  }

  return (
    <div className="space-y-12">
      {/* Hero spotlight */}
      {spotlight ? (
        <section
          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${spotlight.cover} p-8 sm:p-12`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative max-w-2xl">
            <Badge tone="default" className="mb-4 bg-black/40">
              Featured
            </Badge>
            <p className="text-sm font-medium text-zinc-200">
              {user ? `Welcome back, ${user.displayName}` : "Welcome to KinetoFun"}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white drop-shadow sm:text-6xl">
              {spotlight.title}
            </h1>
            <p className="mt-3 max-w-xl text-lg text-zinc-100/90">
              {spotlight.tagline}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-200">
              <StarRating rating={spotlight.rating} />
              <span aria-hidden>•</span>
              <span>{playersLabel(spotlight.players)}</span>
              <span aria-hidden>•</span>
              <span>{spotlight.category}</span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={`/games/${spotlight.id}/play`} size="lg">
                ▶ Play now
              </ButtonLink>
              <ButtonLink
                href={`/games/${spotlight.id}`}
                size="lg"
                variant="secondary"
              >
                More info
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      {continuePlaying.length > 0 ? (
        <GameRail title="Continue playing" games={continuePlaying} />
      ) : null}

      <GameRail title="Featured games" games={featured} />

      {CATEGORY_RAILS.map((category) => (
        <GameRail
          key={category}
          title={category}
          games={gamesService.byCategory(category)}
          subtitle="View all"
        />
      ))}

      <GameRail title="All games" games={gamesService.list()} />
    </div>
  );
}
