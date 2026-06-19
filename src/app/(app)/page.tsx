"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles, ShieldCheck, ArrowRight, Play, BookOpen, Palette, Map, Rocket,
  Star, TrendingUp, BadgeCheck, Users, Trophy, Activity, Compass, Gamepad2,
  Gift, Ticket, Quote, ChevronUp, ChevronLeft, ChevronRight, X, Camera, MessageCircle,
} from "lucide-react";
import { useGames } from "@/features/games/useGames";
import { useContinuePlaying } from "@/features/sessions/useContinuePlaying";
import { useLeaderboard } from "@/features/scores/useLeaderboard";
import { selectFeatured, selectByCategory } from "@/services/games.service";
import { useSession } from "@/features/auth/session-context";
import { GameRail } from "@/components/game/GameRail";
import { ButtonLink } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { playersLabel } from "@/lib/format";
import type { Game, GameCategory } from "@/types";
import type { LucideIcon } from "lucide-react";

const CATEGORY_RAILS: GameCategory[] = ["Action", "Adventure", "Puzzle", "Sports"];

// ─── ABCmouse-inspired palette (scoped to this landing page only) ─────────────
const C = {
  blue:   "#2F80FF",
  sky:    "#EAF4FF",
  yellow: "#FFD84D",
  orange: "#FF8A3D",
  green:  "#5BD97B",
  pink:   "#FF5FA2",
  purple: "#8A5CFF",
  ink:    "#16356B", // deep-blue heading text
  inkSoft:"#5B77A8", // muted body text
};

// ─── Shared decorative + structural helpers ───────────────────────────────────

/** Soft SVG wave that bleeds one section's bottom into the next section's color. */
function WaveDivider({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] leading-[0]" aria-hidden>
      <svg className="block h-[44px] w-full sm:h-[72px]" viewBox="0 0 1440 72" preserveAspectRatio="none">
        <path
          fill={color}
          d="M0,34 C160,72 320,72 480,48 C680,18 760,6 960,30 C1120,49 1280,66 1440,38 L1440,72 L0,72 Z"
        />
      </svg>
    </div>
  );
}

/** A floating rounded bubble (rotation on the wrapper, float on the inner node so
 *  the two transforms never fight each other). */
