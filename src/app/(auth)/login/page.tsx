"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <div className="rounded-3xl border border-line bg-surface/80 p-8 backdrop-blur-xl">
      <h1 className="text-2xl font-bold text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to keep playing.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" fullWidth size="lg">
          Sign in
        </Button>
      </form>

      <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">
        Mock authentication — any credentials work. Use a known email to load
        that player&apos;s data.
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link
          href="/signup"
          data-focusable
          className="font-semibold text-accent hover:underline focus:outline-none"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
