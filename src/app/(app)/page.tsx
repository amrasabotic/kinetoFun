"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Tv, Gamepad2, Hand, Brain, Users, Zap, Target,
  GraduationCap, Building2, Home, Trophy, Star,
  Heart, BookOpen, Check, X, Play,
  Camera, MessageCircle,
} from "lucide-react";
import { gamesService, leaderboardService } from "@/services";
import { sessions, games as allGames } from "@/mock";
import { useSession } from "@/features/auth/session-context";
import { GameRail } from "@/components/game/GameRail";
import { ButtonLink } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { motion } from "motion/react";
import { ShimmerText } from "@/components/ui/shimmer-text";
import { playersLabel } from "@/lib/format";
import type { Game, GameCategory } from "@/types";
import type { LucideIcon } from "lucide-react";

const CATEGORY_RAILS: GameCategory[] = ["Action", "Adventure", "Puzzle", "Sports"];

// ─── Shared helpers ───────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
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
  const gradient = colors[rank] ?? "from-[#1AACE0] to-[#1A2E74]";
  return (
    <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-black text-white shadow-lg`}>
      {rank}
    </span>
  );
}

// ─── Section badge pill ───────────────────────────────────────────────────────

function SectionBadge({ Icon, label, color, bg }: { Icon: LucideIcon; label: string; color: string; bg: string }) {
  return (
    <span
      className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold"
      style={{ background: bg, color }}
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

// ─── Section 1: Hero ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative -mx-6 -mt-8 w-screen min-h-screen overflow-hidden sm:-mx-10">

      {/* Two-column layout */}
      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col items-center justify-center gap-10 px-6 pb-20 pt-28 sm:px-10 lg:min-h-screen lg:flex-row lg:gap-0 lg:pt-0">

        {/* ── Left: CTA ─────────────────────────────────────────────── */}
        <div className="lg:w-[52%] xl:w-[50%]">

          {/* Live badge */}
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-[#1AACE0]/30 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#5ABB47" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#5ABB47" }} />
            </span>
            <ShimmerText className="text-[11px] font-bold uppercase tracking-widest text-[#1A2E74]" duration={3} delay={2}>
              Next-gen gaming — now live
            </ShimmerText>
          </div>

          {/* Headline */}
          <h1
            className="font-black leading-none tracking-tight"
            style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)", color: "#1A2E74" }}
          >
            <span className="block">Play with</span>
            <motion.span
              className="block"
              style={{
                color: "#1AACE0",
                background: "currentColor linear-gradient(to right, currentColor 0%, rgba(255,255,255,0.72) 40%, rgba(255,255,255,0.72) 60%, currentColor 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                backgroundRepeat: "no-repeat",
                backgroundSize: "50% 200%",
              } as React.CSSProperties}
              initial={{ backgroundPositionX: "250%" }}
              animate={{ backgroundPositionX: ["-100%", "250%"] }}
              transition={{ duration: 2.5, delay: 0.6, repeat: Infinity, repeatDelay: 2.5, ease: "linear" }}
            >
              a wave. ✋
            </motion.span>
          </h1>

          {/* Sub */}
          <p className="mt-5 max-w-sm text-sm leading-relaxed sm:text-base" style={{ color: "#5B72A8" }}>
            Gesture-ready gaming for your TV. No controllers, no installs —
            just you, your screen, and a wave of your hand.
          </p>

          {/* Stats row */}
          <div className="mt-6 flex items-center gap-5">
            <div>
              <p className="text-2xl font-black" style={{ color: "#1AACE0" }}>50+</p>
              <p className="text-xs" style={{ color: "#5B72A8" }}>Games</p>
            </div>
            <div className="h-8 w-px bg-[#C8DFFB]" />
            <div>
              <p className="text-2xl font-black" style={{ color: "#5ABB47" }}>4P</p>
              <p className="text-xs" style={{ color: "#5B72A8" }}>Co-op</p>
            </div>
            <div className="h-8 w-px bg-[#C8DFFB]" />
            <div>
              <p className="text-2xl font-black" style={{ color: "#F9B233" }}>Free</p>
              <p className="text-xs" style={{ color: "#5B72A8" }}>To Start</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              data-focusable
              className="inline-flex h-14 items-center gap-2 rounded-2xl px-8 text-lg font-black text-white transition hover:brightness-110 hover:scale-[1.02] active:scale-100 select-none focus:outline-none"
              style={{
                background: "linear-gradient(135deg, #1AACE0 0%, #1A2E74 100%)",
                boxShadow: "0 8px 32px rgba(26,172,224,0.35)",
              }}
            >
              Start Playing
            </Link>
            <ButtonLink href="/library" size="lg" variant="secondary" className="rounded-2xl">
              Browse Games →
            </ButtonLink>
          </div>
        </div>

        {/* ── Right: Kid GIF ────────────────────────────────────────── */}
        <div className="flex w-full items-center justify-center lg:w-[48%] xl:w-[50%]">
          <div className="w-full max-w-[340px] animate-float-slow sm:max-w-[420px] lg:max-w-[480px]">
            <img src="/kid.gif" alt="Kid playing" className="w-full h-auto" />
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#5B72A8" }}>Scroll</span>
        <svg className="h-4 w-4 animate-bounce" style={{ color: "#5B72A8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

// ─── Section 2: How It Works ──────────────────────────────────────────────────

type HowStep = {
  num: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  stat: string;
  statLabel: string;
};

const HOW_STEPS: HowStep[] = [
  {
    num: "01",
    Icon: Tv,
    title: "Connect",
    desc: "Open KinetoFun on any browser. Works on TVs, laptops, tablets — zero downloads, zero installs.",
    color: "#1AACE0",
    stat: "0s",
    statLabel: "setup time",
  },
  {
    num: "02",
    Icon: Gamepad2,
    title: "Pick a Game",
    desc: "Browse 50+ titles across every genre. Filter by players, mood, or category. Find your next obsession.",
    color: "#5ABB47",
    stat: "50+",
    statLabel: "games",
  },
  {
    num: "03",
    Icon: Hand,
    title: "Wave & Play",
    desc: "Jump right in with keyboard or mouse today. AI gesture controls are coming soon — magic included.",
    color: "#F9B233",
    stat: "<3s",
    statLabel: "load time",
  },
];

function HowItWorksSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-16 text-center">
          <SectionBadge Icon={Zap} label="Super simple to start" color="#1AACE0" bg="rgba(26,172,224,0.12)" />
          <h2 className="text-4xl font-black leading-tight tracking-tight text-[#1A2E74] sm:text-5xl">
            How It{" "}
            <span style={{
              background: "linear-gradient(135deg, #1AACE0, #5ABB47)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Works</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#5B72A8]">
            Three steps from zero to playing. No hardware, no friction.
          </p>
        </div>

        {/* Step cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {HOW_STEPS.map((step) => {
            const Icon = step.Icon;
            return (
              <div
                key={step.num}
                className="group relative overflow-hidden rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px)",
                  border: `1.5px solid ${step.color}35`,
                  boxShadow: `0 8px 32px ${step.color}22`,
                }}
              >
                {/* Icon circle */}
                <div
                  className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${step.color}18`, border: `1.5px solid ${step.color}40` }}
                >
                  <Icon className="h-8 w-8" style={{ color: step.color }} />
                </div>

                {/* Step label */}
                <span className="mb-2 block font-mono text-sm font-bold" style={{ color: step.color }}>
                  Step {step.num}
                </span>

                <h3 className="mb-3 text-2xl font-black text-[#1A2E74]">{step.title}</h3>
                <p className="text-sm leading-relaxed text-[#5B72A8]">{step.desc}</p>

                {/* Stat */}
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-3xl font-black tabular-nums" style={{ color: step.color }}>
                    {step.stat}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-[#5B72A8]">
                    {step.statLabel}
                  </span>
                </div>

                {/* Bottom glow bar on hover */}
                <div
                  className="absolute bottom-0 inset-x-0 h-1 origin-left scale-x-0 rounded-b-3xl transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: step.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Featured Games ────────────────────────────────────────────────

function FeaturedGamesSection() {
  const featured = gamesService.featured();
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionBadge Icon={Star} label="Handpicked for you" color="#F9B233" bg="rgba(249,178,51,0.15)" />
            <h2 className="text-4xl font-black tracking-tight text-[#1A2E74] sm:text-5xl">
              Featured{" "}
              <span style={{
                background: "linear-gradient(135deg, #F9B233, #F7267C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Games</span>
            </h2>
          </div>
          <ButtonLink
            href="/library"
            variant="secondary"
            className="self-start rounded-2xl sm:self-auto"
          >
            View all games →
          </ButtonLink>
        </div>

        {/* Scrollable card row / grid */}
        <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {featured.map((game) => (
            <FeaturedGameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedGameCard({ game }: { game: Game }) {
  return (
    <Link
      href="/login"
      data-focusable
      className="group relative w-72 flex-none snap-start overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] sm:w-auto"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        border: "1.5px solid rgba(26,172,224,0.28)",
        boxShadow: "0 8px 32px rgba(26,172,224,0.18)",
      }}
    >
      {/* Cover gradient */}
      <div className={`relative aspect-[16/9] bg-gradient-to-br ${game.cover}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2E74]/60 via-transparent to-transparent" />

        {/* Hover play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/60 bg-white/25 backdrop-blur-sm"
            style={{ boxShadow: "0 0 20px rgba(26,172,224,0.50)" }}
          >
            <PlayIcon />
          </div>
        </div>

        {/* Category tag */}
        <div className="absolute left-3 top-3">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold text-white backdrop-blur-sm"
            style={{ background: `${game.accent}cc` }}
          >
            {game.category}
          </span>
        </div>

        {/* Rating */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-full border border-[#F9B233]/40 bg-white/85 px-2.5 py-1 text-xs font-bold text-[#1A2E74] backdrop-blur-sm">
            ★ {game.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="text-lg font-black text-[#1A2E74]">{game.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-[#5B72A8]">{game.tagline}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-[#5B72A8]">{playersLabel(game.players)}</span>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold transition-colors"
            style={{ background: "rgba(26,172,224,0.12)", color: "#1AACE0" }}
          >
            Play now →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Section 4: Multiplayer ───────────────────────────────────────────────────

function MultiplayerSection() {
  return (
    <section
      className="relative z-10 -mx-6 sm:-mx-10 overflow-hidden py-24"
      style={{ background: "linear-gradient(135deg, #0C1A50 0%, #1A2E74 50%, #091440 100%)" }}
    >
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/4 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "rgba(26,172,224,0.22)" }}
        />
        <div
          className="absolute right-1/4 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "rgba(90,187,71,0.15)" }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">

          {/* Left: Text */}
          <div>
            <SectionBadge Icon={Users} label="Multiplayer Ready" color="#1AACE0" bg="rgba(26,172,224,0.20)" />

            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Play Together,{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #1AACE0, #5ABB47)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Win Together
              </span>
            </h2>

            <p className="mt-5 max-w-md text-lg text-white/55">
              Challenge up to 4 players locally or battle friends online. Every game is better with company.
            </p>

            {/* Stats trio */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { num: "4", label: "Max Players", color: "#1AACE0" },
                { num: "Live", label: "Lobbies", color: "#5ABB47" },
                { num: "0ms*", label: "Lag Goal", color: "#F9B233" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: `${s.color}12`,
                    border: `1.5px solid ${s.color}35`,
                  }}
                >
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.num}</div>
                  <div className="mt-1 text-[11px] text-white/50">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                data-focusable
                className="inline-flex h-14 items-center gap-2 rounded-2xl px-8 text-lg font-black text-white transition hover:brightness-110 hover:scale-[1.02] active:scale-100 select-none focus:outline-none"
                style={{
                  background: "linear-gradient(135deg, #1AACE0 0%, #5ABB47 100%)",
                  boxShadow: "0 8px 32px rgba(26,172,224,0.40)",
                }}
              >
                <Gamepad2 className="h-5 w-5" /> Join the fun
              </Link>
            </div>
          </div>

          {/* Right: Player visual */}
          <div className="flex items-center justify-center">
            <div className="relative h-72 w-72">
              {/* Center game controller */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-24 w-24 items-center justify-center rounded-3xl animate-float"
                style={{
                  background: "linear-gradient(135deg, #1AACE0, #5ABB47)",
                  boxShadow: "0 16px 48px rgba(26,172,224,0.50)",
                }}
              >
                <Gamepad2 className="h-12 w-12 text-white" />
              </div>

              {/* Orbiting player avatars */}
              {[
                { label: "P1", color: "#1AACE0", angle: 0 },
                { label: "P2", color: "#5ABB47", angle: 90 },
                { label: "P3", color: "#F9B233", angle: 180 },
                { label: "P4", color: "#F7267C", angle: 270 },
              ].map((player) => {
                const rad = (player.angle * Math.PI) / 180;
                const x = 50 + 40 * Math.cos(rad);
                const y = 50 + 40 * Math.sin(rad);
                return (
                  <div
                    key={player.label}
                    className="absolute flex flex-col items-center animate-float-delay"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                      animationDelay: `${(player.angle / 360) * 1.2}s`,
                    }}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 text-sm font-black text-white"
                      style={{
                        background: `${player.color}28`,
                        borderColor: `${player.color}60`,
                      }}
                    >
                      {player.label}
                    </div>
                    <span className="mt-1 text-xs font-bold" style={{ color: player.color }}>
                      {player.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 5: Why Kids Love It ─────────────────────────────────────────────

const KID_LOVE_CHIPS = [
  { text: "No Controller",      emoji: "✋", color: "#1AACE0", delay: "0s"   },
  { text: "Instant Play",       emoji: "⚡", color: "#F9B233", delay: "0.3s" },
  { text: "Multiplayer Fun",    emoji: "👥", color: "#1AACE0", delay: "0.6s" },
  { text: "Safe for Kids",      emoji: "🛡️", color: "#5ABB47", delay: "0.9s" },
  { text: "Learn While Playing",emoji: "🧠", color: "#F7267C", delay: "1.2s" },
  { text: "Compete Globally",   emoji: "🌍", color: "#1AACE0", delay: "1.5s" },
  { text: "Family Game Night",  emoji: "🏠", color: "#F9B233", delay: "0.4s" },
  { text: "Gesture Magic",      emoji: "🪄", color: "#1AACE0", delay: "0.7s" },
  { text: "Zero Setup",         emoji: "🚀", color: "#5ABB47", delay: "1.0s" },
  { text: "Leaderboard Hero",   emoji: "🏆", color: "#F7267C", delay: "1.3s" },
  { text: "Colorful Worlds",    emoji: "🎨", color: "#1AACE0", delay: "0.2s" },
  { text: "Sound Effects",      emoji: "🎵", color: "#F9B233", delay: "0.8s" },
] as const;

function WhyKidsLoveItSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 overflow-hidden py-24">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(26,172,224,0.12)" }}
        />
        <div
          className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(247,38,124,0.10)" }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-16 text-center">
          <SectionBadge Icon={Heart} label="Kids absolutely love it" color="#F7267C" bg="rgba(247,38,124,0.12)" />
          <h2 className="text-4xl font-black leading-tight tracking-tight text-[#1A2E74] sm:text-5xl">
            Why Kids{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #F7267C, #F9B233)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Love It
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#5B72A8]">
            Designed for joy, built for engagement. Every feature made with kids and families in mind.
          </p>
        </div>

        {/* Floating chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {KID_LOVE_CHIPS.map((chip) => (
            <span
              key={chip.text}
              className="inline-flex cursor-default select-none items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform duration-200 hover:scale-110 animate-float"
              style={{
                background: `${chip.color}15`,
                color: chip.color,
                animationDelay: chip.delay,
                border: `1.5px solid ${chip.color}35`,
                boxShadow: `0 4px 16px ${chip.color}20`,
              }}
            >
              <span className="text-lg">{chip.emoji}</span>
              {chip.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 6: Educational Benefits ─────────────────────────────────────────

type BenefitItem = {
  Icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
};

const EDUCATIONAL_BENEFITS: BenefitItem[] = [
  {
    Icon: Brain,
    title: "Cognitive Development",
    desc: "Puzzle and strategy games boost problem-solving, spatial reasoning, and critical thinking.",
    color: "#1AACE0",
  },
  {
    Icon: Users,
    title: "Social Skills",
    desc: "Multiplayer games teach cooperation, communication, and healthy competition between players.",
    color: "#5ABB47",
  },
  {
    Icon: Zap,
    title: "Reflexes & Coordination",
    desc: "Gesture-based and action games improve motor skills, reaction time, and hand-eye coordination.",
    color: "#F9B233",
  },
  {
    Icon: Target,
    title: "Focus & Resilience",
    desc: "Engaging gameplay develops sustained attention, goal-setting habits, and a growth mindset.",
    color: "#F7267C",
  },
];

function EducationalBenefitsSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-14 text-center">
          <SectionBadge Icon={BookOpen} label="More than just fun" color="#5ABB47" bg="rgba(90,187,71,0.12)" />
          <h2 className="text-4xl font-black leading-tight tracking-tight text-[#1A2E74] sm:text-5xl">
            Educational{" "}
            <span style={{
              background: "linear-gradient(135deg, #5ABB47, #1AACE0)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Benefits</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#5B72A8]">
            KinetoFun games are crafted to develop real skills while kids play and explore.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EDUCATIONAL_BENEFITS.map((benefit) => {
            const Icon = benefit.Icon;
            return (
              <div
                key={benefit.title}
                className="group rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px)",
                  border: `1.5px solid ${benefit.color}35`,
                  boxShadow: `0 8px 32px ${benefit.color}20`,
                }}
              >
                {/* Icon */}
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${benefit.color}18`, border: `1.5px solid ${benefit.color}40` }}
                >
                  <Icon className="h-8 w-8" style={{ color: benefit.color }} />
                </div>

                <h3 className="mb-3 text-xl font-black text-[#1A2E74]">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-[#5B72A8]">{benefit.desc}</p>

                {/* Grow underline */}
                <div
                  className="mt-6 h-1 w-10 rounded-full transition-all duration-500 group-hover:w-full"
                  style={{ background: benefit.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Section 7: Perfect For ───────────────────────────────────────────────────

type PerfectForItem = {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  desc: string;
  color: string;
  features: readonly string[];
};

const PERFECT_FOR: PerfectForItem[] = [
  {
    Icon: GraduationCap,
    title: "Schools",
    subtitle: "Educational Gaming",
    desc: "Transform PE class, recess, and after-school programs with games that get kids moving and thinking.",
    color: "#1AACE0",
    features: ["Curriculum-linked games", "Up to 30 players", "No extra devices needed", "Teacher dashboard soon"],
  },
  {
    Icon: Building2,
    title: "Hotels",
    subtitle: "Guest Entertainment",
    desc: "Elevate your lobby and game room with premium interactive entertainment guests will remember.",
    color: "#5ABB47",
    features: ["Works on any smart TV", "Family-friendly content", "Zero maintenance", "24/7 uptime"],
  },
  {
    Icon: Home,
    title: "Families",
    subtitle: "Home Game Night",
    desc: "Bring the whole family together for epic game nights. No controllers to fight over — everyone plays!",
    color: "#F9B233",
    features: ["All ages welcome", "Co-op and competitive", "Gesture controls soon", "Free to start"],
  },
];

function PerfectForSection() {
  return (
    <section className="relative z-10 -mx-6 sm:-mx-10 py-24">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">

        {/* Header */}
        <div className="mb-14 text-center">
          <SectionBadge Icon={Target} label="Built for every setting" color="#1AACE0" bg="rgba(26,172,224,0.12)" />
          <h2 className="text-4xl font-black leading-tight tracking-tight text-[#1A2E74] sm:text-5xl">
            Perfect{" "}
            <span style={{
              background: "linear-gradient(135deg, #1AACE0, #F7267C)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>For</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#5B72A8]">
            From classrooms to hotel lobbies to living rooms — KinetoFun fits every space.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {PERFECT_FOR.map((item) => {
            const Icon = item.Icon;
            return (
              <div
                key={item.title}
                className="group overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(20px)",
                  border: `1.5px solid ${item.color}38`,
                  boxShadow: `0 8px 36px ${item.color}22`,
                }}
              >
                <div className="p-8">
                  {/* Icon */}
                  <div
                    className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${item.color}18`, border: `1.5px solid ${item.color}45` }}
                  >
                    <Icon className="h-8 w-8" style={{ color: item.color }} />
                  </div>

                  <span
                    className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: `${item.color}18`, color: item.color }}
                  >
                    {item.subtitle}
                  </span>

                  <h3 className="mb-3 text-2xl font-black text-[#1A2E74]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[#5B72A8]">{item.desc}</p>

                  {/* Feature list */}
                  <ul className="mt-6 space-y-2.5">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-[#1A2E74]">
                        <span
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: item.color }}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Section 8: Leaderboard Preview ──────────────────────────────────────────

function LeaderboardPreviewSection() {
  const topPlayers = leaderboardService.global(5);
  const fallbackGradients = [
    "from-[#1AACE0] to-[#1A2E74]",
    "from-[#5ABB47] to-[#1A2E74]",
    "from-[#F9B233] to-[#F7267C]",
    "from-[#F7267C] to-[#1A2E74]",
    "from-[#1AACE0] to-[#5ABB47]",
  ];
  return (
    <section
      className="relative z-10 -mx-6 sm:-mx-10 overflow-hidden py-24"
      style={{ background: "linear-gradient(135deg, #0C1A50 0%, #1A2E74 100%)" }}
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[500px] w-[500px] rounded-full blur-[100px]"
          style={{ background: "rgba(26,172,224,0.18)" }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="mx-auto max-w-2xl">

          {/* Header */}
          <div className="mb-10 text-center">
            <SectionBadge Icon={Trophy} label="Hall of Fame" color="#F9B233" bg="rgba(249,178,51,0.18)" />
            <h2 className="text-4xl font-black text-white sm:text-5xl">Top Players</h2>
            <p className="mt-3 text-white/45">Global rankings — best single score per player.</p>
          </div>

          {/* Table card */}
          <div
            className="overflow-hidden rounded-3xl"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
              border: "1.5px solid rgba(26,172,224,0.30)",
              boxShadow: "0 8px 40px rgba(26,172,224,0.18)",
            }}
          >
            {topPlayers.map((entry, i) => (
              <div
                key={entry.user.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors duration-200 hover:bg-white/[0.05] ${
                  i < topPlayers.length - 1 ? "border-b border-white/[0.08]" : ""
                }`}
              >
                <RankBadge rank={entry.rank} />
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${entry.user.avatarColor || fallbackGradients[i % fallbackGradients.length]} font-bold text-white shadow`}
                >
                  {entry.user.displayName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{entry.user.displayName}</p>
                  <p className="text-xs text-white/35">Level {entry.user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-black tabular-nums" style={{ color: "#5ABB47" }}>
                    {entry.score.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/35">pts</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/login"
              data-focusable
              className="inline-flex h-14 items-center gap-2 rounded-2xl px-8 text-base font-black text-white transition hover:brightness-110 hover:scale-[1.02] active:scale-100 select-none focus:outline-none"
              style={{
                background: "linear-gradient(135deg, #1AACE0 0%, #5ABB47 100%)",
                boxShadow: "0 8px 32px rgba(26,172,224,0.40)",
              }}
            >
              <Trophy className="h-5 w-5" /> View Full Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section 9: Final CTA ─────────────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section
      className="relative z-10 -mx-6 sm:-mx-10 overflow-hidden py-28"
      style={{
        background: "linear-gradient(135deg, #1AACE0 0%, #5ABB47 50%, #F9B233 100%)",
      }}
    >
      {/* Dot texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Shine */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(255,255,255,0.06) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1600px] px-6 sm:px-10 text-center">
        <div className="mb-6 animate-float-slow">
          <Gamepad2 className="mx-auto h-16 w-16 text-white drop-shadow-lg" />
        </div>

        <h2 className="text-4xl font-black text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
          Ready to Play?
        </h2>

        <p className="mx-auto mt-5 max-w-lg text-lg text-white/85">
          Join thousands of players already gaming on KinetoFun.
          Free to start. No downloads. No controllers required.
        </p>

        {/* Social proof chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {["⭐ 4.8/5 Rating", "🎮 50+ Games", "👥 Free to Play", "📺 Any Smart TV"].map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            data-focusable
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-lg font-black transition hover:bg-white/90 hover:scale-[1.02] active:scale-100 select-none focus:outline-none"
            style={{ color: "#1A2E74", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
          >
            🎮 Create Free Account
          </Link>
          <ButtonLink href="/library" size="lg" variant="secondary" className="rounded-2xl border-white/40 bg-white/15 text-white hover:bg-white/25">
            Browse Games →
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const socials = [
    { Icon: X, label: "X / Twitter" },
    { Icon: Play, label: "YouTube" },
    { Icon: Camera, label: "Instagram" },
    { Icon: MessageCircle, label: "Discord" },
  ];

  return (
    <footer className="relative z-10 -mx-6 sm:-mx-10 border-t border-white/5 py-12" style={{ background: "#091440" }}>
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <p className="mb-1 text-xl font-black text-white">KinetoFun</p>
            <p className="text-sm text-white/40">Gesture-ready gaming for your TV.</p>
            <div className="mt-4 flex gap-3">
              {socials.map(({ Icon, label }) => {
                const I = Icon;
                return (
                  <button
                    key={label}
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/45 transition-all hover:border-white/30 hover:text-white"
                  >
                    <I className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#1AACE0" }}>
              Games
            </p>
            {["Browse Library", "Featured", "New Releases", "Multiplayer"].map((link) => (
              <Link key={link} href="/login" className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {link}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#5ABB47" }}>
              Platform
            </p>
            {["Leaderboard", "Profile", "Settings", "How It Works"].map((link) => (
              <Link key={link} href="/login" className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {link}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#F9B233" }}>
              Legal
            </p>
            {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact"].map((link) => (
              <button key={link} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {link}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/22 sm:flex-row">
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
      <HeroSection />
      <HowItWorksSection />
      <FeaturedGamesSection />
      <MultiplayerSection />
      <WhyKidsLoveItSection />
      <EducationalBenefitsSection />
      <PerfectForSection />
      <LeaderboardPreviewSection />
      <FinalCtaSection />
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
