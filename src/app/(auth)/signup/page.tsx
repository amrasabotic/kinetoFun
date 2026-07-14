"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Mail, Lock } from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { AuthRequestError } from "@/services/auth.service";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/utils";

/** Only allow relative, in-app redirect targets (no open redirects). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setFields({});
    setPending(true);
    try {
      await signup(displayName, email, password);
      router.replace(safeNext(searchParams.get("next")));
      router.refresh();
    } catch (err) {
      if (err instanceof AuthRequestError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError("Couldn't create your account. Please try again.");
      }
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
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-foreground/45">
          Join KinetoFun in seconds.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          label="Display name"
          placeholder="Player One"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          icon={<User className="h-4 w-4" />}
        />
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
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/45">
        Already have an account?{" "}
        <Link
          href="/login"
          data-focusable
          className="font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <SignupForm />
    </Suspense>
  );
}