function FloatBubble({
  children, className, bg, rotate = 0, delay = "0s", anim = "animate-float",
}: {
  children: React.ReactNode; className?: string; bg: string;
  rotate?: number; delay?: string; anim?: string;
}) {
  return (
    <div className={cn("absolute", className)} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl font-display font-extrabold text-white shadow-lg",
          anim,
        )}
        style={{ background: bg, animationDelay: delay, width: "100%", height: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

function SectionHeading({
  Icon, eyebrow, eyebrowColor, title, highlight, highlightColor, subtitle, dark,
}: {
  Icon: LucideIcon; eyebrow: string; eyebrowColor: string;
  title: string; highlight?: string; highlightColor?: string;
  subtitle?: string; dark?: boolean;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
      <span
        className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-extrabold"
        style={{
          background: dark ? "rgba(255,255,255,0.18)" : `${eyebrowColor}22`,
          color: dark ? "#fff" : eyebrowColor,
        }}
      >
        <Icon className="h-4 w-4" />
        {eyebrow}
      </span>
      <h2 className="font-display text-[2rem] leading-[1.1] sm:text-5xl" style={{ color: dark ? "#fff" : C.ink }}>
        {title}
        {highlight ? (
          <>{" "}<span style={{ color: highlightColor ?? C.blue }}>{highlight}</span></>
        ) : null}
      </h2>
      {subtitle ? (
        <p
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg"
          style={{ color: dark ? "rgba(255,255,255,0.88)" : C.inkSoft }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function MedalBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "linear-gradient(135deg,#FFD84D,#FF8A3D)",
    2: "linear-gradient(135deg,#CFE0F5,#9BB4D6)",
    3: "linear-gradient(135deg,#FFB37A,#FF8A3D)",
  };
  return (
    <span
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold text-white shadow"
      style={{ background: colors[rank] ?? `linear-gradient(135deg,${C.blue},${C.purple})` }}
    >
      {rank}
    </span>
  );
}

// ─── Section 1: Hero ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative -mx-6 -mt-8 overflow-hidden sm:-mx-10"
      style={{ background: "linear-gradient(180deg,#EAF4FF 0%,#D6E8FF 58%,#EDF5FF 100%)" }}
    >
      <div className="relative z-10 mx-auto flex min-h-[86vh] max-w-[1600px] flex-col items-center gap-10 px-6 pb-28 pt-28 sm:px-10 lg:flex-row lg:gap-6 lg:pt-32">

        {/* ── Text (right on desktop, first on mobile so the CTA shows early) ── */}
        <div className="w-full text-center lg:order-2 lg:w-1/2 lg:text-left">
          {/* <span
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold shadow-sm"
            style={{ color: C.blue }}
          >
            <Sparkles className="h-4 w-4" style={{ color: C.yellow }} />
            GAME-BASED LEARNING · AGES 2–8
          </span> */}

          <h1 className="font-display text-[2.6rem] leading-[1.04] sm:text-6xl lg:text-[4.2rem]" style={{ color: C.ink }}>
            Play Real Games.{" "}
            <span style={{ color: C.pink }}>Build Real Skills.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed lg:mx-0" style={{ color: C.inkSoft }}>
            Interactive worlds. Skill-based levels. Rewards kids actually want to earn.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link
              href="/signup"
              data-focusable
              className="group inline-flex h-16 w-full items-center justify-center gap-2 rounded-full px-9 text-lg font-extrabold transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 sm:w-auto focus:outline-none"
              style={{ background: C.yellow, color: C.ink, boxShadow: "0 12px 28px rgba(255,170,40,0.45)" }}
            >
              Try FREE for 30 Days
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/library"
              data-focusable
              className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full border-2 bg-white px-7 text-lg font-extrabold transition hover:-translate-y-0.5 active:translate-y-0 sm:w-auto focus:outline-none"
              style={{ borderColor: `${C.blue}40`, color: C.blue }}
            >
              <Play className="h-5 w-5 fill-current" />
              Explore Games
            </Link>
          </div>

          {/* Reassurance */}
          {/* <p className="mt-5 flex items-center justify-center gap-2 text-sm font-bold lg:justify-start" style={{ color: C.inkSoft }}>
            <ShieldCheck className="h-4 w-4" style={{ color: C.green }} />
            No credit card required · Cancel anytime
          </p> */}

          {/* Trust row */}
          {/* <div className="mt-7 flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex -space-x-2.5">
              {[C.blue, C.green, C.pink, C.purple, C.orange].map((c) => (
                <span key={c} className="h-9 w-9 rounded-full border-[3px] border-white" style={{ background: c }} />
              ))}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4" style={{ fill: C.yellow, color: C.yellow }} />
                ))}
              </div>
              <p className="text-xs font-bold" style={{ color: C.inkSoft }}>Trusted by thousands of families worldwide</p>
            </div>
          </div> */}
        </div>

        {/* ── Mascot / illustration (left on desktop) ── */}
        <div className="relative flex w-full items-center justify-center lg:order-1 lg:w-1/2">
          <div className="relative w-full max-w-[440px]">
            {/* Soft blob backdrop */}
            {/* <div
              className="absolute left-1/2 top-1/2 h-[112%] w-[112%] -translate-x-1/2 -translate-y-1/2 rounded-[46%_54%_52%_48%/52%_46%_54%_48%] animate-float-slow"
              style={{ background: "linear-gradient(135deg,#BFE0FF,#D9CCFF)" }}
              aria-hidden
            /> */}
            {/* Mascot card */}
            {/* <div className="relative overflow-hidden rounded-[2.4rem] border-[6px] border-white bg-white/70 shadow-[0_30px_70px_rgba(47,128,255,0.3)]"> */}
              {/* <img src="/kid.gif" alt="A happy child learning and playing" className="h-auto w-full" /> */}
              <img src="/kineto-hero.png" alt="A happy child learning and playing" className="h-auto w-full scale-230 origin-center pointer-events-none"  />

            {/* </div> */}

            {/* Floating educational icons */}
             <FloatBubble bg={C.blue} rotate={-10} delay="0s" className="left-[-6%] top-[12%] h-10 w-10 text-2xl">A</FloatBubble>
            <FloatBubble bg={C.green} rotate={8} delay="0.6s" className="right-[-7%] top-[6%] h-10 w-10 text-2xl">1</FloatBubble>
            <FloatBubble bg={C.pink} rotate={-6} delay="0.3s" anim="animate-float-delay" className="bottom-[16%] left-[-9%] h-10 w-10 text-xl">★</FloatBubble>
            <FloatBubble bg={C.purple} rotate={10} delay="0.9s" anim="animate-float-delay" className="bottom-[8%] right-[-6%] h-10 w-10 text-2xl">🎨</FloatBubble>
            {/* <FloatBubble bg={C.orange} rotate={-4} delay="1.2s" className="right-[14%] top-[-7%] h-12 w-12 text-xl">123</FloatBubble>  */}
          </div>
        </div>
      </div>

      <WaveDivider color="#FFFFFF" />
    </section>
  );
}

// ─── Section 2: Category nav strip ────────────────────────────────────────────

const CATEGORIES = [
  { label: "Reading",      emoji: "📖", color: C.blue },
  { label: "Math",         emoji: "➗", color: C.green },
  { label: "Science",      emoji: "🔬", color: C.purple },
  { label: "Art & Colors", emoji: "🎨", color: C.pink },
  { label: "Music",        emoji: "🎵", color: C.orange },
] as const;

function CategoryStrip() {
  return (
    <section className="relative -mx-6 bg-white sm:-mx-10">
      <div className="mx-auto -mt-10 max-w-[1100px] px-6 sm:px-10">
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-[2rem] border border-[#E4EEFC] bg-white p-5 shadow-[0_18px_50px_rgba(47,128,255,0.16)] sm:gap-4">
          <span className="hidden text-sm font-extrabold sm:block" style={{ color: C.inkSoft }}>
            Pick a world:
          </span>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href="/library"
              data-focusable
              className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-105 active:translate-y-0 focus:outline-none"
              style={{ background: cat.color, boxShadow: `0 8px 18px ${cat.color}55` }}
            >
              <span className="text-lg transition-transform duration-200 group-hover:scale-125">{cat.emoji}</span>
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Educational Excellence ────────────────────────────────────────

function EducationalExcellenceSection() {
  return (
    <section
      className="relative -mx-6 overflow-hidden py-20 sm:-mx-10 sm:py-28"
      style={{ background: "linear-gradient(180deg,#FFFFFF 0%,#EAF4FF 100%)" }}
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10">
        <SectionHeading
          Icon={Sparkles}
          eyebrow="GAME WORLDS · REAL SKILLS"
          eyebrowColor={C.blue}
          title="Where Every Game"
          highlight="Teaches Something Real"
          highlightColor={C.pink}
          subtitle="KinetoFun is a game universe where reading, math, science and art are embedded in actual gameplay — not worksheets."
        />

        {/* Preview mockup */}
        <div className="relative mx-auto max-w-3xl">
          {/* floating shapes around the frame */}
          <FloatBubble bg={C.yellow} rotate={-12} className="left-[-4%] top-[-6%] h-14 w-14 text-2xl">★</FloatBubble>
          <FloatBubble bg={C.green} rotate={10} delay="0.5s" className="right-[-5%] top-[18%] h-12 w-12 text-xl">✓</FloatBubble>
          <FloatBubble bg={C.purple} rotate={-8} delay="0.9s" anim="animate-float-delay" className="bottom-[-6%] left-[10%] h-12 w-12 text-xl">🚀</FloatBubble>

          <div className="relative overflow-hidden rounded-[2rem] border-[7px] border-white bg-white shadow-[0_36px_90px_rgba(47,128,255,0.28)]">
            {/* browser chrome */}
            <div className="flex items-center gap-1.5 px-5 py-3" style={{ background: "#F2F7FF" }}>
              <span className="h-3 w-3 rounded-full" style={{ background: C.pink }} />
              <span className="h-3 w-3 rounded-full" style={{ background: C.yellow }} />
              <span className="h-3 w-3 rounded-full" style={{ background: C.green }} />
              <span className="ml-3 h-5 flex-1 rounded-full" style={{ background: "#E1ECFB" }} />
            </div>
            {/* screen */}
            <div className="relative aspect-video" style={{ background: "linear-gradient(135deg,#2F80FF 0%,#5BD97B 100%)" }}>
              {/* playful scene */}
              <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)", backgroundSize: "26px 26px" }} />
              <div className="absolute left-[14%] top-[20%] text-5xl animate-float">🦊</div>
              <div className="absolute right-[16%] top-[24%] text-4xl animate-float-delay">🎈</div>
              <div className="absolute bottom-[18%] left-[24%] text-4xl animate-bob">🔤</div>
              <div className="absolute bottom-[22%] right-[22%] text-4xl animate-float-slow">🧩</div>
              {/* play button */}
              <Link
                href="/library"
                data-focusable
                aria-label="Explore the games"
                className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-2xl transition-transform duration-200 hover:scale-110 focus:outline-none"
              >
                <Play className="ml-1 h-9 w-9" style={{ fill: C.blue, color: C.blue }} />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <WaveDivider color="#FFFFFF" />
    </section>
  );
}

// ─── Section 4: Feature grid (alternating) ────────────────────────────────────

type Feature = {
  Icon: LucideIcon; eyebrow: string; title: string; desc: string;
  color: string; emoji: string; cta: string;
};

const FEATURES: Feature[] = [
  {
    Icon: BookOpen, eyebrow: "Skill Worlds", emoji: "📚",
    title: "12+ Skill Worlds. One Epic Journey.",
    desc: "From alphabet islands to math dungeons — each world targets a real skill set. Kids progress through levels, not pages.",
    color: C.blue, cta: "Explore the worlds",
  },
  {
    Icon: Palette, eyebrow: "Designed to Hook", emoji: "🎨",
    title: "Games Kids Actually Want to Play",
    desc: "Designed from the ground up for kids — vivid characters, satisfying sound effects, and game mechanics that feel genuinely fun to play.",
    color: C.pink, cta: "See what's inside",
  },
  {
    Icon: Map, eyebrow: "Your Progression", emoji: "🧭",
    title: "Your Child's Skill Path, Built as They Play",
    desc: "Master a level → unlock the next. Struggle → the game adjusts. Every child gets a different path because every child plays differently.",
    color: C.green, cta: "How progression works",
  },
];

function FeatureIllustration({ feature }: { feature: Feature }) {
  const { Icon, emoji, color } = feature;
  return (
    <div className="relative flex items-center justify-center py-6">
      {/* blob */}
      <div
        className="relative flex h-64 w-64 items-center justify-center rounded-[46%_54%_56%_44%/52%_48%_52%_48%] sm:h-72 sm:w-72 animate-float-slow"
        style={{ background: `linear-gradient(135deg,${color}26,${color}12)` }}
      >
        <div className="text-7xl sm:text-8xl animate-bob">{emoji}</div>
        <div
          className="absolute -bottom-2 left-6 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{ background: color }}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <FloatBubble bg={C.yellow} rotate={-10} className="right-4 top-2 h-11 w-11 text-lg">★</FloatBubble>
    </div>
  );
}

function FeatureRow({ feature, reverse, children }: { feature: Feature; reverse?: boolean; children?: React.ReactNode }) {
  const { Icon, eyebrow, title, desc, color, cta } = feature;
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      {/* illustration */}
      <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>
        {children ?? <FeatureIllustration feature={feature} />}
      </div>
      {/* copy */}
      <div className={cn("text-center lg:text-left", reverse ? "lg:order-1" : "lg:order-2")}>
        <span
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide"
          style={{ background: `${color}1f`, color }}
        >
          <Icon className="h-4 w-4" />
          {eyebrow}
        </span>
        <h3 className="font-display text-3xl leading-tight sm:text-4xl" style={{ color: C.ink }}>{title}</h3>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed lg:mx-0" style={{ color: C.inkSoft }}>{desc}</p>
        <Link
          href="/library"
          data-focusable
          className="group mt-6 inline-flex items-center gap-2 text-base font-extrabold transition focus:outline-none"
          style={{ color }}
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

/** Real games rendered as explorable "worlds" — keeps the live useGames() feature. */
function WorldCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.id}`}
      data-focusable
      className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-white bg-white shadow-[0_12px_32px_rgba(47,128,255,0.16)] transition-transform duration-300 hover:-translate-y-1.5 focus:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {game.coverImage ? (
          <Image src={game.coverImage} alt={game.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width:768px) 50vw, 220px" />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", game.cover)} />
        )}
        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white"
          style={{ background: `${game.accent ?? C.blue}dd` }}
        >
          {game.category}
        </span>
        <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-extrabold" style={{ color: C.ink }}>
          <Star className="h-3 w-3" style={{ fill: C.yellow, color: C.yellow }} />
          {game.rating.toFixed(1)}
        </span>
      </div>
      <div className="p-3">
        <h4 className="truncate font-display text-sm font-extrabold" style={{ color: C.ink }}>{game.title}</h4>
        <p className="mt-0.5 text-[11px] font-bold" style={{ color: C.inkSoft }}>{playersLabel(game.players)}</p>
      </div>
    </Link>
  );
}

function WorldsIllustration() {
  const { games } = useGames();
  const pool = selectFeatured(games);
  const worlds = (pool.length ? pool : games).slice(0, 4);
  return (
    <div className="relative">
      <FloatBubble bg={C.purple} rotate={-8} className="left-[-3%] top-[-7%] h-12 w-12 text-xl">🌍</FloatBubble>
      {worlds.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {worlds.map((game) => <WorldCard key={game.id} game={game} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-3xl border-2 border-white bg-[#E4EEFC]" />
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureGridSection() {
  const worldsFeature: Feature = {
    Icon: Rocket, eyebrow: "Game Library", emoji: "🌍",
    title: "New Game Worlds Unlock as They Grow",
    desc: "Every world is a real playable game — puzzle, action, arcade, adventure. Beat the levels, unlock what's next.",
    color: C.purple, cta: "Browse all game worlds",
  };
  return (
    <section className="relative -mx-6 overflow-hidden bg-white py-20 sm:-mx-10 sm:py-28">
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-20 px-6 sm:space-y-28 sm:px-10">
        <SectionHeading
          Icon={BookOpen}
          eyebrow="WHAT MAKES KINETOFUN DIFFERENT"
          eyebrowColor={C.green}
          title="A Game Platform Built"
          highlight="to Grow Real Skills"
          highlightColor={C.blue}
          subtitle="Four things that turn screen time into skill time."
        />
        <FeatureRow feature={FEATURES[0]} />
        <FeatureRow feature={FEATURES[1]} reverse />
        <FeatureRow feature={FEATURES[2]} />
        <FeatureRow feature={worldsFeature} reverse>
          <WorldsIllustration />
        </FeatureRow>
      </div>
      <WaveDivider color="#E3F0FF" />
    </section>
  );
}

// ─── Section 5: Proven Results ────────────────────────────────────────────────

const RESULT_BARS = [
  { label: "Reading",    before: 36, after: 80, color: C.blue },
  { label: "Math",       before: 30, after: 74, color: C.green },
  { label: "Confidence", before: 42, after: 90, color: C.purple },
];

function StarLearners() {
  const { entries, loading } = useLeaderboard();
  const top = entries.slice(0, 4);
  return (
    <div className="rounded-[2rem] border-2 border-white bg-white p-6 shadow-[0_18px_50px_rgba(47,128,255,0.18)]">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5" style={{ color: C.orange }} />
        <h3 className="font-display text-xl font-extrabold" style={{ color: C.ink }}>Star Learners This Week</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-2xl bg-[#EAF2FD]" />
          ))}
        </div>
      ) : top.length > 0 ? (
        <ul className="space-y-2">
          {top.map((entry) => (
            <li key={entry.user.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: "#F4F9FF" }}>
              <MedalBadge rank={entry.rank} />
              <span className="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-extrabold text-white" style={{ background: `linear-gradient(135deg,${C.blue},${C.purple})` }}>
                {entry.user.displayName[0]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-extrabold" style={{ color: C.ink }}>{entry.user.displayName}</p>
                <p className="text-[11px] font-bold" style={{ color: C.inkSoft }}>Level {entry.user.level}</p>
              </div>
              <span className="flex items-center gap-1 font-display text-sm font-extrabold" style={{ color: C.green }}>
                <Star className="h-3.5 w-3.5" style={{ fill: C.yellow, color: C.yellow }} />
                {entry.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-[#F4F9FF] px-4 py-6 text-center text-sm font-bold" style={{ color: C.inkSoft }}>
          Be the first on the board — start your first game today!
        </p>
      )}
    </div>
  );
}

function ProvenResultsSection() {
  return (
    <section
      className="relative -mx-6 overflow-hidden py-20 sm:-mx-10 sm:py-28"
      style={{ background: "linear-gradient(160deg,#E3F0FF 0%,#D2E6FF 100%)" }}
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10">
        <SectionHeading
          Icon={TrendingUp}
          eyebrow="PROVEN RESULTS"
          eyebrowColor={C.blue}
          title="Real Progress You Can"
          highlight="Actually See"
          highlightColor={C.pink}
          subtitle="Kids who play KinetoFun games build skills that show up in the real world."
        />

        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          {/* Bar chart card */}
          <div className="rounded-[2rem] border-2 border-white bg-white p-6 shadow-[0_18px_50px_rgba(47,128,255,0.18)] sm:p-8">
            <div className="mb-6 flex items-end gap-3">
              <span className="font-display text-5xl font-extrabold" style={{ color: C.blue }}>2×</span>
              <p className="pb-1.5 text-sm font-bold leading-snug" style={{ color: C.inkSoft }}>
                Kids using KinetoFun show 2× faster skill gains in reading and math.
              </p>
            </div>
            <div className="flex h-56 items-end justify-around gap-4 rounded-2xl px-2 pt-4" style={{ background: "#F4F9FF" }}>
              {RESULT_BARS.map((bar) => (
                <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="flex h-full w-full items-end justify-center gap-1.5">
                    <div className="w-1/2 rounded-t-lg" style={{ height: `${bar.before}%`, background: "#CDDDF2" }} title="Before" />
                    <div className="w-1/2 rounded-t-lg animate-grow-up" style={{ height: `${bar.after}%`, background: bar.color }} title="With KinetoFun" />
                  </div>
                  <span className="text-xs font-extrabold" style={{ color: C.ink }}>{bar.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-5 text-xs font-bold" style={{ color: C.inkSoft }}>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "#CDDDF2" }} /> Before</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: C.blue }} /> With KinetoFun</span>
            </div>
          </div>

          {/* Star learners (real leaderboard data) */}
          <StarLearners />
        </div>

        {/* Claim chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {[
            { Icon: BadgeCheck, label: "Skills built through real gameplay", color: C.blue },
            { Icon: Users, label: "Trusted by thousands of families", color: C.green },
            { Icon: Star, label: "4.8 / 5 average rating", color: C.orange },
          ].map(({ Icon, label, color }) => (
            <span key={label} className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-white px-4 py-2 text-sm font-extrabold shadow-sm" style={{ color: C.ink }}>
              <Icon className="h-4 w-4" style={{ color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <WaveDivider color="#FFFFFF" />
    </section>
  );
}

// ─── Section 6: Learning system overview ──────────────────────────────────────

const LEARNING_TILES: { Icon: LucideIcon; title: string; desc: string; color: string; image: string }[] = [
  { Icon: Activity,    title: "Track Every Level Up",      desc: "See which worlds your child conquered, which skills they've earned, and what's unlocking next.", color: C.blue,   image: "/first-game.png" },
  { Icon: Compass,     title: "Levels That Adapt to Them", desc: "Games adjust difficulty in real time — staying challenging without frustrating. Always in the zone.", color: C.green,  image: "/second-game.png" },
  { Icon: Gamepad2,    title: "Tap, Play, Master",         desc: "Drag, match, tap, build — real game mechanics that burn skills into memory through repetition that doesn't feel like repetition.", color: C.pink,   image: "/third-game.png" },
  { Icon: ShieldCheck, title: "Safe & Ad-Free",            desc: "Zero ads, zero strangers, zero random videos. Just a walled game world built for kids.", color: C.purple, image: "/fourth-game.png" },
];

function LearningSystemSection() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = LEARNING_TILES.length;

  const navigate = (newIdx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setIdx(newIdx);
      setVisible(true);
      timerRef.current = null;
    }, 180);
  };

  const prev = () => navigate((idx - 1 + total) % total);
  const next = () => navigate((idx + 1) % total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setVisible(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIdx((i) => (i - 1 + LEARNING_TILES.length) % LEARNING_TILES.length);
          setVisible(true);
        }, 180);
      }
      if (e.key === "ArrowRight") {
        setVisible(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIdx((i) => (i + 1) % LEARNING_TILES.length);
          setVisible(true);
        }, 180);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tile = LEARNING_TILES[idx];

  return (
    <section className="relative -mx-6 overflow-hidden bg-white py-20 sm:-mx-10 sm:py-28">
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10">
        <SectionHeading
          Icon={Compass}
          eyebrow="HOW IT WORKS"
          eyebrowColor={C.purple}
          title="A Game Ecosystem Built for"
          highlight="Real Skill Growth"
          highlightColor={C.green}
          subtitle="Every game, every world, every reward — all designed so play becomes progress."
        />

        {/* ── Single-card carousel ── */}
        <div className="relative mx-auto max-w-xl">

          {/* Left arrow */}
          <button
            type="button"
            aria-label="Previous"
            onClick={prev}
            className="absolute -left-5 top-[40%] z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#EEF4FE] bg-white shadow-[0_4px_16px_rgba(47,128,255,0.18)] transition-all duration-200 hover:scale-110 hover:border-[#C8DCFF] focus:outline-none sm:-left-8"
            style={{ color: C.blue }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Card */}
          <div
            className="overflow-hidden rounded-[2rem] border-2 border-[#EEF4FE] bg-white shadow-[0_10px_30px_rgba(47,128,255,0.13)]"
            style={{ transition: "opacity 0.18s ease", opacity: visible ? 1 : 0 }}
          >
            {/* Game image */}
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src={tile.image}
                alt={tile.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              {/* colour tint bar at bottom */}
              <div
                className="absolute inset-x-0 bottom-0 h-1.5"
                style={{ background: tile.color }}
              />
            </div>

            {/* Text body */}
            <div className="p-7 text-center">
              <h3 className="font-display text-xl font-extrabold" style={{ color: C.ink }}>
                {tile.title}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed" style={{ color: C.inkSoft }}>
                {tile.desc}
              </p>
            </div>
          </div>

          {/* Right arrow */}
          <button
            type="button"
            aria-label="Next"
            onClick={next}
            className="absolute -right-5 top-[40%] z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#EEF4FE] bg-white shadow-[0_4px_16px_rgba(47,128,255,0.18)] transition-all duration-200 hover:scale-110 hover:border-[#C8DCFF] focus:outline-none sm:-right-8"
            style={{ color: C.blue }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot indicators */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {LEARNING_TILES.map((t, i) => (
              <button
                key={t.title}
                type="button"
                aria-label={`Go to card ${i + 1}`}
                onClick={() => navigate(i)}
                className="rounded-full transition-all duration-300 focus:outline-none"
                style={{
                  width: i === idx ? 28 : 8,
                  height: 8,
                  background: i === idx ? tile.color : "#D0DCF0",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <WaveDivider color="#F1ECFF" />
    </section>
  );
}

// ─── Section 7: Rewards system ────────────────────────────────────────────────

function RewardsSection() {
  return (
    <section
      className="relative -mx-6 overflow-hidden py-20 sm:-mx-10 sm:py-28"
      style={{ background: "linear-gradient(160deg,#F1ECFF 0%,#FFEFF8 100%)" }}
    >
      <div className="relative z-10 mx-auto grid max-w-[1600px] items-center gap-12 px-6 sm:px-10 lg:grid-cols-2">
        {/* Treasure visual */}
        <div className="relative flex justify-center">
          <div
            className="relative flex h-72 w-72 items-center justify-center rounded-[46%_54%_50%_50%/54%_50%_50%_46%] animate-float-slow sm:h-80 sm:w-80"
            style={{ background: "linear-gradient(135deg,#FFE3F2,#E9DCFF)" }}
          >
            <div className="relative w-full h-full flex items-center justify-center animate-bob">
 <img
    src="/rewards.png"
    alt="rewards"
    className="w-11/12 h-11/12 object-contain drop-shadow-lg"
  />
  </div>
            {/* spilling rewards */}
            <FloatBubble bg={C.yellow} rotate={-12} className="left-[2%] top-[14%] h-14 w-14 text-2xl">🪙</FloatBubble>
            <FloatBubble bg={C.pink} rotate={10} delay="0.4s" className="right-[2%] top-[8%] h-14 w-14 text-2xl">🎟️</FloatBubble>
            <FloatBubble bg={C.blue} rotate={-6} delay="0.8s" anim="animate-float-delay" className="bottom-[6%] left-[8%] h-16 w-16 text-2xl">⭐</FloatBubble>
            <FloatBubble bg={C.green} rotate={8} delay="1.1s" anim="animate-float-delay" className="bottom-[12%] right-[4%] h-14 w-14 text-2xl">🏅</FloatBubble>
          </div>
        </div>

        {/* Copy */}
        <div className="text-center lg:text-left">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide" style={{ background: `${C.pink}1f`, color: C.pink }}>
            <Gift className="h-4 w-4" />
            Rewards
          </span>
          <h2 className="font-display text-[2rem] leading-tight sm:text-5xl" style={{ color: C.ink }}>
            Tickets &amp; <span style={{ color: C.pink }}>Rewards</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed lg:mx-0" style={{ color: C.inkSoft }}>
            Every game you win earns coins, tickets and badges. Spend them to unlock avatars, secret levels and playful surprises. The more you play, the more you earn.
          </p>
          <ul className="mx-auto mt-6 max-w-md space-y-3 text-left">
            {[
              { Icon: Ticket, text: "Earn tickets for beating levels & hitting win streaks", color: C.blue },
              { Icon: Star,   text: "Unlock badges and collectibles for every skill mastered", color: C.orange },
              { Icon: Trophy, text: "Spend coins on avatars, secret worlds and surprises", color: C.green },
            ].map(({ Icon, text, color }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl border-2 border-white bg-white/70 px-4 py-3 text-sm font-bold" style={{ color: C.ink }}>
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ background: color }}>
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <WaveDivider color="#FFF4D6" />
    </section>
  );
}

// ─── Section 8: Testimonials ──────────────────────────────────────────────────

const TESTIMONIALS: { quote: string; name: string; role: string; color: string }[] = [
  { quote: "My son won't put it down. He thinks he's just playing games -- and he is. But he's also reading sentences I didn't expect for months.", name: "Layla K.", role: "Parent of a 5-year-old", color: C.pink },
  { quote: "The world map shows exactly which levels he's unlocked. For the first time, I actually want him on his tablet.", name: "Marcus T.", role: "Dad of two", color: C.blue },
  { quote: "Zero ads, no random videos, no strangers. And the reward system keeps my girls playing one more level every single night.", name: "Aisha R.", role: "Mom of twins", color: C.green },
];

function TestimonialsSection() {
  return (
    <section
      className="relative -mx-6 overflow-hidden py-20 sm:-mx-10 sm:py-28"
      style={{ background: "linear-gradient(160deg,#FFF4D6 0%,#FFE6C4 100%)" }}
    >
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10">
        <SectionHeading
          Icon={Star}
          eyebrow="REAL FAMILIES, REAL RESULTS"
          eyebrowColor={C.orange}
          title="Loved by Parents &"
          highlight="Kids Alike"
          highlightColor={C.pink}
          subtitle="Join thousands of families turning game time into skill time."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className={cn(
                "flex flex-col rounded-[2rem] border-2 border-white bg-white p-7 shadow-[0_16px_44px_rgba(255,138,61,0.2)] transition-transform duration-300 hover:-translate-y-1.5",
                i === 1 ? "animate-float-delay" : "animate-float",
              )}
            >
              <Quote className="h-9 w-9" style={{ color: `${t.color}66` }} />
              <p className="mt-3 flex-1 text-base leading-relaxed" style={{ color: C.ink }}>{t.quote}</p>
              <div className="mt-5 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4" style={{ fill: C.yellow, color: C.yellow }} />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 border-t border-[#F1ECE0] pt-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full font-display text-base font-extrabold text-white" style={{ background: t.color }}>
                  {t.name[0]}
                </span>
                <div>
                  <p className="font-display text-sm font-extrabold" style={{ color: C.ink }}>{t.name}</p>
                  <p className="text-xs font-bold" style={{ color: C.inkSoft }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <WaveDivider color="#FFFFFF" />
    </section>
  );
}

// ─── Section 9: Feature icon strip ────────────────────────────────────────────

const ICON_STRIP: { Icon: LucideIcon; label: string; color: string }[] = [
  { Icon: ShieldCheck, label: "100% Safe & Ad-Free",      color: C.green },
  { Icon: Gamepad2,    label: "Real Games, Real Skills",   color: C.blue },
  { Icon: Compass,     label: "Skill-Based Progression",   color: C.purple },
  { Icon: TrendingUp,  label: "See Every Level Up",        color: C.orange },
];

function IconStripSection() {
  return (
    <section className="relative -mx-6 overflow-hidden bg-white py-16 sm:-mx-10 sm:py-20">
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {ICON_STRIP.map(({ Icon, label, color }) => (
            <div key={label} className="group flex flex-col items-center text-center">
              <div
                className="mb-4 flex h-24 w-24 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-105"
                style={{ background: `${color}22`, boxShadow: `0 10px 24px ${color}33` }}
              >
                <Icon className="h-11 w-11" style={{ color }} />
              </div>
              <p className="max-w-[10rem] font-display text-base font-extrabold" style={{ color: C.ink }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
      <WaveDivider color="#1E5FD0" />
    </section>
  );
}

// ─── Section 10: Final CTA ────────────────────────────────────────────────────

function FinalCtaSection() {
  return (
    <section
      className="relative -mx-6 overflow-hidden py-24 sm:-mx-10 sm:py-32"
      style={{ background: "linear-gradient(165deg,#1E5FD0 0%,#2F80FF 55%,#5BA8FF 100%)" }}
    >
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center sm:px-10">
        {/* celebratory characters */}
        {/* <div className="mb-6 flex items-end justify-center gap-2 text-5xl sm:text-6xl">
          <span className="animate-float" style={{ animationDelay: "0s" }}>🧒</span>
          <span className="animate-float-delay text-6xl sm:text-7xl">🎉</span>
          <span className="animate-float" style={{ animationDelay: "0.5s" }}>👧</span>
        </div> */}

        <h2 className="font-display text-[2.2rem] leading-[1.08] text-white drop-shadow sm:text-6xl">
          Ready to Play? The Adventure Starts Now.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-white/90">
          Thousands of kids are already unlocking worlds and levelling up. Jump in — no downloads, no pressure, just play.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            data-focusable
            className="group inline-flex h-16 w-full items-center justify-center gap-2 rounded-full px-9 text-lg font-extrabold transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 sm:w-auto focus:outline-none"
            style={{ background: C.yellow, color: C.ink, boxShadow: "0 14px 30px rgba(0,0,0,0.25)" }}
          >
            Try FREE for 30 Days
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/library"
            data-focusable
            className="inline-flex h-16 w-full items-center justify-center gap-2 rounded-full border-2 border-white/60 bg-white/10 px-7 text-lg font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto focus:outline-none"
          >
            <Sparkles className="h-5 w-5" />
            Browse Game Worlds
          </Link>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-white/85">
          <ShieldCheck className="h-4 w-4" />
          No credit card required · Cancel anytime · Safe &amp; ad-free
        </p>
      </div>
      <WaveDivider color="#091440" />
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const socials = [
    { Icon: X, label: "X / Twitter", href: "#" },
    { Icon: Play, label: "YouTube", href: "#" },
    { Icon: Camera, label: "Instagram", href: "#" },
    { Icon: MessageCircle, label: "Discord", href: "#" },
  ];

  return (
    <footer className="relative z-10 -mx-6 -mb-8 border-t border-white/5 py-12 sm:-mx-10" style={{ background: "#091440" }}>
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <p className="mb-1 font-display text-xl font-extrabold text-white">KinetoFun</p>
            <p className="text-sm text-white/45">Where kids level up through play.</p>
            <div className="mt-4 flex gap-3">
              {socials.map(({ Icon, label, href }) => {
                const I = Icon;
                return (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/45 transition-all hover:border-white/30 hover:text-white"
                  >
                    <I className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: C.blue }}>Learn</p>
            {[
              { label: "Browse Games", href: "/library" },
              { label: "Featured", href: "/library" },
              { label: "New Worlds", href: "/library" },
              { label: "Leaderboard", href: "/leaderboard" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: C.green }}>Platform</p>
            {[
              { label: "Profile", href: "/profile" },
              { label: "Settings", href: "/settings" },
              { label: "Contact", href: "/contact" },
              { label: "How It Works", href: "/" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>

          <div>
            <p className="mb-3 text-xs font-extrabold uppercase tracking-widest" style={{ color: C.yellow }}>Legal</p>
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookies" },
              { label: "Contact", href: "/contact" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block py-1 text-sm text-white/45 transition-colors hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/25 sm:flex-row">
          <p>© {new Date().getFullYear()} KinetoFun. All rights reserved.</p>
          <p>Made with ❤️ for curious kids</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Back to Top ─────────────────────────────────────────────────────────────

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:brightness-110 hover:scale-110 active:scale-100 focus:outline-none ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ background: `linear-gradient(135deg,${C.blue},${C.purple})`, boxShadow: "0 8px 24px rgba(47,128,255,0.45)" }}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}

// ─── Landing page (logged-out) ────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="landing-root">
      <HeroSection />
      {/* <CategoryStrip /> */}
      <EducationalExcellenceSection />
      <FeatureGridSection />
      <ProvenResultsSection />
      <LearningSystemSection />
      <RewardsSection />
      <TestimonialsSection />
      <IconStripSection />
      <FinalCtaSection />
      <Footer />
      <BackToTop />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isAuthenticated } = useSession();
  const { games, loading } = useGames();
  const { gameIds: recentIds } = useContinuePlaying(isAuthenticated);
  const featured = selectFeatured(games);
  const spotlight = featured[0];

  const continuePlaying = useMemo<Game[]>(() => {
    return recentIds
      .map((id) => games.find((g) => g.id === id))
      .filter((g): g is Game => Boolean(g));
  }, [recentIds, games]);

  if (!isAuthenticated || !user) {
    return <LandingPage />;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero spotlight */}
      {spotlight ? (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br p-8 sm:p-12">
          {spotlight.coverImage ? (
            <Image
              src={spotlight.coverImage}
              alt={spotlight.title}
              fill
              className="absolute inset-0 object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
              priority
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${spotlight.cover}`} />
          )}
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
                className="border-white/40 bg-white/15 text-white hover:bg-white/25"
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
          games={selectByCategory(games, category)}
          subtitle="View all"
          viewAllHref={`/library?category=${category.toLowerCase()}`}
        />
      ))}

      <GameRail title="All games" games={games} />
    </div>
  );
}
