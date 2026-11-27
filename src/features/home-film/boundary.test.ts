import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as barrel from "./index";

const FEATURE = fileURLToPath(new URL(".", import.meta.url));
const SOURCE = join(FEATURE, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("home film boundary", () => {
  it("exposes one public entry point", () => {
    expect(Object.keys(barrel)).toEqual(["HomeFilm"]);
  });

  it("is only reached through its barrel from outside the feature", () => {
    const outside = sourceFiles(SOURCE).filter((file) => !file.startsWith(FEATURE));
    const reaching = outside.filter((file) => /from\s+["'][^"']*features\/home-film\/[^"']+["']/.test(readFileSync(file, "utf8")));
    expect(reaching.map((file) => relative(SOURCE, file).split(sep).join("/"))).toEqual([]);
  });
});
