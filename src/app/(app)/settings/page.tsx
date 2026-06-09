"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useSession();

  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  function handleSignOut() {
    logout();
    router.push("/login");
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar user={user} size="lg" />
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">{user.displayName}</p>
              <p className="text-sm text-foreground/45">{user.email}</p>
            </div>
            <Button variant="danger" onClick={handleSignOut}>
              Sign out
            </Button>
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
          checked={largeText}
          onChange={setLargeText}
        />
        <div className="h-px bg-white/[0.06]" />
        <Toggle
          label="Reduce motion"
          description="Minimize animations and transitions."
          checked={reduceMotion}
          onChange={setReduceMotion}
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
          <Row label="Version" value="0.1.0 (Phase 1 — Frontend)" />
          <div className="h-px bg-white/[0.06]" />
          <Row label="Backend" value="Mock data (Supabase coming in Phase 2)" />
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
