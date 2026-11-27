import { describe, expect, it } from "vitest";
import { getMessages, pickLocale, translateServerMessage } from "./index";
import { badgeText, rewardLabel, shopItemName } from "./rewards";
import { categoryLabel, relativeTime } from "@/lib/format";

describe("pickLocale", () => {
  it("prefers the saved cookie over the browser", () => {
    expect(pickLocale("sq", "en-US,en;q=0.9")).toBe("sq");
    expect(pickLocale("en", "sq-AL,sq;q=0.9")).toBe("en");
  });

  it("falls back to the browser languages by weight", () => {
    expect(pickLocale(undefined, "sq-AL,sq;q=0.9,en;q=0.8")).toBe("sq");
    expect(pickLocale(undefined, "de-DE,en;q=0.5,sq;q=0.9")).toBe("sq");
    expect(pickLocale(undefined, "fr-FR,de;q=0.8")).toBe("en");
  });

  it("ignores unknown cookie values and q=0 entries", () => {
    expect(pickLocale("xx", "sq;q=0,en;q=0.1")).toBe("en");
    expect(pickLocale(null, null)).toBe("en");
  });
});

/** Every leaf of a dictionary, so empty or missing Albanian strings are caught. */
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value === "string" || typeof value === "function") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}

describe("dictionaries", () => {
  const en = new Map(leaves(getMessages("en")));
  const sq = new Map(leaves(getMessages("sq")));

  it("give Albanian text for every English string", () => {
    const missing = [...en.keys()].filter((key) => !sq.has(key));
    expect(missing).toEqual([]);
  });

  it("have no empty strings", () => {
    const empty = [...sq].filter(([, v]) => v === "").map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it("format with the same arguments in both languages", () => {
    expect(getMessages("sq").games.library.count(1, false)).toBe("1 lojë e disponueshme");
    expect(getMessages("sq").games.library.count(4, true)).toBe("4 lojëra të disponueshme — Të veçuara");
    expect(getMessages("en").games.library.count(4, true)).toBe("4 games available — Featured");
  });
});

describe("server messages", () => {
  it("translates known API errors and leaves others alone", () => {
    expect(translateServerMessage("sq", "Invalid email or password.")).toBe("Email-i ose fjalëkalimi është i pasaktë.");
    expect(translateServerMessage("sq", "You need 12 more tickets.")).toBe("Të duhen edhe 12 bileta.");
    expect(translateServerMessage("sq", "Something new from the API")).toBe("Something new from the API");
    expect(translateServerMessage("en", "Invalid email or password.")).toBe("Invalid email or password.");
  });
});

describe("rewards text", () => {
  it("translates badges, including category mastery badges", () => {
    expect(badgeText("sq", { id: "first-game", title: "First Game", description: "" }).title).toBe("Loja e parë");
    expect(badgeText("sq", { id: "master-puzzle", title: "Puzzle Master", description: "" }).title).toBe(
      "Mjeshtër i kategorisë Enigma",
    );
    expect(badgeText("en", { id: "first-game", title: "First Game", description: "x" }).title).toBe("First Game");
  });

  it("translates ticket history labels built by the server", () => {
    expect(rewardLabel("sq", "Game finished")).toBe("Lojë e përfunduar");
    expect(rewardLabel("sq", "Daily streak bonus (3 days)")).toBe("Bonus për ditë radhazi (3 ditë)");
    expect(rewardLabel("sq", "Badge: First Game")).toBe("Distinktiv: Loja e parë");
    expect(rewardLabel("sq", "Bought Puppy")).toBe("Bleve Këlysh");
    expect(rewardLabel("sq", "Collectible: Golden Star")).toBe("Koleksion: Golden Star");
  });

  it("names shop items", () => {
    expect(shopItemName("sq", { id: "avatar-fox", name: "Fox" })).toBe("Dhelpër");
    expect(shopItemName("sq", { id: "avatar-new", name: "New One" })).toBe("New One");
  });
});

describe("formatting", () => {
  it("translates known categories and keeps custom ones", () => {
    expect(categoryLabel("Sports", "sq")).toBe("Sport");
    expect(categoryLabel("Brain Games", "sq")).toBe("Brain Games");
  });

  it("writes relative times in the chosen language", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(relativeTime(fiveMinutesAgo, "en")).toBe("5m ago");
    expect(relativeTime(fiveMinutesAgo, "sq")).toBe("para 5 min");
  });
});
