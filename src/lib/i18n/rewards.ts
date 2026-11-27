import { BADGES, REASON_LABELS } from "@/lib/rewards/catalog";
import { SHOP_ITEMS } from "@/lib/rewards/shop";
import { categoryLabel } from "@/lib/format";
import { getMessages, type Locale } from "./index";

const BADGE_BY_TITLE = new Map(BADGES.map((b) => [b.title, b.id]));
const ITEM_BY_NAME = new Map(SHOP_ITEMS.map((i) => [i.name, i.id]));
const REASONS = Object.values(REASON_LABELS);

type BadgeLike = { id: string; title: string; description: string };

export function badgeText(locale: Locale, badge: BadgeLike): { title: string; description: string } {
  if (locale === "en") return badge;
  const r = getMessages(locale).rewards;
  const known = r.badges[badge.id];
  if (known) return known;
  const master = badge.id.match(/^master-(.+)$/);
  if (master) {
    const english = master[1].charAt(0).toUpperCase() + master[1].slice(1);
    return r.masterBadge(categoryLabel(english, locale));
  }
  return badge;
}

export function shopItemName(locale: Locale, item: { id: string; name: string }): string {
  if (locale === "en") return item.name;
  return getMessages(locale).rewards.items[item.id] ?? item.name;
}

function badgeTitleByEnglish(locale: Locale, title: string): string {
  const id = BADGE_BY_TITLE.get(title);
  if (id) return badgeText(locale, { id, title, description: "" }).title;
  const master = title.match(/^(.+) Master$/);
  return master ? badgeText(locale, { id: `master-${master[1].toLowerCase()}`, title, description: "" }).title : title;
}

function itemNameByEnglish(locale: Locale, name: string): string {
  const id = ITEM_BY_NAME.get(name);
  return id ? shopItemName(locale, { id, name }) : name;
}

/** Ticket history and reward lines arrive as English labels built by lib/rewards/service.ts. */
export function rewardLabel(locale: Locale, label: string): string {
  if (locale === "en") return label;
  const r = getMessages(locale).rewards;
  let m: RegExpMatchArray | null;
  if ((m = label.match(/^Badge: (.+)$/))) return `${r.badgePrefix}: ${badgeTitleByEnglish(locale, m[1])}`;
  // Collectible names belong to the game, so they stay as the game wrote them.
  if ((m = label.match(/^Collectible: (.+)$/))) return `${r.collectiblePrefix}: ${m[1]}`;
  if ((m = label.match(/^Mystery box: (.+)$/))) return r.mysteryBox(itemNameByEnglish(locale, m[1]));
  if ((m = label.match(/^Bought (.+)$/))) return r.bought(itemNameByEnglish(locale, m[1]));
  if ((m = label.match(/^(.+) \((\d+) days?\)$/)) && REASONS.includes(m[1])) {
    return r.streakDays(r.reasons[m[1]] ?? m[1], Number(m[2]));
  }
  return r.reasons[label] ?? label;
}
