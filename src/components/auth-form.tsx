"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flame, Loader2 } from "lucide-react";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const { signUpAction, logInAction } = await import("@/app/auth-actions");
      const result = isSignup
        ? await signUpAction(email, password)
        : await logInAction(email, password);
      if ("ok" in result && result.ok) {
        router.replace("/");
        router.refresh();
      } else {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
            <Flame className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-50">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {isSignup
                ? "Your existing habits will be kept."
                : "Sign in to sync your habits across devices."}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-neutral-800/70 bg-neutral-900/60 p-6"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-400">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-400">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "At least 8 characters" : "••••••••"}
              className="h-10 rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-neutral-100 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {isSignup ? "Create account" : "Sign in"}
          </button>

          <p className="text-center text-xs text-neutral-500">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-neutral-300 underline-offset-2 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="text-neutral-300 underline-offset-2 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
