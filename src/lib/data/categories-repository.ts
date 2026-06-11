// Server-only category data access (Supabase / Postgres).
//
// Backs the SuperAdmin category manager. Maps the snake_case `categories` rows
// onto the UI `Category` type and attaches a live `gamesCount` (number of games
// whose `category_id` points here). Server-only, behind /api/admin/categories.

import type { Category } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

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

/** Map a category_id → count of games. One grouped query (no N+1). */
async function gamesCountByCategory(): Promise<Map<string, number>> {
  const { data, error } = await getSupabaseAdmin()
    .from("games")
    .select("category_id")
    .not("category_id", "is", null)
    .limit(10000);
  if (error) throw new Error(`[supabase] gamesCountByCategory: ${error.message}`);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { category_id: string }[]) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  return counts;
}

export async function listCategories(): Promise<Category[]> {
  const [{ data, error }, counts] = await Promise.all([
    getSupabaseAdmin()
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    gamesCountByCategory(),
  ]);
  if (error) throw new Error(`[supabase] listCategories: ${error.message}`);
  return (data as CategoryRow[]).map((r) => toCategory(r, counts.get(r.id) ?? 0));
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[supabase] getCategoryById: ${error.message}`);
  if (!data) return null;
  const counts = await gamesCountByCategory();
  return toCategory(data as CategoryRow, counts.get((data as CategoryRow).id) ?? 0);
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

function toRow(input: Partial<CategoryInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.description !== undefined) row.description = input.description;
  if (input.icon !== undefined) row.icon = input.icon;
  if (input.image !== undefined) row.image = input.image ?? null;
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  return row;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .insert(toRow(input))
    .select("*")
    .single();
  if (error) throw new Error(`[supabase] createCategory: ${error.message}`);
  return toCategory(data as CategoryRow, 0);
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category> {
  const { data, error } = await getSupabaseAdmin()
    .from("categories")
    .update(toRow(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`[supabase] updateCategory: ${error.message}`);
  const counts = await gamesCountByCategory();
  return toCategory(data as CategoryRow, counts.get(id) ?? 0);
}

/** How many games are linked to a category (for delete safeguards). */
export async function countGamesInCategory(id: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("games")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);
  if (error) throw new Error(`[supabase] countGamesInCategory: ${error.message}`);
  return count ?? 0;
}

/** Reassign every game in `fromId` to `toId` (null clears the link). */
export async function moveGames(fromId: string, toId: string | null): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("games")
    .update({ category_id: toId })
    .eq("category_id", fromId);
  if (error) throw new Error(`[supabase] moveGames: ${error.message}`);
}

/** Delete every game linked to a category (cascades scores/sessions). */
export async function deleteGamesInCategory(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("games").delete().eq("category_id", id);
  if (error) throw new Error(`[supabase] deleteGamesInCategory: ${error.message}`);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("categories").delete().eq("id", id);
  if (error) throw new Error(`[supabase] deleteCategory: ${error.message}`);
}

/** Persist a new ordering. `order` is an array of category ids in display order. */
export async function reorderCategories(order: string[]): Promise<void> {
  const db = getSupabaseAdmin();
  // Sequential updates keep it simple and correct for a small taxonomy.
  for (let i = 0; i < order.length; i++) {
    const { error } = await db
      .from("categories")
      .update({ sort_order: i + 1 })
      .eq("id", order[i]);
    if (error) throw new Error(`[supabase] reorderCategories: ${error.message}`);
  }
}
