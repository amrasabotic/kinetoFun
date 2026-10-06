"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Gift, Lock, Sparkles, Ticket } from "lucide-react";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useSession } from "@/features/auth/session-context";
import { shopAction, useShop } from "@/features/rewards/useShop";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import {
  RARITY_LABELS,
  SHOP_ITEMS,
  SHOP_SLOTS,
  type Rarity,
  type SecretWorld,
  type ShopItem,
  type ShopItemKind,
} from "@/lib/rewards/shop";
import type { User } from "@/types";

const RARITY_STYLE: Record<Rarity, string> = {
  common: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  rare: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  epic: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
};

export default function ShopPage() {
  return (
    <ProtectedRoute>
      <ShopContent />
    </ProtectedRoute>
  );
}

function ShopContent() {
  const { user, refresh: refreshSession } = useSession();
  const { shop, loading, error, refresh } = useShop();
  // Spending is two-step (tap, then tap again to confirm) so a child cannot
  // spend tickets with one accidental tap. Holds the key awaiting confirmation.
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<ShopItem | null>(null);

  if (!user) return null;

  async function run(key: string, action: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try {
      await action();
      if (success) toast.success(success);
      await Promise.all([refresh(), refreshSession()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  /** First tap asks for confirmation; the second tap performs the purchase. */
  function spend(key: string, action: () => Promise<unknown>, success?: string) {
    if (confirming !== key) {
      setConfirming(key);
      return;
    }
    void run(key, action, success);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  if (error || !shop) {
    return (
      <p className="rounded-xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">
        {error ?? "The shop is unavailable right now."}
      </p>
    );
  }

  const owned = new Set(shop.owned);
  const odds = (Object.keys(shop.mysteryBox.odds) as Rarity[])
    .filter((r) => shop.mysteryBox.odds[r] > 0)
    .map((r) => `${RARITY_LABELS[r]} ${Math.round(shop.mysteryBox.odds[r] * 100)}%`)
    .join(" · ");

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col items-center gap-5 rounded-3xl border border-border/40 bg-card p-6 text-center shadow-sm sm:flex-row sm:text-left">
        <Avatar user={user} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Ticket Shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spend the tickets you earn by playing on new looks and secret worlds.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-amber-300/60 bg-amber-100/70 px-5 py-3 text-2xl font-black tabular-nums text-amber-700">
          <Ticket className="h-6 w-6" />
          {shop.balance.toLocaleString()}
        </div>
      </section>

      {/* Mystery box */}
      <section className="rounded-3xl border border-fuchsia-300/40 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-sky-500/10 p-6 shadow-sm">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <span className="text-7xl" aria-hidden>🎁</span>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="flex items-center justify-center gap-2 text-xl font-bold text-foreground sm:justify-start">
              <Gift className="h-5 w-5 text-fuchsia-500" /> Mystery box
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A surprise avatar, frame or banner you don&apos;t have yet.
            </p>
            {shop.mysteryBox.remaining > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Chances: {odds}</p>
            )}
          </div>
          {shop.mysteryBox.remaining === 0 ? (
            <p className="text-sm font-semibold text-muted-foreground">You own everything!</p>
          ) : (
            <SpendButton
              price={shop.mysteryBox.price}
              balance={shop.balance}
              confirming={confirming === "box"}
              busy={busy === "box"}
              label="Open"
              onClick={() =>
                spend("box", async () => {
                  const res = await shopAction<{ item: ShopItem }>("mystery-box");
                  setRevealed(res.item);
                })
              }
            />
          )}
        </div>
      </section>

      {/* Secret worlds */}
      {shop.worlds.length > 0 && (
        <section className="space-y-4">
          <SectionTitle icon={<Lock className="h-4 w-4" />} title="Secret worlds" />
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shop.worlds.map((w) => (
              <WorldCard
                key={w.gameId}
                world={w}
                balance={shop.balance}
                confirming={confirming === `world:${w.gameId}`}
                busy={busy === `world:${w.gameId}`}
                onUnlock={() =>
                  spend(
                    `world:${w.gameId}`,
                    () => shopAction("unlock-world", { gameId: w.gameId }),
                    `${w.title} unlocked!`,
                  )
                }
              />
            ))}
          </ul>
        </section>
      )}

      {(["avatar", "frame", "banner"] as ShopItemKind[]).map((kind) => {
        const equipped = shop.equipped[kind];
        const items = SHOP_ITEMS.filter((i) => i.kind === kind && (!i.retired || owned.has(i.id)));
        return (
          <section key={kind} className="space-y-4">
            <SectionTitle icon={<Sparkles className="h-4 w-4" />} title={SHOP_SLOTS[kind].label} />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              <ItemTile
                preview={<Preview kind={kind} user={user} item={null} />}
                name={SHOP_SLOTS[kind].defaultLabel}
              >
                <EquipButton
                  equipped={equipped === null}
                  busy={busy === `equip:${kind}:default`}
                  onClick={() =>
                    run(`equip:${kind}:default`, () => shopAction("equip", { slot: kind, itemId: null }))
                  }
                />
              </ItemTile>
              {items.map((item) => (
                <ItemTile
                  key={item.id}
                  preview={<Preview kind={kind} user={user} item={item} />}
                  name={item.name}
                  rarity={item.rarity}
                >
                  {owned.has(item.id) ? (
                    <EquipButton
                      equipped={equipped === item.id}
                      busy={busy === `equip:${item.id}`}
                      onClick={() =>
                        run(`equip:${item.id}`, () => shopAction("equip", { slot: kind, itemId: item.id }))
                      }
                    />
                  ) : (
                    <SpendButton
                      price={item.price}
                      balance={shop.balance}
                      confirming={confirming === `buy:${item.id}`}
                      busy={busy === `buy:${item.id}`}
                      label="Buy"
                      compact
                      onClick={() =>
                        spend(
                          `buy:${item.id}`,
                          () => shopAction("buy", { itemId: item.id }),
                          `${item.name} is yours!`,
                        )
                      }
                    />
                  )}
                </ItemTile>
              ))}
            </ul>
          </section>
        );
      })}

      {revealed && (
        <RevealDialog
          item={revealed}
          user={user}
          busy={busy === "reveal-equip"}
          onEquip={() =>
            run("reveal-equip", async () => {
              await shopAction("equip", { slot: revealed.kind, itemId: revealed.id });
              setRevealed(null);
            })
          }
          onClose={() => setRevealed(null)}
        />
      )}
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      {title}
    </h2>
  );
}

function Preview({ kind, user, item }: { kind: ShopItemKind; user: User; item: ShopItem | null }) {
  if (kind === "banner") {
    return (
      <span
        className={cn(
          "block h-14 w-full rounded-xl bg-gradient-to-br",
          item?.className ?? user.avatarColor,
        )}
      />
    );
  }
  // Show the item on the player's own avatar, keeping their other equipped slot.
  const look =
    kind === "avatar"
      ? { ...user, equippedAvatar: item?.id }
      : { ...user, equippedFrame: item?.id };
  return <Avatar user={look} size="md" />;
}

function ItemTile({
  preview,
  name,
  rarity,
  children,
}: {
  preview: React.ReactNode;
  name: string;
  rarity?: Rarity;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card p-3 text-center shadow-sm">
      <div className="flex h-16 w-full items-center justify-center">{preview}</div>
      <p className="text-xs font-bold leading-tight text-foreground">{name}</p>
      {rarity && (
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", RARITY_STYLE[rarity])}>
          {RARITY_LABELS[rarity]}
        </span>
      )}
      <div className="mt-auto w-full">{children}</div>
    </li>
  );
}

function SpendButton({
  price,
  balance,
  confirming,
  busy,
  label,
  compact,
  onClick,
}: {
  price: number;
  balance: number;
  confirming: boolean;
  busy: boolean;
  label: string;
  compact?: boolean;
  onClick: () => void;
}) {
  const short = balance < price;
  return (
    <button
      type="button"
      data-focusable
      disabled={short || busy}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed",
        compact ? "w-full px-3 py-1.5 text-xs" : "px-6 py-3 text-base",
        short
          ? "bg-muted text-muted-foreground"
          : confirming
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-amber-400 text-amber-950 hover:bg-amber-300",
      )}
    >
      {busy ? "…" : short ? `🎟️ ${price}` : confirming ? "Tap to confirm" : `${label} · 🎟️ ${price}`}
    </button>
  );
}

