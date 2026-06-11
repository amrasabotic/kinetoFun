// Local, file-backed user repository — the default when Supabase is not yet
// configured. It writes real, persistent rows to `.data/auth-users.json` (git
// ignored) so registration/login genuinely persist across restarts. This is a
// real persistence adapter behind the same `UserRepository` interface, not an
// in-memory mock: pointing the app at Supabase is a pure config change, no code
// edits. The row shape mirrors the Postgres schema in `supabase/migrations`.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UserRecord } from "@/types/auth";
import type { NewUser, UserRepository } from "../repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "auth-users.json");

async function readAll(): Promise<UserRecord[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as UserRecord[];
  } catch {
    // Missing or unreadable file → empty store.
    return [];
  }
}

async function writeAll(rows: UserRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export class LocalUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await readAll();
    const target = email.toLowerCase();
    return rows.find((r) => r.email === target) ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await readAll();
    return rows.find((r) => r.id === id) ?? null;
  }

  async create(input: NewUser): Promise<UserRecord> {
    const rows = await readAll();
    const record: UserRecord = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      password_hash: input.passwordHash,
      role: "user",
      created_at: new Date().toISOString(),
    };
    rows.push(record);
    await writeAll(rows);
    return record;
  }

  async update(
    id: string,
    updates: Partial<{ name: string; username: string; bio: string; avatar_color: string }>,
  ): Promise<UserRecord> {
    const rows = await readAll();
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`[local] update: User not found (id=${id})`);
    rows[idx] = { ...rows[idx], ...updates };
    await writeAll(rows);
    return rows[idx];
  }
}
