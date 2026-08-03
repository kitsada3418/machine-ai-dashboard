"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiClientError } from "@/lib/api";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@smartfactory.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Login failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border bg-panel p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-accent" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide">
              Smart Factory
            </h1>
            <p className="text-xs text-muted">Machine Monitoring System</p>
          </div>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-muted">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="mb-4 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <label className="mb-1.5 block text-xs font-medium text-muted">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mb-4 w-full rounded border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />

        {error && (
          <p className="mb-4 rounded border border-alarm/40 bg-alarm/10 px-3 py-2 text-xs text-alarm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-accent px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <p className="mt-4 text-center font-mono text-[11px] text-muted">
          admin@smartfactory.local / SmartFactory@123
        </p>
      </form>
    </div>
  );
}
