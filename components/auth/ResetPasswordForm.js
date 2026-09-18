"use client";

import Link from "next/link";
import { Check, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const requirements = [
  ["12+ characters", (v) => v.length >= 12],
  ["Uppercase", (v) => /[A-Z]/.test(v)],
  ["Lowercase", (v) => /[a-z]/.test(v)],
  ["Number", (v) => /[0-9]/.test(v)],
  ["Special character", (v) => /[^A-Za-z0-9]/.test(v)],
];

export default function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const score = useMemo(() => requirements.filter(([, check]) => check(password)).length, [password]);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (score < requirements.length) {
      setError("Please meet all password requirements.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || "Unable to reset your password.");
        return;
      }

      router.push("/login?reset=1");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-xs text-red-200">{error}</div>}

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">New password</span>
          <div className="relative">
            <LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input type={show ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={72} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] pl-11 pr-12 text-sm text-white outline-none focus:border-violet-300/25" placeholder="Create a new password" />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/25 hover:bg-white/[0.05] hover:text-white" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Confirm password</span>
          <input type={show ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} required maxLength={72} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm text-white outline-none focus:border-violet-300/25" placeholder="Repeat the new password" />
        </label>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
          <div className="mb-3 flex gap-1.5">
            {requirements.map(([label, check]) => (
              <span key={label} className={`h-1 flex-1 rounded-full ${check(password) ? "bg-violet-300" : "bg-white/[0.08]"}`} />
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {requirements.map(([label, check]) => (
              <div key={label} className="flex items-center gap-2 text-[10px] text-white/30">
                <span className={`grid h-4 w-4 place-items-center rounded-full ${check(password) ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.04] text-transparent"}`}>
                  <Check size={10} />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black disabled:opacity-50">
          {loading ? <Loader2 size={17} className="animate-spin" /> : "Update password"}
        </button>
      </form>

      <Link href="/login" className="mt-6 inline-block text-xs text-white/30 hover:text-white/70">Back to login</Link>
    </div>
  );
}