"use client";

// /tvsetup/shop — the ticket shop on the TV: tabs and pages instead of scrolling, hold to pick, hold longer to buy.

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, LoaderCircle, Lock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useSession } from "@/features/auth/session-context";
import { useHandInput } from "@/features/hand-input/HandInputProvider";
import { shopAction, useShop } from "@/features/rewards/useShop";
import { useTvSignedIn } from "@/features/tv/useTvSignedIn";
import { tvHomeHref } from "@/features/tv/tv-home-state";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  SHOP_ITEMS,
  findShopItem,
  type Rarity,
  type SecretWorld,
  type ShopItem,
  type ShopItemKind,
} from "@/lib/rewards/shop";
import type { User } from "@/types";

const PAGE_SIZE = 8;
/** Spending needs a longer hold than an ordinary button, so a passing hand cannot buy. */
const BUY_HOLD_MS = 1500;
/** The box shakes at least this long, so opening it feels like an event. */
const BOX_SHAKE_MS = 1600;

type TabId = "box" | "worlds" | ShopItemKind;

const TABS: TabId[] = ["box", "worlds", "avatar", "frame", "banner"];

const RARITY_STYLE: Record<Rarity, string> = {
  common: "bg-white/15 text-white",
  rare: "bg-sky-400/25 text-sky-200",
  epic: "bg-fuchsia-400/25 text-fuchsia-200",
};

interface Celebration {
  title: string;
  item: ShopItem | null;
}

function TvShop() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signedIn = useTvSignedIn();
  const { user, refresh: refreshSession } = useSession();
  const { shop, loading, error, refresh } = useShop(signedIn);
  const { rearm } = useHandInput();
  const { t, fmt, serverText } = useI18n();
  const s = t.tv.shop;

  // undefined: nothing picked on this tab yet, so the equipped item is shown.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const tabId = (TABS.find((id) => id === searchParams.get("tab")) ?? "box") as TabId;

  // A new choice appears where the hand already is; give the player a moment before it can be pressed.
  useEffect(() => {
    if (celebration) rearm();
  }, [celebration, rearm]);

  if (!signedIn || loading || !user) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-8" role="status">
        <LoaderCircle className="h-20 w-20 animate-spin text-primary" />
        <p className="text-3xl text-white/60">{s.opening}</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-10">
        <p className="text-4xl font-bold text-white/70">{serverText(error ?? "The shop is unavailable right now.")}</p>
        <Button size="lg" onClick={() => router.push(tvHomeHref())} className="h-20 px-14 text-3xl!">
          {t.games.backToGames}
        </Button>
      </div>
    );
  }

  const owned = new Set(shop.owned);
  const show = (id: TabId, page: number) => {
    setPicked(undefined);
    setNotice(null);
    router.replace(`/tvsetup/shop?tab=${id}&page=${page}`, { scroll: false });
  };

  async function run(action: () => Promise<Celebration | null>) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      await Promise.all([refresh(), refreshSession()]);
      if (result) setCelebration(result);
    } catch (err) {
      setNotice(serverText(err instanceof Error ? err.message : "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
      setShaking(false);
    }
  }

  // On a TV nobody goes looking for a separate "use" step, so a bought item is put on straight away.
  const buy = (item: ShopItem) =>
    run(async () => {
      await shopAction("buy", { itemId: item.id });
      await shopAction("equip", { slot: item.kind, itemId: item.id });
      return { title: t.shop.yours(fmt.item(item)), item };
    });

  const equip = (kind: ShopItemKind, itemId: string | null) =>
    run(async () => {
      await shopAction("equip", { slot: kind, itemId });
      return null;
    });

  const openBox = () => {
    setShaking(true);
    return run(async () => {
      const [res] = await Promise.all([
        shopAction<{ item: ShopItem }>("mystery-box"),
        new Promise((resolve) => setTimeout(resolve, BOX_SHAKE_MS)),
      ]);
      await shopAction("equip", { slot: res.item.kind, itemId: res.item.id });
      return { title: s.found, item: res.item };
    });
  };

  return (
    <div className="flex h-[calc(100vh_-_var(--spacing)*24)] flex-col gap-7">
      <header className="flex items-center gap-8">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push(tvHomeHref())}
          className="h-16 px-8 text-2xl! text-white!"
        >
          <ArrowLeft className="h-7 w-7" />
          {t.common.actions.back}
        </Button>
        <h1 className="flex-1 text-5xl font-black tracking-tight">{t.common.nav.shop}</h1>
        <p className="flex items-center gap-3 rounded-full bg-amber-400 px-7 py-3 text-3xl font-black tabular-nums text-amber-950">
          <Ticket className="h-8 w-8" />
          {fmt.number(shop.balance)}
        </p>
      </header>

      <nav className="flex flex-wrap gap-4" aria-label={s.sections}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            data-focusable
            aria-pressed={id === tabId}
            onClick={() => show(id, 1)}
            className={cn(
              "h-16 rounded-full px-8 text-2xl font-bold transition",
              id === tabId ? "bg-primary text-white" : "bg-white/10 text-white/80",
            )}
          >
            {s.tabs[id]}
          </button>
        ))}
      </nav>

      {tabId === "box" ? (
        <MysteryBox
          price={shop.mysteryBox.price}
          remaining={shop.mysteryBox.remaining}
          odds={shop.mysteryBox.odds}
          balance={shop.balance}
          busy={busy}
          shaking={shaking}
          notice={notice}
          onOpen={openBox}
        />
      ) : tabId === "worlds" ? (
        <Worlds
          worlds={shop.worlds}
          page={Number(searchParams.get("page")) || 1}
          onPage={(p) => show("worlds", p)}
        />
      ) : (
        <ItemShelf
          kind={tabId}
          user={user}
          owned={owned}
          equipped={shop.equipped[tabId]}
          balance={shop.balance}
          picked={picked}
          busy={busy}
          notice={notice}
          page={Number(searchParams.get("page")) || 1}
          onPage={(p) => show(tabId, p)}
          onPick={(id) => {
            setPicked(id);
            setNotice(null);
          }}
          onBuy={buy}
          onEquip={(id) => equip(tabId, id)}
        />
      )}

      {celebration && (
        <CelebrationOverlay celebration={celebration} user={user} onClose={() => setCelebration(null)} />
      )}
    </div>
  );
}

