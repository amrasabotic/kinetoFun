// Local, file-backed session repository — the default when Supabase is not
// configured. Persists to `.data/auth-sessions.json` (git ignored) so session
// revocation works in local dev too, behind the same `SessionRepository`
// interface. Row shape mirrors the `auth_sessions` table.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  NewSession,
  SessionRecord,
  SessionRepository,
} from "../session-repository";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "auth-sessions.json");

interface StoredSession {
  id: string;
  user_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  expires_at: string;
}

async function readAll(): Promise<StoredSession[]> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as StoredSession[];
  } catch {
    return [];
  }
}

async function writeAll(rows: StoredSession[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export class LocalSessionRepository implements SessionRepository {
  async create(session: NewSession): Promise<void> {
    const rows = await readAll();
    rows.push({
      id: session.id,
      user_id: session.userId,
      user_agent: session.userAgent,
      ip: session.ip,
      created_at: new Date().toISOString(),
      expires_at: session.expiresAt,
    });
    await writeAll(rows);
  }

  async findValid(id: string): Promise<SessionRecord | null> {
    const rows = await readAll();
    const row = rows.find((r) => r.id === id);
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await writeAll(rows.filter((r) => r.id !== id));
      return null;
    }
    return { id: row.id, userId: row.user_id, expiresAt: row.expires_at };
  }

  async delete(id: string): Promise<void> {
    const rows = await readAll();
    await writeAll(rows.filter((r) => r.id !== id));
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const rows = await readAll();
    await writeAll(rows.filter((r) => r.user_id !== userId));
  }
}
