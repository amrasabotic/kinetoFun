// Server-only ticket shop: buying cosmetics, mystery boxes, equipping items and
// unlocking secret worlds. Every purchase locks the user row and writes a
// negative ledger entry in the same transaction as the ownership row.

import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { query, queryOne, withTransaction } from "@/lib/db/server";
import { credit, readBalance } from "./service";
import {
  MYSTERY_BOX_PRICE,
  drawMysteryItem,
  findShopItem,
  mysteryBoxOdds,
  mysteryBoxPool,
  type ShopItem,
  type ShopItemKind,
  type ShopOverview,
} from "./shop";

/** A purchase that cannot go ahead; `message` is safe to show to the player. */
export class ShopError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 409,
  ) {
    super(message);
  }
}

const EQUIP_COLUMN: Record<ShopItemKind, string> = {
  avatar: "equipped_avatar",
  frame: "equipped_frame",
  banner: "equipped_banner",
};

async function lockAndReadBalance(client: PoolClient, userId: string): Promise<number> {
  const { rows } = await client.query<{ tickets: number }>(
    `SELECT tickets FROM public.users WHERE id = $1 FOR UPDATE`,
    [userId],
  );
  if (!rows[0]) throw new ShopError("Account not found.", 404);
  return rows[0].tickets;
}