// ── Mystery box ────────────────────────────────────────────────────────────────

function MysteryBox({
  price,
  remaining,
  odds,
  balance,
  busy,
  shaking,
  notice,
  onOpen,
}: {
  price: number;
  remaining: number;
  odds: Record<Rarity, number>;
  balance: number;
  busy: boolean;
  shaking: boolean;
  notice: string | null;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const chances = (Object.keys(odds) as Rarity[])
    .filter((r) => odds[r] > 0)
    .map((r) => `${t.rewards.rarity[r]} ${Math.round(odds[r] * 100)}%`)
    .join(" · ");

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center gap-20 rounded-3xl bg-gradient-to-br from-fuchsia-600/25 via-violet-600/20 to-sky-600/20 px-16">
      <span aria-hidden className={cn("text-[14rem] leading-none", shaking && "kf-box-shake")}>
        🎁
      </span>
      <div className="flex max-w-2xl flex-col gap-6">
        <h2 className="text-6xl font-black">{t.shop.mysteryBox}</h2>
        <p className="text-3xl text-white/75">{t.shop.mysteryBoxHint}</p>
        {remaining === 0 ? (
          <p className="text-4xl font-bold text-emerald-300">{t.shop.ownEverything} 🎉</p>
        ) : (
          <>
            <p className="text-2xl text-white/55">{t.shop.chances(chances)}</p>
            <BuyButton price={price} balance={balance} busy={busy} label={t.tv.shop.openBox} onBuy={onOpen} />
          </>
        )}
        {notice && <p className="text-2xl font-bold text-rose-300">{notice}</p>}
      </div>
    </div>
  );
}

// ── Avatars, frames and banners ────────────────────────────────────────────────

