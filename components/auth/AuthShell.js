import Link from "next/link";
import { ArrowRight, AudioLines, Headphones, Radio, ShieldCheck, Users } from "lucide-react";
import SunoLogo from "@/components/brand/SunoLogo";

export default function AuthShell({ title, description, children, footer }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07070b] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-48 -right-48 h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/8 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-10">
        <section className="order-2 hidden min-h-[720px] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-5 lg:order-1 lg:block">
          <div className="flex h-full flex-col justify-between rounded-[1.6rem] border border-white/[0.06] bg-[#0c0c11] p-8">
            <div>
              <SunoLogo />

              <div className="mt-28 max-w-lg">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/65">
                  Shared listening
                </p>
                <h2 className="mt-5 text-6xl font-semibold leading-[0.9] tracking-[-0.065em]">
                  Same song.
                  <br />
                  <span className="text-white/25">Same moment.</span>
                </h2>
                <p className="mt-7 max-w-md text-sm leading-7 text-white/30">
                  Create rooms, discover music and listen together in realtime.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                [Users, "10", "listeners"],
                [Radio, "1", "shared room"],
                [ShieldCheck, "100%", "security focus"],
              ].map(([Icon, value, label]) => (
                <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <Icon size={15} className="text-white/35" />
                  <p className="mt-7 text-lg font-semibold tracking-[-0.04em]">{value}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.13em] text-white/20">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="order-1 flex min-h-screen items-center justify-center py-10 lg:order-2 lg:min-h-0 lg:py-0">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <SunoLogo />
            </div>

            <div className="mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/65">
                Suno
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/35">
                {description}
              </p>
            </div>

            {children}

            {footer && <div className="mt-7">{footer}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}