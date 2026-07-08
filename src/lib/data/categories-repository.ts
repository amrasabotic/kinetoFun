// Server-only category data access (Postgres via pg).

import type { Category } from "@/types";
import { execute, query, queryCount, queryOne } from "@/lib/db/server";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toCategory(row: CategoryRow, gamesCount?: number): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    icon: row.icon ?? "Gamepad2",
    image: row.image ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gamesCount,
  };
}

async function gamesCountByCategory(
  categories: CategoryRow[],
): Promise<Map<string, number>> {
  const data = await query<{ category_id: string | null; category: string | null }>(
    `SELECT category_id, category FROM public.games
     WHERE status = 'published'
     LIMIT 10000`,
  );

  const nameToId = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const counts = new Map<string, number>();
  for (const row of data) {
    const id = row.category_id ?? nameToId.get((row.category ?? "").toLowerCase());
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export async function listActiveCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT * FROM public.categories
     WHERE is_active = true
     ORDER BY sort_order ASC, name ASC`,
  );
  return rows.map((r) => toCategory(r));
}

export async function listCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT * FROM public.categories ORDER BY sort_order ASC, name ASC`,
  );
  const counts = await gamesCountByCategory(rows);
  return rows.map((r) => toCategory(r, counts.get(r.id) ?? 0));
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const row = await queryOne<CategoryRow>(
    `SELECT * FROM public.categories WHERE id = $1`,
    [id],
  );
  if (!row) return null;
  const counts = await gamesCountByCategory([row]);
  return toCategory(row, counts.get(row.id) ?? 0);
}

export interface CategoryInput {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const row = await queryOne<CategoryRow>(
    `INSERT INTO public.categories
       (name, slug, description, icon, image, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.name,
      input.slug,
      input.description,
      input.icon,
      input.image ?? null,
      input.sortOrder,
      input.isActive,
    ],
  );
  if (!row) throw new Error("[db] createCategory: no row returned");
  return toCategory(row, 0);
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    name: "name",
    slug: "slug",
    description: "description",
    icon: "icon",
    image: "image",
    sortOrder: "sort_order",
    isActive: "is_active",
  };
  for (const [key, col] of Object.entries(map)) {
    if ((input as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push((input as Record<string, unknown>)[key] ?? null);
    }
  }
  if (fields.length === 0) {
    const existing = await getCategoryById(id);
    if (!existing) throw new Error("[db] updateCategory: not found");
    return existing;
  }
  values.push(id);
  const row = await queryOne<CategoryRow>(
    `UPDATE public.categories SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );
  if (!row) throw new Error("[db] updateCategory: not found");
  const counts = await gamesCountByCategory([row]);
  return toCategory(row, counts.get(id) ?? 0);
}

export async function countGamesInCategory(id: string): Promise<number> {
  return queryCount(
    `SELECT COUNT(*)::int AS count FROM public.games WHERE category_id = $1`,
    [id],
  );
}

export async function moveGames(
  fromId: string,
  toId: string | null,
): Promise<void> {
  await execute(
    `UPDATE public.games SET category_id = $1 WHERE category_id = $2`,
    [toId, fromId],
  );
}

export async function deleteGamesInCategory(id: string): Promise<void> {
  await execute(`DELETE FROM public.games WHERE category_id = $1`, [id]);
}

export async function deleteCategory(id: string): Promise<void> {
  await execute(`DELETE FROM public.categories WHERE id = $1`, [id]);
}

export async function reorderCategories(order: string[]): Promise<void> {
  for (let i = 0; i < order.length; i++) {
    await execute(
      `UPDATE public.categories SET sort_order = $1 WHERE id = $2`,
      [i + 1, order[i]],
    );
  }
}
