"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function VerifyEmailForm({ email: initialEmail, initialError }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setMessage(data?.message || "Please check your inbox.");
    } catch {
      setMessage("Unable to resend right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {initialError && (
        <div className="mb-5 rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] px-4 py-3 text-xs leading-5 text-amber-200">
          That verification link is invalid or expired. Request a new one below.
        </div>
      )}

      <div className="rounded-[1.6rem] border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
          <Mail size={19} />
        </div>

        <h2 className="mt-6 text-lg font-semibold tracking-[-0.03em]">Verify your email</h2>
        <p className="mt-2 text-xs leading-6 text-white/35">
          We sent a verification link. Open it to activate your password account.
        </p>

        <label className="mt-6 block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" placeholder="you@example.com" />
        </label>

        <button type="button" onClick={resend} disabled={loading || !email} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] text-xs font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={14} />}
          Resend verification email
        </button>

        {message && (
          <div className="mt-4 flex gap-2 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] px-4 py-3 text-xs leading-5 text-emerald-300">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            {message}
          </div>
        )}
      </div>

      <Link href="/login" className="mt-6 inline-block text-xs text-white/30 hover:text-white/70">Back to login</Link>
    </div>
  );
}