function EquipButton({ equipped, busy, onClick }: { equipped: boolean; busy: boolean; onClick: () => void }) {
  if (equipped) {
    return (
      <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">
        <Check className="h-3.5 w-3.5" /> Using
      </span>
    );
  }
  return (
    <button
      type="button"
      data-focusable
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-full border border-border/60 px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {busy ? "…" : "Use"}
    </button>
  );
}

function WorldCard({
  world,
  balance,
  confirming,
  busy,
  onUnlock,
}: {
  world: SecretWorld;
  balance: number;
  confirming: boolean;
  busy: boolean;
  onUnlock: () => void;
}) {
  return (
    <li className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
      <div className="relative aspect-[4/3] bg-gradient-to-br">
        {world.coverImage ? (
          <Image src={world.coverImage} alt={world.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", world.cover)} />
        )}
        {!world.unlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <Lock className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-bold text-foreground">{world.title}</p>
        {world.unlocked ? (
          <Link
            href={`/games/${world.gameId}`}
            data-focusable
            className="block w-full rounded-full bg-primary px-3 py-1.5 text-center text-xs font-bold text-primary-foreground transition hover:brightness-110"
          >
            Play
          </Link>
        ) : (
          <SpendButton
            price={world.unlockCost}
            balance={balance}
            confirming={confirming}
            busy={busy}
            label="Unlock"
            compact
            onClick={onUnlock}
          />
        )}
      </div>
    </li>
  );
}

function RevealDialog({
  item,
  user,
  busy,
  onEquip,
  onClose,
}: {
  item: ShopItem;
  user: User;
  busy: boolean;
  onEquip: () => void;
  onClose: () => void;
}) {
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border border-border/40 bg-card p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold text-muted-foreground">You got…</p>
        <div className="my-5 flex justify-center">
          <div className="w-40">
            <Preview kind={item.kind} user={user} item={item} />
          </div>
        </div>
        <p className="text-2xl font-black text-foreground">{item.name}</p>
        <span className={cn("mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", RARITY_STYLE[item.rarity])}>
          {RARITY_LABELS[item.rarity]}
        </span>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            data-focusable
            onClick={onClose}
            className="rounded-full border border-border/60 px-5 py-2 text-sm font-bold text-foreground hover:bg-muted/50"
          >
            Later
          </button>
          <button
            type="button"
            data-focusable
            disabled={busy}
            onClick={onEquip}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
          >
            {busy ? "…" : "Use it now"}
          </button>
        </div>
      </div>
    </div>
  );
}
