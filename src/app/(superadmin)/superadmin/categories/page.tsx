"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  FolderTree,
  CheckCircle2,
  EyeOff,
  Gamepad2,
  Plus,
  Pencil,
  Trash2,
  Eye,
  GripVertical,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  Card,
  StatCard,
  Badge,
  EmptyState,
  AdminButton,
  TableSkeleton,
  SearchInput,
  Select,
  ViewToggle,
  Switch,
} from "@/components/superadmin/ui";
import { ActionMenu } from "@/components/superadmin/ActionMenu";
import { ConfirmDialog } from "@/components/superadmin/ConfirmDialog";
import { CoverUpload } from "@/components/superadmin/CoverUpload";
import { CategoryIcon, IconPicker } from "@/components/superadmin/icons";
import { slugify } from "@/lib/data/category-schema";

type StatusFilter = "all" | "active" | "inactive";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<"table" | "card">("table");

  const [editing, setEditing] = useState<{ category: Category | null } | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { t, fmt, serverText } = useI18n();
  const c_ = t.adminCategories;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to load categories.");
      const json = await res.json();
      setCategories(json.categories as Category[]);
    } catch (err) {
      setError(serverText(err instanceof Error ? err.message : "Failed to load categories."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((c) => c.isActive).length,
      hidden: categories.filter((c) => !c.isActive).length,
      withGames: categories.filter((c) => (c.gamesCount ?? 0) > 0).length,
    }),
    [categories],
  );

  const reorderable = !query && status === "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesQ =
        !q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchesStatus =
        status === "all" || (status === "active" ? c.isActive : !c.isActive);
      return matchesQ && matchesStatus;
    });
  }, [categories, query, status]);

  // ── mutations ──────────────────────────────────────────────────────────────
  function onSaved(saved: Category, isNew: boolean) {
    setCategories((prev) =>
      isNew ? [...prev, saved] : prev.map((c) => (c.id === saved.id ? saved : c)),
    );
    setEditing(null);
  }

  async function toggleActive(c: Category) {
    // optimistic
    setCategories((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)),
    );
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // revert on failure
      setCategories((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isActive: c.isActive } : x)),
      );
      alert(c_.statusFailed);
    }
  }

  // ── drag reorder ───────────────────────────────────────────────────────────
  async function persistOrder(ordered: Category[]) {
    try {
      await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: ordered.map((c) => c.id) }),
      });
    } catch {
      alert(c_.orderFailed);
      void load();
    }
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...categories];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved!);
    const renumbered = next.map((c, i) => ({ ...c, sortOrder: i + 1 }));
    setCategories(renumbered);
    setDragIndex(null);
    void persistOrder(renumbered);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.admin.nav.categories}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {c_.subtitle}
          </p>
        </div>
        <AdminButton onClick={() => setEditing({ category: null })}>
          <Plus className="h-4 w-4" />
          {c_.add}
        </AdminButton>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard tint="violet" icon={<FolderTree className="h-5 w-5" />} value={summary.total} label={c_.total} />
        <StatCard tint="emerald" icon={<CheckCircle2 className="h-5 w-5" />} value={summary.active} label={c_.active} />
        <StatCard tint="amber" icon={<EyeOff className="h-5 w-5" />} value={summary.hidden} label={c_.hidden} />
        <StatCard tint="sky" icon={<Gamepad2 className="h-5 w-5" />} value={summary.withGames} label={c_.withGames} />
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder={c_.search} className="flex-1" />
          <div className="flex items-center gap-2">
            <Select
              aria-label={c_.filterStatus}
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                { value: "all", label: c_.allStatuses },
                { value: "active", label: c_.active },
                { value: "inactive", label: c_.inactive },
              ]}
            />
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={4} />
        ) : error ? (
          <p className="p-8 text-center text-sm text-rose-600">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderTree className="h-6 w-6" />}
            title={query || status !== "all" ? c_.noMatch : c_.none}
            description={
              query || status !== "all"
                ? t.adminUsers.adjustFilters
                : c_.noneHint
            }
            action={
              !query && status === "all" ? (
                <AdminButton onClick={() => setEditing({ category: null })}>
                  <Plus className="h-4 w-4" />
                  {c_.createFirst}
                </AdminButton>
              ) : undefined
            }
          />
        ) : view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="w-8 px-2 py-3" />
                  <th className="px-3 py-3 font-semibold">{c_.colCategory}</th>
                  <th className="px-5 py-3 font-semibold">{t.admin.nav.games}</th>
                  <th className="px-5 py-3 font-semibold">{t.adminUsers.colStatus}</th>
                  <th className="px-5 py-3 font-semibold">{c_.colCreated}</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const realIndex = categories.findIndex((x) => x.id === c.id);
                  return (
                    <tr
                      key={c.id}
                      draggable={reorderable}
                      onDragStart={() => reorderable && setDragIndex(realIndex)}
                      onDragOver={(e) => reorderable && e.preventDefault()}
                      onDrop={() => reorderable && handleDrop(realIndex)}
                      className={cn(
                        "border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60",
                        dragIndex === realIndex && "opacity-50",
                      )}
                    >
                      <td className="px-2 py-3">
                        {reorderable ? (
                          <span className="flex cursor-grab justify-center text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                            <GripVertical className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="block text-center text-[10px] text-slate-300">
                            {c.sortOrder}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <CategoryAvatar category={c} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{c.name}</p>
                            <p className="truncate text-xs text-slate-400">
                              {c.description || `/${c.slug}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-slate-600">{c.gamesCount ?? 0}</span>
                      </td>
                      <td className="px-5 py-3">
                        {c.isActive ? (
                          <Badge tone="emerald">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {c_.active}
                          </Badge>
                        ) : (
                          <Badge tone="slate">
                            <EyeOff className="h-3 w-3" />
                            {c_.hidden}
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{fmt.date(c.createdAt)}</td>
                      <td className="px-5 py-3 text-right">
                        <ActionMenu
                          items={[
                            {
                              label: t.common.actions.edit,
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => setEditing({ category: c }),
                            },
                            {
                              label: c.isActive ? c_.disable : c_.enable,
                              icon: c.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              ),
                              onClick: () => toggleActive(c),
                            },
                            {
                              label: t.common.actions.delete,
                              icon: <Trash2 className="h-4 w-4" />,
                              danger: true,
                              onClick: () => setToDelete(c),
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
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="kf-rise group relative flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-slate-200/60"
              >
                <div className="flex items-start justify-between">
                  <CategoryAvatar category={c} size="lg" />
                  <ActionMenu
                    items={[
                      {
                        label: t.common.actions.edit,
                        icon: <Pencil className="h-4 w-4" />,
                        onClick: () => setEditing({ category: c }),
                      },
                      {
                        label: c.isActive ? c_.disable : c_.enable,
                        icon: c.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
                        onClick: () => toggleActive(c),
                      },
                      {
                        label: t.common.actions.delete,
                        icon: <Trash2 className="h-4 w-4" />,
                        danger: true,
                        onClick: () => setToDelete(c),
                      },
                    ]}
                  />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{c.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">
                  {c.description || c_.noDescription}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Gamepad2 className="h-3.5 w-3.5 text-slate-400" />
                    {c_.games(c.gamesCount ?? 0)}
                  </span>
                  {c.isActive ? (
                    <Badge tone="emerald">{c_.active}</Badge>
                  ) : (
                    <Badge tone="slate">{c_.hidden}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <CategoryFormModal
          category={editing.category}
          existing={categories}
          onCancel={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}

      {toDelete && (
        <DeleteCategoryFlow
          category={toDelete}
          others={categories.filter((c) => c.id !== toDelete.id)}
          onClose={() => setToDelete(null)}
          onDeleted={(id) => {
            setCategories((prev) => prev.filter((c) => c.id !== id));
            setToDelete(null);
            void load(); // refresh games counts after moves/deletes
          }}
        />
      )}
    </div>
  );
}

// ── Category avatar (image or icon tile) ──────────────────────────────────────

function CategoryAvatar({ category, size = "md" }: { category: Category; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "h-11 w-11" : "h-10 w-10";
  if (category.image) {
    return (
      <span className={cn("relative shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-900/5", dim)}>
        <Image src={category.image} alt="" fill sizes="44px" className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600",
        dim,
      )}
    >
      <CategoryIcon name={category.icon} className="h-5 w-5" />
    </span>
  );
}

// ── Create / edit modal ───────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

interface FormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
}

function CategoryFormModal({
  category,
  existing,
  onCancel,
  onSaved,
}: {
  category: Category | null;
  existing: Category[];
  onCancel: () => void;
  onSaved: (c: Category, isNew: boolean) => void;
}) {
  const isNew = !category;
  const [form, setForm] = useState<FormState>(() => ({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "Gamepad2",
    image: category?.image,
    sortOrder: category?.sortOrder ?? existing.length + 1,
    isActive: category?.isActive ?? true,
  }));
  // Track whether the user hand-edited the slug so we stop auto-deriving it.
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { t, serverText } = useI18n();
  const c_ = t.adminCategories;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onNameChange(name: string) {
    setForm((p) => ({ ...p, name, slug: slugTouched ? p.slug : slugify(name) }));
  }

  async function submit() {
    if (!form.name.trim()) {
      setErr(c_.nameRequired);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        icon: form.icon,
        image: form.image || "",
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      const res = await fetch(
        isNew ? "/api/admin/categories" : `/api/admin/categories/${category!.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? c_.saveFailed);
      onSaved(j.category as Category, isNew);
    } catch (e) {
      setErr(e instanceof Error ? serverText(e.message) : c_.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <CategoryIcon name={form.icon} className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isNew ? t.adminDashboard.addCategory : c_.edit}
            </h2>
            <p className="text-xs text-slate-400">
              {isNew ? c_.newHint : c_.editing(category!.name)}
            </p>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c_.name} required>
              <input
                value={form.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={c_.namePlaceholder}
                className={inputCls}
                autoFocus
              />
            </Field>
            <Field label={c_.slug}>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                placeholder="brain-games"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label={c_.description}>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder={c_.descriptionPlaceholder}
              className={inputCls}
            />
          </Field>

          <Field label={c_.icon}>
            <IconPicker value={form.icon} onChange={(name) => set("icon", name)} />
          </Field>

          <Field label={c_.image}>
            <CoverUpload
              value={form.image}
              gradient="from-violet-500 to-indigo-600"
              onChange={(url) => set("image", url)}
            />
          </Field>

          <div className="grid items-center gap-4 sm:grid-cols-2">
            <Field label={c_.sortOrder}>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t.adminUsers.colStatus}
              </label>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <Switch checked={form.isActive} onChange={(v) => set("isActive", v)} label={c_.active} />
                <span className="text-sm font-medium text-slate-600">
                  {form.isActive ? c_.active : c_.inactive}
                </span>
              </div>
            </div>
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <AdminButton variant="secondary" onClick={onCancel} disabled={saving}>
            {t.common.actions.cancel}
          </AdminButton>
          <AdminButton onClick={submit} disabled={saving}>
            {saving ? t.common.actions.saving : c_.save}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="ml-0.5 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Delete flow (safeguards when the category has games) ──────────────────────

function DeleteCategoryFlow({
  category,
  others,
  onClose,
  onDeleted,
}: {
  category: Category;
  others: Category[];
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const gamesCount = category.gamesCount ?? 0;
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<"move" | "delete-games">("move");
  const [target, setTarget] = useState<string>(others[0]?.id ?? "");
  const [err, setErr] = useState<string | null>(null);
  const { t, serverText } = useI18n();
  const c_ = t.adminCategories;

  async function run(strategy?: "move" | "delete-games", targetId?: string) {
    setBusy(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (strategy) params.set("strategy", strategy);
      if (strategy === "move" && targetId) params.set("target", targetId);
      const qs = params.toString();
      const res = await fetch(
        `/api/admin/categories/${category.id}${qs ? `?${qs}` : ""}`,
        { method: "DELETE" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? j.message ?? c_.deleteFailed);
      onDeleted(category.id);
    } catch (e) {
      setErr(e instanceof Error ? serverText(e.message) : c_.deleteFailed);
    } finally {
      setBusy(false);
    }
  }

  // No games → simple confirm.
  if (gamesCount === 0) {
    return (
      <ConfirmDialog
        open
        danger
        icon={<Trash2 className="h-5 w-5" />}
        title={c_.deleteTitle}
        description={
          <>
            {t.adminUsers.deleteBefore}{" "}
            <span className="font-semibold text-slate-700">{category.name}</span>. {c_.cantUndo}
          </>
        }
        confirmLabel={c_.deleteCategory}
        busy={busy}
        onConfirm={() => run()}
        onCancel={onClose}
      />
    );
  }

  // Has games → choice modal.
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/20">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{c_.deleteNamed(category.name)}</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {c_.contains}{" "}
          <span className="font-semibold text-slate-700">{c_.games(gamesCount)}</span>.{" "}
          {c_.chooseWhat}
        </p>

        <div className="mt-5 space-y-2.5">
          {/* Move option */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
              choice === "move"
                ? "border-violet-300 bg-violet-50/60 ring-1 ring-violet-500/20"
                : "border-slate-200 hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name="strategy"
              checked={choice === "move"}
              onChange={() => setChoice("move")}
              className="mt-0.5 h-4 w-4 accent-violet-600"
              disabled={others.length === 0}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <ArrowRightLeft className="h-3.5 w-3.5 text-violet-500" />
                {c_.moveTitle}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{c_.moveHint}</p>
              {choice === "move" && others.length > 0 && (
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className={cn(inputCls, "mt-2")}
                >
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
              {others.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">{c_.noOther}</p>
              )}
            </div>
          </label>

          {/* Delete-with option */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
              choice === "delete-games"
                ? "border-rose-300 bg-rose-50/60 ring-1 ring-rose-500/20"
                : "border-slate-200 hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name="strategy"
              checked={choice === "delete-games"}
              onChange={() => setChoice("delete-games")}
              className="mt-0.5 h-4 w-4 accent-rose-600"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                {c_.deleteWithTitle}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {c_.deleteWithHint(gamesCount)}
              </p>
            </div>
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={onClose} disabled={busy}>
            {t.common.actions.cancel}
          </AdminButton>
          <AdminButton
            variant={choice === "delete-games" ? "danger" : "primary"}
            disabled={busy || (choice === "move" && !target)}
            onClick={() => run(choice, target)}
          >
            {busy ? t.admin.ui.working : choice === "move" ? c_.moveAndDelete : c_.deleteEverything}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
