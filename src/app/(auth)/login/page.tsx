"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { useSession } from "@/features/auth/session-context";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState("amrasabo@gmail.com");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email, password);
    router.push("/");
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
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
        />

        <Button type="submit" fullWidth size="lg" className="mt-2">
          Sign in
        </Button>
      </form>

      {/* Hint */}
      <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-center text-xs text-foreground/35">
        Mock auth — any credentials work. Use a known email to load that
        player&apos;s data.
      </div>

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
