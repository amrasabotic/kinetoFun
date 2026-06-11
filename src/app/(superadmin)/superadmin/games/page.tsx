"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Gamepad2,
  Star,
  Sparkles,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Game, GameCategory, GamePlayers } from "@/types";
import { cn } from "@/lib/utils";
import {
  Card,
  StatCard,
  Badge,
  EmptyState,
  AdminButton,
  Pagination,
  TableSkeleton,
} from "@/components/superadmin/ui";
import { ActionMenu } from "@/components/superadmin/ActionMenu";
import { ConfirmDialog } from "@/components/superadmin/ConfirmDialog";
import { CoverUpload } from "@/components/superadmin/CoverUpload";

const CATEGORIES: GameCategory[] = ["Action", "Puzzle", "Sports", "Arcade", "Adventure", "Party"];
const PLAYER_MODES: GamePlayers[] = ["single", "multi", "both"];
const PAGE_SIZE = 8;

const EMPTY: Game = {
  id: "",
  title: "",
  tagline: "",
  description: "",
  category: "Action",
  players: "single",
  minPlayers: 1,
  maxPlayers: 1,
  cover: "from-fuchsia-600 via-purple-600 to-indigo-700",
  accent: "#7c3aed",
  rating: 0,
  releaseYear: new Date().getFullYear(),
  durationMinutes: 10,
  featured: false,
};

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"title" | "rating" | "year">("title");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<{ game: Game; isNew: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/games");
      if (!res.ok) throw new Error("Failed to load games.");
      const json = await res.json();
      setGames(json.games as Game[]);
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
  }, [query, category, sort]);

  const summary = useMemo(
    () => ({
      total: games.length,
      featured: games.filter((g) => g.featured).length,
      categories: new Set(games.map((g) => g.category)).size,
    }),
    [games],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = games.filter((g) => {
      const matchesQ = !q || g.title.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
      const matchesCat = category === "all" || g.category === category;
      return matchesQ && matchesCat;
    });
    return [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "year") return b.releaseYear - a.releaseYear;
      return a.title.localeCompare(b.title);
    });
  }, [games, query, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  function onSaved(saved: Game) {
    setGames((prev) => {
      const exists = prev.some((g) => g.id === saved.id);
      return exists ? prev.map((g) => (g.id === saved.id ? saved : g)) : [...prev, saved];
    });
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Games Catalog</h2>
          <p className="mt-1 text-sm text-slate-500">Create, edit, and curate the game library.</p>
        </div>
        <AdminButton onClick={() => setEditing({ game: { ...EMPTY }, isNew: true })}>
          <Plus className="h-4 w-4" />
          Add game
        </AdminButton>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard tint="violet" icon={<Gamepad2 className="h-5 w-5" />} value={summary.total} label="Total Games" />
        <StatCard tint="amber" icon={<Sparkles className="h-5 w-5" />} value={summary.featured} label="Featured" />
        <StatCard tint="sky" icon={<Star className="h-5 w-5" />} value={summary.categories} label="Categories" />
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: "All categories" },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
            <Select
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              value={sort}
              onChange={(v) => setSort(v as typeof sort)}
              options={[
                { value: "title", label: "Title A–Z" },
                { value: "rating", label: "Top rated" },
                { value: "year", label: "Newest" },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={4} />
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Gamepad2 className="h-6 w-6" />}
            title={query || category !== "all" ? "No matching games" : "No games yet"}
            description={
              query || category !== "all"
                ? "Try adjusting your search or filters."
                : "Add your first game to start building the catalog."
            }
            action={
              !query && category === "all" ? (
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
                  <th className="px-5 py-3 font-semibold">Game</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Rating</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Thumb game={g} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{g.title}</p>
                          <p className="truncate text-xs text-slate-400">{g.tagline || g.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone="slate">{g.category}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {g.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {g.featured ? (
                        <Badge tone="amber">
                          <Sparkles className="h-3 w-3" />
                          Featured
                        </Badge>
                      ) : (
                        <Badge tone="slate">Standard</Badge>
                      )}
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
                ))}
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
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        icon={<Trash2 className="h-5 w-5" />}
        title="Delete game?"
        description={
          <>
            This permanently deletes{" "}
            <span className="font-semibold text-slate-700">{toDelete?.title}</span> and its
            scores. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete game"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function Thumb({ game }: { game: Game }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-900/5">
      {game.coverImage ? (
        <Image src={game.coverImage} alt="" fill sizes="44px" className="object-cover" />
      ) : (
        <span className={cn("h-full w-full bg-gradient-to-br", game.cover)} />
      )}
    </span>
  );
}

function Select({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-0 pr-8 text-sm font-medium text-slate-600 transition hover:bg-slate-50 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
          icon ? "pl-8" : "pl-3",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" />
    </div>
  );
}

// ── Create / edit modal ──────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-slate-50 disabled:text-slate-400";

function GameFormModal({
  game,
  isNew,
  onCancel,
  onSaved,
}: {
  game: Game;
  isNew: boolean;
  onCancel: () => void;
  onSaved: (game: Game) => void;
}) {
  const [form, setForm] = useState<Game>(game);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Game>(key: K, value: Game[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      const payload = { ...form, coverImage: form.coverImage || undefined };
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
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <Thumb game={form} />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isNew ? "Add a game" : form.title || "Edit game"}
            </h2>
            <p className="text-xs text-slate-400">
              {isNew ? "Create a new catalog entry" : "Update catalog details"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <Field label="ID (slug)">
            <input value={form.id} disabled={!isNew} onChange={(e) => set("id", e.target.value)} placeholder="neon-drift" className={inputCls} />
          </Field>
          <Field label="Title">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Tagline" full>
            <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Description" full>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} />
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => set("category", e.target.value as GameCategory)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Players">
            <select value={form.players} onChange={(e) => set("players", e.target.value as GamePlayers)} className={inputCls}>
              {PLAYER_MODES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Min players">
            <input type="number" min={1} value={form.minPlayers} onChange={(e) => set("minPlayers", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Max players">
            <input type="number" min={1} value={form.maxPlayers} onChange={(e) => set("maxPlayers", Number(e.target.value))} className={inputCls} />
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
            <input type="number" min={0} max={5} step={0.1} value={form.rating} onChange={(e) => set("rating", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Release year">
            <input type="number" value={form.releaseYear} onChange={(e) => set("releaseYear", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Duration (min)">
            <input type="number" min={0} value={form.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} className={inputCls} />
          </Field>
          <Field label="Featured" full>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.featured ?? false} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 accent-violet-600" />
              Show in the featured rail
            </label>
          </Field>
        </div>

        {err && <p className="px-6 text-sm text-rose-600">{err}</p>}

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

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn(full && "sm:col-span-2")}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
