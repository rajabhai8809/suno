import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/auth";

export const metadata = {
  title: "Dashboard",
  description: "Your Suno account dashboard.",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <main className="min-h-screen bg-[#07070b] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-3 backdrop-blur-xl sm:px-5">
          <Link href="/" className="text-sm font-semibold">Suno</Link>
          <form action={logoutAction}>
            <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs text-white/60 hover:text-white">
              <LogOut size={13} />
              Sign out
            </button>
          </form>
        </header>

        <section className="mt-5 rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <ShieldCheck size={17} />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/70">Authenticated</p>
              <p className="mt-1 text-[10px] text-white/25">Phase 2 test dashboard</p>
            </div>
          </div>

          <h1 className="mt-10 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
            Hi, {session.user.name || "there"}.
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/30">
            Your Suno authentication layer is active. Music rooms and the rest of the product will land in later phases.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">Email</p>
              <p className="mt-2 truncate text-xs text-white/55">{session.user.email}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">Role</p>
              <p className="mt-2 text-xs text-white/55">{session.user.role}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.018] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/20">Verification</p>
              <p className="mt-2 text-xs text-emerald-300">Verified</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}