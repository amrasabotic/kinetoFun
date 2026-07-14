"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User, Monitor, Keyboard, Info, AlertTriangle, type LucideIcon,
} from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { useSettings } from "@/features/settings/useSettings";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { user, isAuthenticated, logout, logoutAll, deleteAccount, refresh } = useSession();
  const { settings, updateSettings } = useSettings();
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || "");
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [editAvatarColor, setEditAvatarColor] = useState(user?.avatarColor || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut || signingOutAll) return;
    setSigningOut(true);
    await logout();
    router.replace("/login");
    router.refresh();
  }

  async function handleSignOutEverywhere() {
    if (signingOut || signingOutAll) return;
    setSigningOutAll(true);
    await logoutAll();
    router.replace("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (isDeleting) return;
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword);
      toast.success("Account deleted.");
      router.replace("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete account.";
      setDeleteError(msg);
      setIsDeleting(false);
    }
  }

  async function handleSaveProfile() {
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDisplayName.trim(),
          username: editUsername.trim(),
          bio: editBio.trim(),
          avatarColor: editAvatarColor,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }
      await refresh();
      setEditingProfile(false);
      toast.success("Profile updated!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleCancelEdit() {
    setEditingProfile(false);
    setEditDisplayName(user?.displayName || "");
    setEditUsername(user?.username || "");
    setEditBio(user?.bio || "");
    setEditAvatarColor(user?.avatarColor || "");
    setProfileError(null);
  }

  const AVATAR_COLORS = [
    "from-[#1AACE0] to-[#1A2E74]",
    "from-[#5ABB47] to-[#1A2E74]",
    "from-[#F9B233] to-[#F7267C]",
    "from-[#F7267C] to-[#1A2E74]",
    "from-[#1AACE0] to-[#5ABB47]",
    "from-purple-500 to-pink-500",
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-border/40 bg-card px-7 pb-10 pt-7 shadow-sm">
        {/* Subtle primary tint */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent" />
        <h1 className="relative text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Settings
        </h1>
        <p className="relative mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>
        {/* Wave bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]" aria-hidden>
          <svg className="block h-8 w-full" viewBox="0 0 1440 32" preserveAspectRatio="none">
            <path
              fill="var(--background)"
              d="M0,16 C320,32 640,0 960,16 C1120,24 1280,8 1440,16 L1440,32 L0,32 Z"
            />
          </svg>
        </div>
      </header>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Section title="Account" Icon={User} accent="primary">
        {isAuthenticated && user ? (
          <div className="space-y-6">
            {editingProfile ? (
              <div className="space-y-5">
                {profileError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {profileError}
                  </div>
                )}

                <Field
                  label="Display name"
                  hint="Shown everywhere as your name"
                >
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    maxLength={100}
                    className={inputCls}
                    placeholder="Your name"
                  />
                </Field>

                <Field
                  label="Username / @handle"
                  hint="Optional — shown as @handle on your profile"
                >
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    maxLength={50}
                    className={inputCls}
                    placeholder="optional_handle"
                  />
                </Field>

                <Field label="Bio" hint={`${editBio.length}/500`}>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className={inputCls}
                    placeholder="Tell us about yourself"
                  />
                </Field>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-foreground">
                    Avatar color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditAvatarColor(color)}
                        className={cn(
                          `h-10 w-10 rounded-xl bg-gradient-to-br transition-all ${color}`,
                          editAvatarColor === color
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-105",
                        )}
                        aria-label={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className={cn(isSavingProfile && "pointer-events-none opacity-60")}
                  >
                    {isSavingProfile ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCancelEdit}
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Profile preview */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Avatar on a mini gradient banner */}
                  <div className="relative flex h-20 w-20 shrink-0 items-end justify-center overflow-hidden rounded-2xl">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${user.avatarColor || "from-primary/80 to-violet-700"}`}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative -mb-1">
                      <Avatar user={user} size="lg" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground">{user.displayName}</p>
                    {user.username && (
                      <p className="text-xs text-foreground/45">@{user.username}</p>
                    )}
                    <p className="text-sm text-foreground/50">{user.email}</p>
                    {user.bio && (
                      <p className="mt-1 line-clamp-2 text-sm text-foreground/60">{user.bio}</p>
                    )}
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditDisplayName(user.displayName || "");
                      setEditUsername(user.username || "");
                      setEditBio(user.bio || "");
                      setEditAvatarColor(user.avatarColor || "");
                      setEditingProfile(true);
                    }}
                    className="shrink-0"
                  >
                    Edit profile
                  </Button>
                </div>

                <Divider />

                {/* Sign out */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    variant="danger"
                    onClick={handleSignOut}
                    disabled={signingOut || signingOutAll}
                    className={cn((signingOut || signingOutAll) && "pointer-events-none opacity-60")}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </Button>
                  <button
                    type="button"
                    data-focusable
                    onClick={handleSignOutEverywhere}
                    disabled={signingOut || signingOutAll}
                    className={cn(
                      "text-xs font-medium text-foreground/45 underline-offset-4 transition hover:text-foreground/70 hover:underline focus:outline-none",
                      (signingOut || signingOutAll) && "pointer-events-none opacity-60",
                    )}
                  >
                    {signingOutAll ? "Signing out all devices…" : "Sign out of all devices"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">You&apos;re not signed in.</p>
            <ButtonLink href="/login">Sign in</ButtonLink>
          </div>
        )}
      </Section>

      {/* ── Display ──────────────────────────────────────────────────────── */}
      <Section title="Display" Icon={Monitor} accent="sky">
        <Toggle
          label="Large UI text"
          description="Increase text size for big-screen, across-the-room reading."
          checked={settings.largeText}
          onChange={(checked) => {
            updateSettings({ largeText: checked });
            toast("Display settings saved", { duration: 1500 });
          }}
        />
        <Divider />
        <Toggle
          label="Reduce motion"
          description="Minimize animations and transitions."
          checked={settings.reduceMotion}
          onChange={(checked) => {
            updateSettings({ reduceMotion: checked });
            toast("Display settings saved", { duration: 1500 });
          }}
        />
      </Section>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <Section title="Input" Icon={Keyboard} accent="green">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Gesture controls</p>
            <p className="text-sm text-muted-foreground">
              Camera-based hand tracking arrives with the hardware input layer (Phase 4).
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border/40 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Coming soon
          </span>
        </div>
        <Divider />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Keyboard navigation</p>
            <p className="text-sm text-muted-foreground">
              Use arrow keys to move focus, Enter to select. Always on.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Active
          </span>
        </div>
      </Section>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Section title="About" Icon={Info} accent="zinc">
        <dl className="divide-y divide-border/30 text-sm">
          {[
            { label: "App", value: "KinetoFun" },
            { label: "Version", value: "0.1.0 (Phase 2 — Auth)" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5 first:pt-0 last:pb-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      {isAuthenticated && user && (
        <Section title="Danger Zone" Icon={AlertTriangle} accent="zinc">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">Delete account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently deletes your account, scores, sessions, and favorites. This can&apos;t be undone.
                </p>
              </div>
              <Button
                variant="danger"
                className="shrink-0"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Enter your password to permanently delete your account.
              </p>
              <input
                type="password"
                autoFocus
                className={inputCls}
                placeholder="Password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleDeleteAccount();
                }}
              />
              {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={isDeleting}
                  className={cn(isDeleting && "pointer-events-none opacity-60")}
                  onClick={handleDeleteAccount}
                >
                  {isDeleting ? "Deleting…" : "Permanently delete"}
                </Button>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

// ── Shared input class ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-3 py-2.5 text-sm text-foreground placeholder-foreground/40 transition focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30";

// ── Sub-components ─────────────────────────────────────────────────────────────

type SectionAccent = "primary" | "sky" | "green" | "zinc";

const ACCENT_CLASSES: Record<SectionAccent, { icon: string; bg: string }> = {
  primary: { icon: "text-primary",     bg: "bg-primary/10" },
  sky:     { icon: "text-sky-400",     bg: "bg-sky-500/10" },
  green:   { icon: "text-emerald-400", bg: "bg-emerald-500/10" },
  zinc:    { icon: "text-zinc-400",    bg: "bg-zinc-500/10" },
};

function Section({
  title,
  Icon,
  accent = "primary",
  children,
}: {
  title: string;
  Icon: LucideIcon;
  accent?: SectionAccent;
  children: React.ReactNode;
}) {
  const { icon, bg } = ACCENT_CLASSES[accent];
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bg)}>
          <Icon className={cn("h-4 w-4", icon)} />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/50">
          {title}
        </h2>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-foreground/40">{hint}</p>}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/30" />;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-focusable
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-300 focus:outline-none",
          checked
            ? "border-primary/50 bg-primary shadow-[0_0_12px_rgba(140,92,255,0.4)]"
            : "border-white/[0.10] bg-white/[0.06]",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