async function ownedItemIds(client: PoolClient, userId: string): Promise<Set<string>> {
  const { rows } = await client.query<{ item_id: string }>(
    `SELECT item_id FROM public.user_items WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => r.item_id));
}

function requireTickets(balance: number, price: number) {
  if (balance < price) {
    throw new ShopError(`You need ${price - balance} more tickets.`);
  }
}

export async function getShopOverview(userId: string): Promise<ShopOverview> {
  const [user, items, worlds] = await Promise.all([
    queryOne<{ tickets: number; equipped_avatar: string | null; equipped_frame: string | null; equipped_banner: string | null }>(
      `SELECT tickets, equipped_avatar, equipped_frame, equipped_banner FROM public.users WHERE id = $1`,
      [userId],
    ),
    query<{ item_id: string }>(`SELECT item_id FROM public.user_items WHERE user_id = $1`, [userId]),
    query<{ id: string; title: string; cover: string | null; cover_image: string | null; unlock_cost: number; unlocked: boolean }>(
      `SELECT g.id, g.title, g.cover, g.cover_image, g.unlock_cost,
              (EXISTS (SELECT 1 FROM public.user_unlocked_games u WHERE u.user_id = $1 AND u.game_id = g.id)
               OR EXISTS (SELECT 1 FROM public.game_sessions s WHERE s.user_id = $1 AND s.game_id = g.id)) AS unlocked
       FROM public.games g
       WHERE g.unlock_cost IS NOT NULL AND g.status = 'published'
       ORDER BY g.unlock_cost, g.title`,
      [userId],
    ),
  ]);

  const owned = new Set(items.map((i) => i.item_id));
  const pool = mysteryBoxPool(owned);
  return {
    balance: user?.tickets ?? 0,
    owned: [...owned],
    equipped: {
      avatar: user?.equipped_avatar ?? null,
      frame: user?.equipped_frame ?? null,
      banner: user?.equipped_banner ?? null,
    },
    mysteryBox: { price: MYSTERY_BOX_PRICE, remaining: pool.length, odds: mysteryBoxOdds(pool) },
    worlds: worlds.map((w) => ({
      gameId: w.id,
      title: w.title,
      cover: w.cover ?? "",
      coverImage: w.cover_image,
      unlockCost: w.unlock_cost,
      unlocked: w.unlocked,
    })),
  };
}

export async function buyItem(userId: string, itemId: string): Promise<{ item: ShopItem; balance: number }> {
  const item = findShopItem(itemId);
  if (!item || item.retired) throw new ShopError("That item is not for sale.", 404);

  return withTransaction(async (client) => {
    const balance = await lockAndReadBalance(client, userId);
    if ((await ownedItemIds(client, userId)).has(item.id)) {
      throw new ShopError("You already have this item.");
    }
    requireTickets(balance, item.price);
    await client.query(
      `INSERT INTO public.user_items (user_id, item_id, source) VALUES ($1, $2, 'purchase')`,
      [userId, item.id],
    );
    await credit(client, userId, "shop_purchase", -item.price, { ref: `item:${item.id}` });
    return { item, balance: await readBalance(client, userId) };
  });
}

export async function openMysteryBox(userId: string): Promise<{ item: ShopItem; balance: number }> {
  return withTransaction(async (client) => {
    const balance = await lockAndReadBalance(client, userId);
    const pool = mysteryBoxPool(await ownedItemIds(client, userId));
    if (pool.length === 0) throw new ShopError("You already own everything a box can contain!");
    requireTickets(balance, MYSTERY_BOX_PRICE);

    const item = drawMysteryItem(pool, randomInt(0, 1_000_000) / 1_000_000);
    await client.query(
      `INSERT INTO public.user_items (user_id, item_id, source) VALUES ($1, $2, 'mystery_box')`,
      [userId, item.id],
    );
    await credit(client, userId, "mystery_box", -MYSTERY_BOX_PRICE, { ref: `item:${item.id}` });
    return { item, balance: await readBalance(client, userId) };
  });
}

/** Equip an owned item, or pass null to go back to the free default look. */
export async function equipItem(userId: string, slot: ShopItemKind, itemId: string | null): Promise<void> {
  if (itemId !== null) {
    const item = findShopItem(itemId);
    if (!item || item.kind !== slot) throw new ShopError("That item does not fit here.", 400);
    const owned = await queryOne(
      `SELECT 1 FROM public.user_items WHERE user_id = $1 AND item_id = $2`,
      [userId, itemId],
    );
    if (!owned) throw new ShopError("You don't own that item yet.");
  }
  // The column name comes from a fixed map, never from user input.
  await query(`UPDATE public.users SET ${EQUIP_COLUMN[slot]} = $1 WHERE id = $2`, [itemId, userId]);
}

/**
 * Whether the player may play a game. Ordinary games are always open; a secret
 * world is open once unlocked with tickets, or if the player had already
 * played it before it became a secret world.
 *
 * Any failure (for example the shop migration not being applied yet) leaves
 * the game open: the reward system must never stop someone from playing.
 */
export async function getWorldAccess(
  userId: string,
  gameId: string,
): Promise<{ open: true } | { open: false; unlockCost: number }> {
  try {
    const row = await queryOne<{ unlock_cost: number | null; has_access: boolean }>(
      `SELECT g.unlock_cost,
              (EXISTS (SELECT 1 FROM public.user_unlocked_games u WHERE u.user_id = $1 AND u.game_id = g.id)
               OR EXISTS (SELECT 1 FROM public.game_sessions s WHERE s.user_id = $1 AND s.game_id = g.id)) AS has_access
       FROM public.games g WHERE g.id = $2`,
      [userId, gameId],
    );
    if (!row || row.unlock_cost === null || row.has_access) return { open: true };
    return { open: false, unlockCost: row.unlock_cost };
  } catch (err) {
    console.error("[shop] world access check failed; allowing play:", err);
    return { open: true };
  }
}

export async function unlockWorld(userId: string, gameId: string): Promise<{ balance: number }> {
  return withTransaction(async (client) => {
    const balance = await lockAndReadBalance(client, userId);
    const { rows } = await client.query<{ unlock_cost: number | null; has_access: boolean }>(
      `SELECT g.unlock_cost,
              (EXISTS (SELECT 1 FROM public.user_unlocked_games u WHERE u.user_id = $1 AND u.game_id = g.id)
               OR EXISTS (SELECT 1 FROM public.game_sessions s WHERE s.user_id = $1 AND s.game_id = g.id)) AS has_access
       FROM public.games g WHERE g.id = $2 AND g.status = 'published'`,
      [userId, gameId],
    );
    const game = rows[0];
    if (!game || game.unlock_cost === null) throw new ShopError("That game is not a secret world.", 404);
    if (game.has_access) throw new ShopError("You have already unlocked this world.");
    requireTickets(balance, game.unlock_cost);

    await client.query(
      `INSERT INTO public.user_unlocked_games (user_id, game_id) VALUES ($1, $2)`,
      [userId, gameId],
    );
    await credit(client, userId, "world_unlock", -game.unlock_cost, { gameId, ref: `world:${gameId}` });
    return { balance: await readBalance(client, userId) };
  });
}
