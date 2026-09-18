"use client";

import Link from "next/link";
import { Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const requirements = [
  ["At least 12 characters", (value) => value.length >= 12],
  ["One uppercase letter", (value) => /[A-Z]/.test(value)],
  ["One lowercase letter", (value) => /[a-z]/.test(value)],
  ["One number", (value) => /[0-9]/.test(value)],
  ["One special character", (value) => /[^A-Za-z0-9]/.test(value)],
];

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const score = useMemo(
    () => requirements.filter(([, check]) => check(password)).length,
    [password],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.message || "Unable to create your account.");
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/[0.04] px-4 py-3 text-xs leading-5 text-red-200">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/[0.1] bg-white/[0.035] text-sm font-semibold text-white/75 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {googleLoading ? <Loader2 size={17} className="animate-spin" /> : ""}
        {!googleLoading && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.68l-3.57-2.75c-.98.66-2.23 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A10.99 10.99 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.09V7.07H2.15A10.99 10.99 0 0 0 1 12c0 1.77.42 3.44 1.15 4.93l3.69-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.08.56 4.23 1.66l3.17-3.17C17.45 2.01 14.97 1 12 1A10.99 10.99 0 0 0 2.15 7.07l3.69 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
        )}
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.07]" />
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/20">or</span>
        <span className="h-px flex-1 bg-white/[0.07]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Name</span>
          <div className="relative">
            <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} autoComplete="name" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" placeholder="Your name" />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Email</span>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" placeholder="you@example.com" />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Password</span>
          <div className="relative">
            <LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
            <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={72} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] pl-11 pr-12 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" placeholder="Create a strong password" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/25 hover:bg-white/[0.05] hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Confirm password</span>
          <input type={showPassword ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} required maxLength={72} autoComplete="new-password" className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-300/25" placeholder="Repeat your password" />
        </label>

        {password && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/25">Password strength</span>
              <span className="text-[10px] font-semibold text-white/45">{score}/{requirements.length}</span>
            </div>
            <div className="mb-4 flex gap-1.5">
              {requirements.map(([label, check], index) => (
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
        )}

        <button type="submit" disabled={loading || googleLoading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Loader2 size={17} className="animate-spin" /> : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/30">
        Already have an account? {" "}
        <Link href="/login" className="font-semibold text-white/65 hover:text-white">Sign in</Link>
      </p>
    </div>
  );
}