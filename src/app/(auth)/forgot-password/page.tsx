"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { authService, AuthRequestError } from "@/services/auth.service";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof AuthRequestError
          ? err.message
          : "Couldn't send the reset email. Please try again.",
      );
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
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm text-foreground/45">
          We&apos;ll email you a link to choose a new one.
        </p>
      </div>

      {sent ? (
        <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground/70">
          If an account exists for <span className="font-semibold text-foreground">{email}</span>,
          a reset link is on its way. It expires in 30 minutes.
        </p>
      ) : (
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
            {pending ? "Sending…" : "Send reset link"}
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