function ItemShelf({
  kind,
  user,
  owned,
  equipped,
  balance,
  picked,
  busy,
  notice,
  page,
  onPage,
  onPick,
  onBuy,
  onEquip,
}: {
  kind: ShopItemKind;
  user: User;
  owned: Set<string>;
  equipped: string | null;
  balance: number;
  picked: string | null | undefined;
  busy: boolean;
  notice: string | null;
  page: number;
  onPage: (page: number) => void;
  onPick: (id: string | null) => void;
  onBuy: (item: ShopItem) => void;
  onEquip: (id: string | null) => void;
}) {
  // The first tile takes the slot off again (initials, no frame, avatar colour).
  const entries: (ShopItem | null)[] = [
    null,
    ...SHOP_ITEMS.filter((i) => i.kind === kind && (!i.retired || owned.has(i.id))),
  ];
  const pageCount = Math.ceil(entries.length / PAGE_SIZE);
  const current = Math.min(Math.max(page, 1), pageCount);
  const visible = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const { t, fmt } = useI18n();
  const name = (item: ShopItem | null) => (item ? fmt.item(item) : t.rewards.slots[kind].defaultLabel);

  const selectedId = picked === undefined ? equipped : picked;
  const selected = findShopItem(selectedId) ?? null;
  const isOwned = !selected || owned.has(selected.id);
  const inUse = (selected?.id ?? null) === equipped;

  return (
    <div className="flex min-h-0 flex-1 gap-8">
      <aside className="flex w-[30%] shrink-0 flex-col items-center gap-5 rounded-3xl bg-white/5 p-8 text-center">
        <LookPreview user={user} kind={kind} item={selected} size="big" />
        <p className="text-4xl font-black">{name(selected)}</p>
        {selected && (
          <span className={cn("rounded-full px-5 py-1.5 text-xl font-bold", RARITY_STYLE[selected.rarity])}>
            {t.rewards.rarity[selected.rarity]}
          </span>
        )}
        <div className="mt-auto flex w-full flex-col items-center gap-4">
          {inUse ? (
            <p className="flex items-center gap-3 text-3xl font-bold text-emerald-300">
              <Check className="h-9 w-9" /> {t.tv.shop.usingThis}
            </p>
          ) : isOwned ? (
            <button
              type="button"
              data-focusable
              disabled={busy}
              onClick={() => onEquip(selected?.id ?? null)}
              className="h-20 w-full rounded-full bg-primary text-3xl font-black text-white disabled:opacity-50"
            >
              {t.tv.shop.useThis}
            </button>
          ) : (
            <BuyButton price={selected!.price} balance={balance} busy={busy} label={t.shop.buy} onBuy={() => onBuy(selected!)} />
          )}
          {notice && <p className="text-2xl font-bold text-rose-300">{notice}</p>}
        </div>
      </aside>

      <PageTile direction="previous" disabled={current <= 1} onClick={() => onPage(current - 1)} />
      <ul className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-6">
        {visible.map((item) => {
          const id = item?.id ?? null;
          return (
            <li key={id ?? "none"} className="min-h-0">
              <button
                type="button"
                data-focusable
                aria-pressed={id === selectedId}
                onClick={() => onPick(id)}
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-3 rounded-3xl bg-white/5 p-4 transition",
                  id === selectedId && "bg-white/15 ring-4 ring-primary",
                )}
              >
                <LookPreview user={user} kind={kind} item={item} size="tile" />
                <span className="text-2xl font-bold leading-tight">{name(item)}</span>
                <TileStatus item={item} owned={owned} equipped={equipped} />
              </button>
            </li>
          );
        })}
      </ul>
      <PageTile direction="next" disabled={current >= pageCount} onClick={() => onPage(current + 1)} />
    </div>
  );
}

function TileStatus({ item, owned, equipped }: { item: ShopItem | null; owned: Set<string>; equipped: string | null }) {
  const s = useI18n().t.tv.shop;
  if ((item?.id ?? null) === equipped) return <span className="text-xl font-bold text-emerald-300">{s.inUse}</span>;
  if (!item || owned.has(item.id)) return <span className="text-xl text-white/60">{s.owned}</span>;
  return (
    <span className="flex items-center gap-2 text-xl font-bold text-amber-300">
      <Ticket className="h-5 w-5" /> {item.price}
    </span>
  );
}

/** The player's own look with one slot swapped for the item being looked at. */
function LookPreview({
  user,
  kind,
  item,
  size,
}: {
  user: User;
  kind: ShopItemKind;
  item: ShopItem | null;
  size: "big" | "tile";
}) {
  const look = {
    ...user,
    ...(kind === "avatar" && { equippedAvatar: item?.id }),
    ...(kind === "frame" && { equippedFrame: item?.id }),
  };
  const banner =
    kind === "banner" ? item?.className ?? user.avatarColor : findShopItem(user.equippedBanner)?.className ?? user.avatarColor;
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-3xl bg-gradient-to-br",
        banner,
        size === "big" ? "h-56 w-full" : "h-28 w-full",
      )}
    >
      <Avatar user={look} size={size === "big" ? "xl" : "lg"} className={size === "big" ? "scale-125" : undefined} />
    </span>
  );
}

// ── Secret worlds ──────────────────────────────────────────────────────────────

