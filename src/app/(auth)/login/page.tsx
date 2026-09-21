"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { AuthRequestError } from "@/services/auth.service";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

/** Only allow relative, in-app redirect targets (no open redirects). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const user = await login(email, password);
      // SuperAdmins land in the admin console, not the player home.
      const next =
        user.role === "superadmin"
          ? "/superadmin/dashboard"
          : safeNext(searchParams.get("next"));
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof AuthRequestError
          ? err.message
          : "Couldn't sign in. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl">
      {/* Top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {/* Primary glow accent at top */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-primary/60 blur-sm" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-foreground/45">
          Sign in to keep playing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          icon={<Mail className="h-4 w-4" />}
        />
        <div className="space-y-2">
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<Lock className="h-4 w-4" />}
          />
          <div className="pl-1 text-right">
            <Link
              href="/forgot-password"
              data-focusable
              className="text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          disabled={pending}
          className={cn("mt-2", pending && "pointer-events-none opacity-60")}
        >
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/45">
        New here?{" "}
        <Link
          href="/signup"
          data-focusable
          className="font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <LoginForm />
    </Suspense>
  );
}
