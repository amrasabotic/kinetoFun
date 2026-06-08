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

  // Display preferences are mock-only for now (not persisted / not wired up).
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  function handleSignOut() {
    logout();
    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Settings
        </h1>
        <p className="text-muted">Manage your account and preferences.</p>
      </header>

      {/* Account */}
      <Section title="Account">
        {isAuthenticated && user ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar user={user} size="lg" />
            <div className="flex-1">
              <p className="text-lg font-bold text-white">{user.displayName}</p>
              <p className="text-muted">{user.email}</p>
            </div>
            <Button variant="danger" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-muted">You&apos;re not signed in.</p>
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
            <p className="font-semibold text-white">Gesture controls</p>
            <p className="text-sm text-muted">
              Camera-based hand tracking arrives with the hardware input layer
              (Phase 4).
            </p>
          </div>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted">
            Coming soon
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">Keyboard navigation</p>
            <p className="text-sm text-muted">
              Use arrow keys to move focus, Enter to select. Always on.
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
            Active
          </span>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <dl className="space-y-2 text-sm">
          <Row label="App" value="KinetoFun" />
          <Row label="Version" value="0.1.0 (Phase 1 — Frontend)" />
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
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
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
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-focusable
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none",
          checked ? "bg-accent" : "bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
