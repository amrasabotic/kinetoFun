"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const { user, isAuthenticated, logout, logoutAll, refresh } = useSession();
  const { settings, updateSettings } = useSettings();
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState(user?.username || "");
  const [editBio, setEditBio] = useState(user?.bio || "");
  const [editAvatarColor, setEditAvatarColor] = useState(user?.avatarColor || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  async function handleSaveProfile() {
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleCancelEdit() {
    setEditingProfile(false);
    setEditUsername(user?.username || "");
    setEditBio(user?.bio || "");
    setEditAvatarColor(user?.avatarColor || "");
    setProfileError(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1 pb-2">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-foreground/40">
          // Preferences
        </p>
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Settings
        </h1>
        <p className="text-sm text-foreground/45">Manage your account and preferences.</p>
      </header>

      {/* Account */}
      <Section title="Account">
        {isAuthenticated && user ? (
          <div className="space-y-6">
            {editingProfile ? (
              <div className="space-y-4">
                {profileError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {profileError}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    maxLength={50}
                    className="w-full rounded-lg border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-sm text-foreground placeholder-foreground/45 transition focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-lg border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-sm text-foreground placeholder-foreground/45 transition focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    placeholder="Tell us about yourself"
                  />
                  <p className="mt-1 text-xs text-foreground/40">{editBio.length}/500</p>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-semibold text-foreground">
                    Avatar color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      "from-[#1AACE0] to-[#1A2E74]",
                      "from-[#5ABB47] to-[#1A2E74]",
                      "from-[#F9B233] to-[#F7267C]",
                      "from-[#F7267C] to-[#1A2E74]",
                      "from-[#1AACE0] to-[#5ABB47]",
                      "from-purple-500 to-pink-500",
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditAvatarColor(color)}
                        className={cn(
                          `h-10 w-10 rounded-lg bg-gradient-to-br transition-all ${color}`,
                          editAvatarColor === color && "ring-2 ring-primary ring-offset-2",
                        )}
                        aria-label={color}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar user={user} size="lg" />
                  <div className="flex-1">
                    <p className="text-base font-bold text-foreground">{user.displayName}</p>
                    <p className="text-sm text-foreground/45">{user.email}</p>
                    {user.bio && <p className="mt-1 text-sm text-foreground/60">{user.bio}</p>}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditUsername(user.username || "");
                      setEditBio(user.bio || "");
                      setEditAvatarColor(user.avatarColor || "");
                      setEditingProfile(true);
                    }}
                  >
                    Edit profile
                  </Button>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
            <p className="text-sm text-foreground/45">You&apos;re not signed in.</p>
            <ButtonLink href="/login">Sign in</ButtonLink>
          </div>
        )}
      </Section>

      {/* Display */}
      <Section title="Display">
        <Toggle
          label="Large UI text"
          description="Increase text size for big-screen, across-the-room reading."
          checked={settings.largeText}
          onChange={(checked) => updateSettings({ largeText: checked })}
        />
        <div className="h-px bg-white/[0.06]" />
        <Toggle
          label="Reduce motion"
          description="Minimize animations and transitions."
          checked={settings.reduceMotion}
          onChange={(checked) => updateSettings({ reduceMotion: checked })}
        />
      </Section>

      {/* Input */}
      <Section title="Input">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Gesture controls</p>
            <p className="text-sm text-foreground/45">
              Camera-based hand tracking arrives with the hardware input layer (Phase 4).
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-foreground/50">
            Coming soon
          </span>
        </div>
        <div className="h-px bg-white/[0.06]" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Keyboard navigation</p>
            <p className="text-sm text-foreground/45">
              Use arrow keys to move focus, Enter to select. Always on.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Active
          </span>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <dl className="space-y-3 text-sm">
          <Row label="App" value="KinetoFun" />
          <div className="h-px bg-white/[0.06]" />
          <Row label="Version" value="0.1.0 (Phase 2 — Auth)" />
          <div className="h-px bg-white/[0.06]" />
          <Row label="Auth" value="Custom JWT · revocable httpOnly session" />
          <div className="h-px bg-white/[0.06]" />
          <Row label="Database" value="Supabase Postgres (local fallback)" />
        </dl>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
      {/* Top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {/* Primary glow */}
      <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-primary/40 blur-sm" />
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-foreground/50">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground/45">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
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
        <p className="text-sm text-foreground/45">{description}</p>
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
