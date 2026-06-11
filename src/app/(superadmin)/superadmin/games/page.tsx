"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Gamepad2,
  Sparkles,
  CheckCircle2,
  FileText,
  PlayCircle,
  Plus,
  Pencil,
  Trash2,
  Send,
  Archive,
  FolderTree,
  X,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import type {
  Game,
  Category,
  GameCategory,
  GamePlayers,
  GameStatus,
  GameDifficulty,
  GameAgeGroup,
} from "@/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  Card,
  StatCard,
  Badge,
  EmptyState,
  AdminButton,
  Pagination,
  TableSkeleton,
  SearchInput,
  Select,
  Switch,
  Segmented,
} from "@/components/superadmin/ui";
import { ActionMenu } from "@/components/superadmin/ActionMenu";
import { ConfirmDialog } from "@/components/superadmin/ConfirmDialog";
import { CoverUpload } from "@/components/superadmin/CoverUpload";

const CATEGORIES: GameCategory[] = ["Action", "Puzzle", "Sports", "Arcade", "Adventure", "Party"];
const ENUM_SET = new Set<string>(CATEGORIES);
const PLAYER_MODES: GamePlayers[] = ["single", "multi", "both"];
const DIFFICULTIES: GameDifficulty[] = ["easy", "medium", "hard"];
const AGE_GROUPS: GameAgeGroup[] = ["3-5", "6-8", "9-12", "13+"];
const STATUSES: GameStatus[] = ["draft", "published", "archived"];
const PAGE_SIZE = 8;

const EMPTY: Game = {
  id: "",
  title: "",
  tagline: "",
  description: "",
  shortDescription: "",
  category: "Action",
  players: "single",
  minPlayers: 1,
  maxPlayers: 1,
  cover: "from-fuchsia-600 via-purple-600 to-indigo-700",
  accent: "#7c3aed",
  rating: 0,
  releaseYear: new Date().getFullYear(),
  durationMinutes: 10,
  difficulty: "medium",
  ageGroup: "6-8",
  status: "draft",
  featured: false,
  playCount: 0,
};

