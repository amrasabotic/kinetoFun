// Ticket shop catalogue: cosmetic items and mystery box rules.
//
// Pure data, safe to import from client and server code. Only ownership and
// the equipped choice are stored in the database, so items can be renamed or
// repriced here freely. Never reuse or delete an id that players may own:
// retire an item by setting `retired: true` instead.
//
// Class strings are written out in full so Tailwind's source scan picks them up.

export type ShopItemKind = "avatar" | "frame" | "banner";
export type Rarity = "common" | "rare" | "epic";

export interface ShopItem {
  id: string;
  kind: ShopItemKind;
  name: string;
  price: number;
  rarity: Rarity;
  /** Avatar items: the emoji shown in place of the player's initials. */
  emoji?: string;
  /**
   * Frame items: background classes for the ring around the avatar.
   * Banner items: gradient stop classes used with `bg-gradient-to-br`.
   */
  className?: string;
  /** No longer sold or dropped, but still shown to players who own it. */
  retired?: boolean;
}

const avatar = (id: string, name: string, emoji: string, rarity: Rarity): ShopItem => ({
  id: `avatar-${id}`,
  kind: "avatar",
  name,
  emoji,
  rarity,
  price: PRICE.avatar[rarity],
});

const PRICE: Record<ShopItemKind, Record<Rarity, number>> = {
  avatar: { common: 50, rare: 75, epic: 100 },
  frame: { common: 100, rare: 150, epic: 200 },
  banner: { common: 100, rare: 150, epic: 200 },
};

export const SHOP_ITEMS: ShopItem[] = [
  avatar("puppy", "Puppy", "🐶", "common"),
  avatar("kitten", "Kitten", "🐱", "common"),
  avatar("frog", "Frog", "🐸", "common"),
  avatar("panda", "Panda", "🐼", "common"),
  avatar("fox", "Fox", "🦊", "common"),
  avatar("monkey", "Monkey", "🐵", "common"),
  avatar("penguin", "Penguin", "🐧", "common"),
  avatar("turtle", "Turtle", "🐢", "common"),
  avatar("lion", "Lion", "🦁", "rare"),
  avatar("tiger", "Tiger", "🐯", "rare"),
  avatar("koala", "Koala", "🐨", "rare"),
  avatar("octopus", "Octopus", "🐙", "rare"),
  avatar("dino", "Dinosaur", "🦖", "rare"),
  avatar("rocket", "Rocket", "🚀", "rare"),
  avatar("unicorn", "Unicorn", "🦄", "epic"),
  avatar("dragon", "Dragon", "🐉", "epic"),
  avatar("robot", "Robot", "🤖", "epic"),
  avatar("alien", "Space Invader", "👾", "epic"),

  { id: "frame-ocean", kind: "frame", name: "Ocean Ring", rarity: "common", price: PRICE.frame.common, className: "bg-gradient-to-br from-sky-300 to-blue-600" },
  { id: "frame-candy", kind: "frame", name: "Candy Ring", rarity: "common", price: PRICE.frame.common, className: "bg-gradient-to-br from-pink-300 to-fuchsia-500" },
  { id: "frame-forest", kind: "frame", name: "Forest Ring", rarity: "common", price: PRICE.frame.common, className: "bg-gradient-to-br from-lime-300 to-emerald-600" },
  { id: "frame-gold", kind: "frame", name: "Gold Ring", rarity: "rare", price: PRICE.frame.rare, className: "bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700" },
  { id: "frame-galaxy", kind: "frame", name: "Galaxy Ring", rarity: "rare", price: PRICE.frame.rare, className: "bg-gradient-to-br from-indigo-400 via-purple-600 to-slate-900" },
  { id: "frame-rainbow", kind: "frame", name: "Rainbow Ring", rarity: "epic", price: PRICE.frame.epic, className: "bg-[conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#8b5cf6,#f43f5e)]" },

  { id: "banner-sunset", kind: "banner", name: "Sunset", rarity: "common", price: PRICE.banner.common, className: "from-orange-400 via-pink-500 to-purple-600" },
  { id: "banner-ocean", kind: "banner", name: "Deep Ocean", rarity: "common", price: PRICE.banner.common, className: "from-cyan-400 via-sky-500 to-blue-700" },
  { id: "banner-jungle", kind: "banner", name: "Jungle", rarity: "common", price: PRICE.banner.common, className: "from-lime-400 via-emerald-500 to-teal-700" },
  { id: "banner-candy", kind: "banner", name: "Candy Land", rarity: "rare", price: PRICE.banner.rare, className: "from-pink-300 via-fuchsia-400 to-violet-500" },
  { id: "banner-space", kind: "banner", name: "Outer Space", rarity: "rare", price: PRICE.banner.rare, className: "from-slate-900 via-indigo-900 to-purple-800" },
  { id: "banner-rainbow", kind: "banner", name: "Rainbow", rarity: "epic", price: PRICE.banner.epic, className: "from-red-400 via-yellow-300 to-blue-500" },
];

