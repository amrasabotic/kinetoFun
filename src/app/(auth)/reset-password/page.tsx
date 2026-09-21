"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { authService, AuthRequestError } from "@/services/auth.service";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setFields({});

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      if (err instanceof AuthRequestError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError("Couldn't reset your password. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-2xl shadow-black/50 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-primary/60 blur-sm" />

      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-sm text-foreground/45">
          Enter and confirm your new password below.
        </p>
      </div>

      {!token ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          This reset link is missing its token. Please request a new one.
        </p>
      ) : done ? (
        <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground/70">
          Your password has been reset. Redirecting you to sign in…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<Lock className="h-4 w-4" />}
            />
            {fields.password ? (
              <ul className="space-y-1 pl-1 text-xs text-destructive">
                {fields.password.map((msg) => (
                  <li key={msg}>• {msg}</li>
                ))}
              </ul>
            ) : (
              <p className="pl-1 text-xs text-foreground/35">
                At least 8 characters, with a letter and a number.
              </p>
            )}
          </div>

          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            icon={<Lock className="h-4 w-4" />}
          />

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
            {pending ? "Resetting…" : "Reset password"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-foreground/45">
        <Link
          href="/login"
          data-focusable
          className="font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
