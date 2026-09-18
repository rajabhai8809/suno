"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || "Unable to process your request.");
        return;
      }

      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[1.5rem] border border-emerald-400/10 bg-emerald-400/[0.04] p-5">
        <p className="text-sm font-semibold text-emerald-300">Check your email</p>
        <p className="mt-2 text-xs leading-6 text-white/35">
          If an account matches that email, a password reset link will arrive shortly.
        </p>
        <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white">
          <ArrowLeft size={13} /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-xs text-red-200">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Email</span>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" placeholder="you@example.com" />
          </div>
        </label>

        <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black disabled:opacity-50">
          {loading ? <Loader2 size={17} className="animate-spin" /> : "Send reset link"}
        </button>
      </form>

      <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/70">
        <ArrowLeft size={13} /> Back to login
      </Link>
    </div>
  );
}