export const SHOP_SLOTS: Record<ShopItemKind, { label: string; defaultLabel: string }> = {
  avatar: { label: "Avatars", defaultLabel: "My initials" },
  frame: { label: "Avatar frames", defaultLabel: "No frame" },
  banner: { label: "Profile banners", defaultLabel: "My avatar colour" },
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
};

export function findShopItem(id: string | null | undefined): ShopItem | undefined {
  return id ? SHOP_ITEMS.find((i) => i.id === id) : undefined;
}

/** Ticket price of one mystery box. */
export const MYSTERY_BOX_PRICE = 30;

/**
 * Relative chance of each rarity in a mystery box. A box only contains items
 * the player does not own yet, so the weights are rescaled over the rarities
 * still available and the shop shows the resulting odds.
 */
export const MYSTERY_BOX_WEIGHTS: Record<Rarity, number> = {
  common: 70,
  rare: 25,
  epic: 5,
};

/** Items a mystery box can still contain for a player. */
export function mysteryBoxPool(owned: Set<string>): ShopItem[] {
  return SHOP_ITEMS.filter((i) => !i.retired && !owned.has(i.id));
}

/** Chance (0–1) of each rarity for the given pool. */
export function mysteryBoxOdds(pool: ShopItem[]): Record<Rarity, number> {
  const present = new Set(pool.map((i) => i.rarity));
  const total = (Object.keys(MYSTERY_BOX_WEIGHTS) as Rarity[])
    .filter((r) => present.has(r))
    .reduce((sum, r) => sum + MYSTERY_BOX_WEIGHTS[r], 0);
  const odds = { common: 0, rare: 0, epic: 0 };
  if (total === 0) return odds;
  for (const r of present) odds[r] = MYSTERY_BOX_WEIGHTS[r] / total;
  return odds;
}

/**
 * Pick an item from the pool: a rarity is chosen with the odds above, then an
 * item uniformly within it. `random01` is a number in [0, 1), passed in so the
 * server can use a cryptographic source.
 */
export function drawMysteryItem(pool: ShopItem[], random01: number): ShopItem {
  const odds = mysteryBoxOdds(pool);
  const perItem = pool.map((i) => odds[i.rarity] / pool.filter((p) => p.rarity === i.rarity).length);
  let roll = random01;
  for (let i = 0; i < pool.length; i++) {
    roll -= perItem[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ── Shapes returned by the shop API ──────────────────────────────────────────

export interface SecretWorld {
  gameId: string;
  title: string;
  cover: string;
  coverImage: string | null;
  unlockCost: number;
  unlocked: boolean;
}

export interface ShopOverview {
  balance: number;
  owned: string[];
  equipped: Record<ShopItemKind, string | null>;
  mysteryBox: { price: number; remaining: number; odds: Record<Rarity, number> };
  worlds: SecretWorld[];
}
