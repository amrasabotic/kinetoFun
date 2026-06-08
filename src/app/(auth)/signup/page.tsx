"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session-context";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signup(displayName, email, password);
    router.push("/");
  }

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-8 backdrop-blur-xl">
      <h1 className="text-2xl font-bold text-white">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Join KinetoFun in seconds.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          label="Display name"
          placeholder="Player One"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
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
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" fullWidth size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-center text-xs text-muted">
        Mock sign-up — no data is stored on a server. Your session lives in the
        browser only.
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          data-focusable
          className="font-semibold text-accent hover:underline focus:outline-none"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