const STATUS_TONE: Record<GameStatus, "emerald" | "amber" | "slate"> = {
  published: "emerald",
  draft: "amber",
  archived: "slate",
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [ageGroup, setAgeGroup] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "played" | "title">("newest");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ game: Game; isNew: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<Game | null>(null);
  const [bulk, setBulk] = useState<null | { action: "publish" | "archive" | "delete" | "category" }>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [gRes, cRes] = await Promise.all([
        fetch("/api/admin/games"),
        fetch("/api/admin/categories"),
      ]);
      if (!gRes.ok) throw new Error("Failed to load games.");
      const gJson = await gRes.json();
      setGames(gJson.games as Game[]);
      if (cRes.ok) setCategories((await cRes.json()).categories as Category[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load games.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, category, status, difficulty, ageGroup, sort]);

  const summary = useMemo(
    () => ({
      total: games.length,
      published: games.filter((g) => (g.status ?? "published") === "published").length,
      draft: games.filter((g) => g.status === "draft").length,
      featured: games.filter((g) => g.featured).length,
    }),
    [games],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedCat = categories.find((c) => c.id === category);
    const list = games.filter((g) => {
      const matchesQ =
        !q || g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
      const matchesCat =
        category === "all" ||
        g.categoryId === category ||
        (selectedCat ? g.category === selectedCat.name : g.category === category);
      const matchesStatus = status === "all" || (g.status ?? "published") === status;
      const matchesDiff = difficulty === "all" || (g.difficulty ?? "medium") === difficulty;
      const matchesAge = ageGroup === "all" || (g.ageGroup ?? "6-8") === ageGroup;
      return matchesQ && matchesCat && matchesStatus && matchesDiff && matchesAge;
    });
    return [...list].sort((a, b) => {
      if (sort === "played") return (b.playCount ?? 0) - (a.playCount ?? 0);
      if (sort === "title") return a.title.localeCompare(b.title);
      // newest
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : a.releaseYear;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : b.releaseYear;
      return tb - ta;
    });
  }, [games, query, category, status, difficulty, ageGroup, sort, categories]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((g) => selected.has(g.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((g) => next.delete(g.id));
      else pageItems.forEach((g) => next.add(g.id));
      return next;
    });
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/games/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to delete.");
      }
      setGames((prev) => prev.filter((g) => g.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setBusy(false);
    }
  }

  async function runBulk(targetCategoryId?: string) {
    if (!bulk) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const cat = categories.find((c) => c.id === targetCategoryId);
      const body: Record<string, unknown> = { action: bulk.action, ids };
      if (bulk.action === "category") {
        body.categoryId = targetCategoryId;
        if (cat && ENUM_SET.has(cat.name)) body.categoryName = cat.name;
      }
      const res = await fetch("/api/admin/games/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Bulk action failed.");

      // Apply locally without a full refetch.
      setGames((prev) => {
        if (bulk.action === "delete") return prev.filter((g) => !selected.has(g.id));
        return prev.map((g) => {
          if (!selected.has(g.id)) return g;
          if (bulk.action === "publish") return { ...g, status: "published" as GameStatus };
          if (bulk.action === "archive") return { ...g, status: "archived" as GameStatus };
          if (bulk.action === "category" && cat)
            return {
              ...g,
              categoryId: cat.id,
              category: ENUM_SET.has(cat.name) ? (cat.name as GameCategory) : g.category,
            };
          return g;
        });
      });
      setSelected(new Set());
      setBulk(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBusy(false);
    }
  }

  function onSaved(saved: Game) {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      return exists ? prev.map((g) => (g.id === saved.id ? saved : g)) : [...prev, saved];
    });
    setEditing(null);
  }

  const filtersActive =
    !!query || category !== "all" || status !== "all" || difficulty !== "all" || ageGroup !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Games Catalog</h2>
          <p className="mt-1 text-sm text-slate-500">Create, curate, and publish the game library.</p>
        </div>
        <AdminButton onClick={() => setEditing({ game: { ...EMPTY }, isNew: true })}>
          <Plus className="h-4 w-4" />
          Add game
        </AdminButton>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tint="violet" icon={<Gamepad2 className="h-5 w-5" />} value={summary.total} label="Total Games" />
        <StatCard tint="emerald" icon={<CheckCircle2 className="h-5 w-5" />} value={summary.published} label="Published" />
        <StatCard tint="amber" icon={<FileText className="h-5 w-5" />} value={summary.draft} label="Draft" />
        <StatCard tint="sky" icon={<Sparkles className="h-5 w-5" />} value={summary.featured} label="Featured" />
      </div>

      <Card>
        {/* Toolbar */}
        <div className="space-y-3 border-b border-slate-100 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search games…" />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Category"
              icon={<FolderTree className="h-3.5 w-3.5" />}
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: "All categories" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              aria-label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All statuses" },
                ...STATUSES.map((s) => ({ value: s, label: cap(s) })),
              ]}
            />
            <Select
              aria-label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: "all", label: "All difficulty" },
                ...DIFFICULTIES.map((d) => ({ value: d, label: cap(d) })),
              ]}
            />
            <Select
              aria-label="Age group"
              value={ageGroup}
              onChange={setAgeGroup}
              options={[
                { value: "all", label: "All ages" },
                ...AGE_GROUPS.map((a) => ({ value: a, label: `Ages ${a}` })),
              ]}
            />
            <Select
              aria-label="Sort"
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              value={sort}
              onChange={(v) => setSort(v as typeof sort)}
              options={[
                { value: "newest", label: "Newest" },
                { value: "played", label: "Most played" },
                { value: "title", label: "Alphabetical" },
              ]}
            />
            {filtersActive && (
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setStatus("all");
                  setDifficulty("all");
                  setAgeGroup("all");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="kf-rise flex flex-wrap items-center gap-2 border-b border-violet-100 bg-violet-50/60 px-4 py-2.5">
            <span className="text-sm font-semibold text-violet-700">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <AdminButton size="sm" variant="secondary" onClick={() => setBulk({ action: "publish" })}>
                <Send className="h-3.5 w-3.5" /> Publish
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => setBulk({ action: "archive" })}>
                <Archive className="h-3.5 w-3.5" /> Archive
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => setBulk({ action: "category" })}>
                <FolderTree className="h-3.5 w-3.5" /> Category
              </AdminButton>
              <AdminButton size="sm" variant="danger" onClick={() => setBulk({ action: "delete" })}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </AdminButton>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-600"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <TableSkeleton cols={5} />
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Gamepad2 className="h-6 w-6" />}
            title={filtersActive ? "No matching games" : "No games yet"}
            description={
              filtersActive
                ? "Try adjusting your search or filters."
                : "Add your first game to start building the catalog."
            }
            action={
              !filtersActive ? (
                <AdminButton onClick={() => setEditing({ game: { ...EMPTY }, isNew: true })}>
                  <Plus className="h-4 w-4" />
                  Add game
                </AdminButton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all on page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectPage}
                      className="h-4 w-4 cursor-pointer accent-violet-600"
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Game</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Plays</th>
                  <th className="hidden px-5 py-3 font-semibold lg:table-cell">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((g) => {
                  const isSelected = selected.has(g.id);
                  return (
                    <tr
                      key={g.id}
                      className={cn(
                        "border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60",
                        isSelected && "bg-violet-50/40",
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${g.title}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(g.id)}
                          className="h-4 w-4 cursor-pointer accent-violet-600"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Thumb game={g} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                              {g.title}
                              {g.featured && (
                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {g.shortDescription || g.tagline || g.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone="slate">{categoryLabel(g, categories)}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONE[(g.status ?? "published") as GameStatus]}>
                          {cap(g.status ?? "published")}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                          <PlayCircle className="h-3.5 w-3.5 text-slate-400" />
                          {(g.playCount ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">
                        {g.createdAt ? formatDate(g.createdAt) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ActionMenu
                          items={[
                            {
                              label: "Edit game",
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => setEditing({ game: { ...g }, isNew: false }),
                            },
                            {
                              label: "Delete game",
                              icon: <Trash2 className="h-4 w-4" />,
                              danger: true,
                              onClick: () => setToDelete(g),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />
        )}
      </Card>

      {editing && (
        <GameFormModal
          game={editing.game}
          isNew={editing.isNew}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {/* Single delete */}
      <ConfirmDialog
        open={!!toDelete}
        danger
        icon={<Trash2 className="h-5 w-5" />}
        title="Delete game?"
        description={
          <>
            This permanently deletes{" "}
            <span className="font-semibold text-slate-700">{toDelete?.title}</span> and its scores.
            This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete game"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      {/* Bulk confirm / category picker */}
      {bulk && (
        <BulkDialog
          action={bulk.action}
          count={selected.size}
          categories={categories}
          busy={busy}
          onCancel={() => setBulk(null)}
          onConfirm={runBulk}
        />
      )}
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function categoryLabel(g: Game, categories: Category[]): string {
  if (g.categoryId) {
    const c = categories.find((x) => x.id === g.categoryId);
    if (c) return c.name;
  }
  return g.category;
}

function Thumb({ game }: { game: Game }) {
  const src = game.thumbnail || game.coverImage;
  return (
    <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-900/5">
      {src ? (
        <Image src={src} alt="" fill sizes="44px" className="object-cover" />
      ) : (
        <span className={cn("h-full w-full bg-gradient-to-br", game.cover)} />
      )}
    </span>
  );
}

// ── Bulk dialog ───────────────────────────────────────────────────────────────

function BulkDialog({
  action,
  count,
  categories,
  busy,
  onCancel,
  onConfirm,
}: {
  action: "publish" | "archive" | "delete" | "category";
  count: number;
  categories: Category[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: (categoryId?: string) => void;
}) {
  const [target, setTarget] = useState(categories[0]?.id ?? "");

  if (action === "category") {
    return (
      <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
        <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <FolderTree className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Change category</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Move {count} game{count === 1 ? "" : "s"} into a new category.
          </p>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="mt-6 flex justify-end gap-3">
            <AdminButton variant="secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </AdminButton>
            <AdminButton onClick={() => onConfirm(target)} disabled={busy || !target}>
              {busy ? "Working…" : `Move ${count} game${count === 1 ? "" : "s"}`}
            </AdminButton>
          </div>
        </div>
      </div>
    );
  }

  const meta = {
    publish: { title: "Publish games?", label: "Publish", danger: false, icon: <Send className="h-5 w-5" /> },
    archive: { title: "Archive games?", label: "Archive", danger: false, icon: <Archive className="h-5 w-5" /> },
    delete: { title: "Delete games?", label: "Delete", danger: true, icon: <Trash2 className="h-5 w-5" /> },
  }[action];

  return (
    <ConfirmDialog
      open
      danger={meta.danger}
      icon={meta.icon}
      title={meta.title}
      description={
        action === "delete" ? (
          <>
            This permanently deletes{" "}
            <span className="font-semibold text-slate-700">{count} game{count === 1 ? "" : "s"}</span>{" "}
            and their scores. This can&apos;t be undone.
          </>
        ) : (
          <>
            This will {action} {count} selected game{count === 1 ? "" : "s"}.
          </>
        )
      }
      confirmLabel={`${meta.label} ${count}`}
      busy={busy}
      onConfirm={() => onConfirm()}
      onCancel={onCancel}
    />
  );
}

// ── Create / edit modal ───────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-400";

function GameFormModal({
  game,
  isNew,
  categories,
  onCancel,
  onSaved,
}: {
  game: Game;
  isNew: boolean;
  categories: Category[];
  onCancel: () => void;
  onSaved: (game: Game) => void;
}) {
  const [form, setForm] = useState<Game>({
    ...game,
    // Make sure a category_id is set when we can infer it from the enum.
    categoryId:
      game.categoryId ?? categories.find((c) => c.name === game.category)?.id,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Game>(key: K, value: Game[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onCategoryChange(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    setForm((p) => ({
      ...p,
      categoryId,
      // Keep the legacy enum in sync when the name is a valid enum value.
      category: cat && ENUM_SET.has(cat.name) ? (cat.name as GameCategory) : p.category,
    }));
  }

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...form,
        coverImage: form.coverImage || undefined,
        thumbnail: form.thumbnail || undefined,
        categoryId: form.categoryId || undefined,
      };
      const res = await fetch(isNew ? "/api/admin/games" : `/api/admin/games/${game.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Failed to save.");
      onSaved(j.game as Game);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <Thumb game={form} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900">
              {isNew ? "Add a game" : form.title || "Edit game"}
            </h2>
            <p className="text-xs text-slate-400">
              {isNew ? "Create a new catalog entry" : "Update catalog details"}
            </p>
          </div>
          <Badge tone={STATUS_TONE[(form.status ?? "draft") as GameStatus]}>
            {cap(form.status ?? "draft")}
          </Badge>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {/* Core */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID (slug)" required>
              <input
                value={form.id}
                disabled={!isNew}
                onChange={(e) => set("id", e.target.value)}
                placeholder="neon-drift"
                className={inputCls}
              />
            </Field>
            <Field label="Game name" required>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Short description" full>
              <input
                value={form.shortDescription ?? ""}
                onChange={(e) => set("shortDescription", e.target.value)}
                placeholder="One punchy line for cards & lists"
                maxLength={160}
                className={inputCls}
              />
            </Field>
            <Field label="Tagline" full>
              <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Description" full>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Classification */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={form.categoryId ?? ""}
                onChange={(e) => onCategoryChange(e.target.value)}
                className={inputCls}
              >
                {!form.categoryId && <option value="">Select a category…</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Players">
              <select
                value={form.players}
                onChange={(e) => set("players", e.target.value as GamePlayers)}
                className={inputCls}
              >
                {PLAYER_MODES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty" full>
              <Segmented<GameDifficulty>
                value={form.difficulty ?? "medium"}
                onChange={(v) => set("difficulty", v)}
                options={DIFFICULTIES.map((d) => ({ value: d, label: cap(d) }))}
              />
            </Field>
            <Field label="Age group" full>
              <Segmented<GameAgeGroup>
                value={form.ageGroup ?? "6-8"}
                onChange={(v) => set("ageGroup", v)}
                options={AGE_GROUPS.map((a) => ({ value: a, label: a }))}
              />
            </Field>
          </div>

          {/* Media */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Thumbnail" full>
              <CoverUpload
                value={form.thumbnail}
                gradient={form.cover}
                onChange={(url) => set("thumbnail", url)}
              />
            </Field>
            <Field label="Cover image" full>
              <CoverUpload
                value={form.coverImage}
                gradient={form.cover}
                onChange={(url) => set("coverImage", url)}
              />
            </Field>
            <Field label="Cover gradient (fallback Tailwind classes)" full>
              <input value={form.cover} onChange={(e) => set("cover", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Accent (hex)">
              <input value={form.accent} onChange={(e) => set("accent", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Rating (0–5)">
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => set("rating", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Numbers */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Min players">
              <input type="number" min={1} value={form.minPlayers} onChange={(e) => set("minPlayers", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Max players">
              <input type="number" min={1} value={form.maxPlayers} onChange={(e) => set("maxPlayers", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Release year">
              <input type="number" value={form.releaseYear} onChange={(e) => set("releaseYear", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Duration (min)">
              <input type="number" min={0} value={form.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} className={inputCls} />
            </Field>
          </div>

          {/* Publishing */}
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Status
              </label>
              <Segmented<GameStatus>
                value={form.status ?? "draft"}
                onChange={(v) => set("status", v)}
                options={STATUSES.map((s) => ({ value: s, label: cap(s) }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Featured
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Switch
                  checked={form.featured ?? false}
                  onChange={(v) => set("featured", v)}
                  label="Featured"
                />
                <span className="text-sm font-medium text-slate-600">
                  {form.featured ? "Shown on homepage" : "Not featured"}
                </span>
              </div>
            </div>
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <AdminButton variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={submit} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create game" : "Save changes"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full, required }: { label: string; children: React.ReactNode; full?: boolean; required?: boolean }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}
