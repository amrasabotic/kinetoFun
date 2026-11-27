import type { Locale } from "./config";
import { common } from "./messages/common";
import { auth } from "./messages/auth";
import { home } from "./messages/home";
import { games } from "./messages/games";
import { rewards } from "./messages/rewards";
import { profile } from "./messages/profile";
import { leaderboard } from "./messages/leaderboard";
import { settings } from "./messages/settings";
import { shop } from "./messages/shop";
import { legal } from "./messages/legal";
import { tv } from "./messages/tv";

const areas = {
  common,
  auth,
  home,
  games,
  rewards,
  profile,
  leaderboard,
  settings,
  shop,
  legal,
  tv,
};

type Areas = typeof areas;
export type Messages = { [K in keyof Areas]: Areas[K]["en"] };

function build(locale: Locale): Messages {
  const out = {} as Record<string, unknown>;
  for (const [key, area] of Object.entries(areas)) out[key] = area[locale];
  return out as Messages;
}

const dictionaries: Record<Locale, Messages> = { en: build("en"), sq: build("sq") };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export * from "./config";
export { translateServerMessage } from "./server-messages";