function Worlds({ worlds, page, onPage }: { worlds: SecretWorld[]; page: number; onPage: (page: number) => void }) {
  const { t } = useI18n();
  if (worlds.length === 0) {
    return <p className="py-32 text-center text-4xl font-bold text-white/60">{t.tv.shop.noWorlds}</p>;
  }
  const pageCount = Math.ceil(worlds.length / PAGE_SIZE);
  const current = Math.min(Math.max(page, 1), pageCount);
  const visible = worlds.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // The game page already unlocks a world and starts it, so a world opens there.
  return (
    <div className="flex min-h-0 flex-1 gap-6">
      <PageTile direction="previous" disabled={current <= 1} onClick={() => onPage(current - 1)} />
      <ul className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-6">
        {visible.map((w) => (
          <li key={w.gameId} className="min-h-0">
            <Link
              href={`/tvsetup/games/${w.gameId}`}
              data-focusable
              className="relative flex h-full overflow-hidden rounded-3xl bg-white/5"
            >
              {w.coverImage ? (
                <Image src={w.coverImage} alt="" fill sizes="25vw" className="object-cover" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${w.cover}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="relative mt-auto flex w-full items-end justify-between gap-3 p-6">
                <p className="text-3xl font-black leading-tight text-white drop-shadow">{w.title}</p>
                {w.unlocked ? (
                  <span className="rounded-full bg-emerald-400 px-4 py-1.5 text-xl font-black text-emerald-950">{t.shop.play}</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-2 rounded-full bg-amber-400 px-4 py-1.5 text-xl font-black text-amber-950">
                    <Lock className="h-5 w-5" /> {w.unlockCost}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <PageTile direction="next" disabled={current >= pageCount} onClick={() => onPage(current + 1)} />
    </div>
  );
}

// ── Shared pieces ──────────────────────────────────────────────────────────────

function BuyButton({
  price,
  balance,
  busy,
  label,
  onBuy,
}: {
  price: number;
  balance: number;
  busy: boolean;
  label: string;
  onBuy: () => void;
}) {
  const s = useI18n().t.tv.shop;
  if (balance < price) {
    return (
      <p className="flex h-20 w-full items-center justify-center gap-3 rounded-full bg-white/10 text-2xl font-bold text-white/60">
        {s.needMore(price - balance)} <Ticket className="h-7 w-7" />
      </p>
    );
  }
  return (
    <button
      type="button"
      data-focusable
      data-dwell-ms={BUY_HOLD_MS}
      disabled={busy}
      onClick={onBuy}
      className="flex h-20 w-full items-center justify-center gap-3 rounded-full bg-amber-400 px-10 text-3xl font-black text-amber-950 disabled:opacity-50"
    >
      {busy ? <LoaderCircle className="h-8 w-8 animate-spin" /> : <Ticket className="h-8 w-8" />}
      {label} · {price}
    </button>
  );
}

function CelebrationOverlay({
  celebration,
  user,
  onClose,
}: {
  celebration: Celebration;
  user: User;
  onClose: () => void;
}) {
  const item = celebration.item;
  const { t, fmt } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#050a1a]/95">
      <p className="text-5xl font-black text-amber-300">{celebration.title}</p>
      {item && (
        <div className="flex w-[34rem] flex-col items-center gap-6" style={{ animation: "kf-reward-pop 500ms ease-out both" }}>
          <LookPreview user={user} kind={item.kind} item={item} size="big" />
          <p className="text-6xl font-black">{fmt.item(item)}</p>
          <span className={cn("rounded-full px-6 py-2 text-2xl font-bold", RARITY_STYLE[item.rarity])}>
            {t.tv.shop.kindLabel(t.rewards.rarity[item.rarity], item.kind)}
          </span>
          <p className="text-2xl text-white/60">{t.tv.shop.onProfile}</p>
        </div>
      )}
      <button
        type="button"
        data-focusable
        onClick={onClose}
        className="h-20 rounded-full bg-primary px-20 text-3xl font-black text-white"
      >
        {t.tv.shop.great}
      </button>
    </div>
  );
}

function PageTile({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const r = useI18n().t.profile.rewards;
  return (
    <button
      type="button"
      data-focusable
      data-dwell-repeat
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === "previous" ? r.previousPage : r.nextPage}
      className="flex w-24 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-white transition disabled:opacity-20"
    >
      <Icon className="h-14 w-14" />
    </button>
  );
}

export default function TvShopPage() {
  return (
    <Suspense fallback={<div className="h-[70vh]" />}>
      <TvShop />
    </Suspense>
  );
}
