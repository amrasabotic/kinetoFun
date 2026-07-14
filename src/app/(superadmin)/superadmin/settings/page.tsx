"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  ShieldAlert,
  Megaphone,
  UserPlus,
  LayoutGrid,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Card, Skeleton, Switch, AdminButton, Select, Badge } from "@/components/superadmin/ui";

interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementActive: boolean;
  announcementText: string;
  announcementType: "info" | "warning" | "success";
  registrationOpen: boolean;
  featuredSectionTitle: string;
  maxLeaderboardEntries: number;
  defaultDifficultyFilter: "all" | "easy" | "medium" | "hard";
  updatedAt: string;
  updatedBy: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

// inputCls matches the style used across other admin forms
const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20";
const textareaCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 transition focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none";

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section-level save state
  const [maintenanceSave, setMaintenanceSave] = useState<SaveState>("idle");
  const [announcementSave, setAnnouncementSave] = useState<SaveState>("idle");
  const [registrationSave, setRegistrationSave] = useState<SaveState>("idle");
  const [contentSave, setContentSave] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to load settings.")))
      .then((j: { settings: PlatformSettings }) => setSettings(j.settings))
      .catch((e) => setError(typeof e === "string" ? e : "Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function save(
    patch: Partial<PlatformSettings>,
    setSaveState: (s: SaveState) => void,
  ) {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to save.");
      }
      const { settings: updated } = await res.json();
      setSettings(updated as PlatformSettings);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
      console.error(err);
    }
  }

  if (loading) return <SettingsSkeleton />;
  if (error || !settings) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm text-rose-700">
        {error ?? "Failed to load settings."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Platform Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configure platform-wide behaviour.
          {settings.updatedAt && (
            <span className="ml-2 text-slate-400">
              Last saved {formatDate(settings.updatedAt)}.
            </span>
          )}
        </p>
      </div>

      {/* ── Maintenance ─────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
        title="Maintenance Mode"
        description="When enabled, the platform shows a maintenance banner and can block access for regular users."
        saveState={maintenanceSave}
        onSave={() =>
          save(
            {
              maintenanceMode: settings.maintenanceMode,
              maintenanceMessage: settings.maintenanceMessage,
            },
            setMaintenanceSave,
          )
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Enable maintenance mode</p>
            <p className="text-xs text-slate-500">
              Shows a banner to all users. Admins can still access the platform.
            </p>
          </div>
          <Switch
            checked={settings.maintenanceMode}
            onChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
          />
        </div>
        {settings.maintenanceMode && (
          <div className="mt-1 rounded-lg border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            Maintenance mode is active — regular users will see the maintenance message.
          </div>
        )}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Maintenance message
          </label>
          <textarea
            rows={3}
            value={settings.maintenanceMessage}
            onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
            placeholder="We're performing scheduled maintenance…"
            className={cn(textareaCls, "mt-2")}
          />
        </div>
      </SettingsSection>

      {/* ── Announcement Banner ─────────────────────────────────────────────── */}
      <SettingsSection
        icon={<Megaphone className="h-5 w-5 text-amber-500" />}
        title="Announcement Banner"
        description="Show a dismissable platform-wide banner to all users."
        saveState={announcementSave}
        onSave={() =>
          save(
            {
              announcementActive: settings.announcementActive,
              announcementText: settings.announcementText,
              announcementType: settings.announcementType,
            },
            setAnnouncementSave,
          )
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Show announcement banner</p>
            <p className="text-xs text-slate-500">
              Displays at the top of every page for logged-in users.
            </p>
          </div>
          <Switch
            checked={settings.announcementActive}
            onChange={(v) => setSettings({ ...settings, announcementActive: v })}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Message
            </label>
            <textarea
              rows={2}
              value={settings.announcementText}
              onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
              placeholder="e.g. New games added this week! Check out the Arcade section."
              className={cn(textareaCls, "mt-2")}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Type
            </label>
            <div className="mt-2 flex flex-col gap-2">
              {(["info", "warning", "success"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSettings({ ...settings, announcementType: t })}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition",
                    settings.announcementType === t
                      ? "border-violet-300 bg-violet-50 text-violet-700 ring-2 ring-violet-500/20"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {t === "info" && <Info className="h-3.5 w-3.5 text-sky-500" />}
                  {t === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  {t === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        {settings.announcementActive && settings.announcementText && (
          <div
            className={cn(
              "mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
              settings.announcementType === "info" && "border-sky-100 bg-sky-50 text-sky-800",
              settings.announcementType === "warning" &&
                "border-amber-100 bg-amber-50 text-amber-800",
              settings.announcementType === "success" &&
                "border-emerald-100 bg-emerald-50 text-emerald-800",
            )}
          >
            {settings.announcementType === "info" && <Info className="mt-0.5 h-4 w-4 shrink-0" />}
            {settings.announcementType === "warning" && (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {settings.announcementType === "success" && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>
              <span className="font-semibold">Preview:</span> {settings.announcementText}
            </span>
          </div>
        )}
      </SettingsSection>

      {/* ── Registration ────────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
        title="Registration"
        description="Control whether new users can sign up for an account."
        saveState={registrationSave}
        onSave={() =>
          save({ registrationOpen: settings.registrationOpen }, setRegistrationSave)
        }
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Open registration</p>
            <p className="text-xs text-slate-500">
              When off, new sign-up attempts are rejected. Existing users are unaffected.
            </p>
          </div>
          <Switch
            checked={settings.registrationOpen}
            onChange={(v) => setSettings({ ...settings, registrationOpen: v })}
          />
        </div>
        {!settings.registrationOpen && (
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
            Registration is closed — new users cannot sign up.
          </div>
        )}
      </SettingsSection>

      {/* ── Content Config ──────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<LayoutGrid className="h-5 w-5 text-violet-500" />}
        title="Content Configuration"
        description="Customise default content display settings across the platform."
        saveState={contentSave}
        onSave={() =>
          save(
            {
              featuredSectionTitle: settings.featuredSectionTitle,
              maxLeaderboardEntries: settings.maxLeaderboardEntries,
              defaultDifficultyFilter: settings.defaultDifficultyFilter,
            },
            setContentSave,
          )
        }
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Featured section title
            </label>
            <input
              type="text"
              value={settings.featuredSectionTitle}
              onChange={(e) => setSettings({ ...settings, featuredSectionTitle: e.target.value })}
              placeholder="Featured Games"
              maxLength={100}
              className={cn(inputCls, "mt-2")}
            />
            <p className="mt-1 text-xs text-slate-400">
              Shown as the heading above featured games on the home screen.
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Max leaderboard entries
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.maxLeaderboardEntries}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maxLeaderboardEntries: Math.min(100, Math.max(1, Number(e.target.value))),
                })
              }
              className={cn(inputCls, "mt-2")}
            />
            <p className="mt-1 text-xs text-slate-400">
              Number of players shown on public leaderboards (1–100).
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Default difficulty filter
            </label>
            <div className="mt-2">
              <Select
                value={settings.defaultDifficultyFilter}
                onChange={(v) =>
                  setSettings({
                    ...settings,
                    defaultDifficultyFilter: v as PlatformSettings["defaultDifficultyFilter"],
                  })
                }
                options={[
                  { value: "all", label: "All difficulties" },
                  { value: "easy", label: "Easy" },
                  { value: "medium", label: "Medium" },
                  { value: "hard", label: "Hard" },
                ]}
                className="w-full"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Pre-selected filter on the games browse page.
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  saveState,
  onSave,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  saveState: SaveState;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <SaveButton state={saveState} onClick={onSave} />
      </div>

      {/* Body */}
      <div className="space-y-4 px-5 py-5">{children}</div>
    </Card>
  );
}

function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
  const isSaving = state === "saving";
  const isSaved = state === "saved";
  const isError = state === "error";

  if (isSaved) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        Saved
      </span>
    );
  }

  if (isError) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
        <AlertTriangle className="h-4 w-4" />
        Failed
      </span>
    );
  }

  return (
    <AdminButton size="sm" onClick={onClick} disabled={isSaving}>
      {isSaving ? (
        "Saving…"
      ) : (
        <>
          <Save className="h-3.5 w-3.5" />
          Save
        </>
      )}
    </AdminButton>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-slate-100" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-56 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-slate-100" />
          </div>
        </Card>
      ))}
    </div>
  );
}
