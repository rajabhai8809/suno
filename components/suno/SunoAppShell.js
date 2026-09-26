"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Headphones,
  Heart,
  Home,
  LibraryBig,
  ListMusic,
  Menu,
  Search,
  Settings,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import SunoLogo from "@/components/brand/SunoLogo";
import SunoGlobalPlayer from "@/components/player/SunoGlobalPlayer";

const primaryNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/rooms", label: "Rooms", icon: UsersRound },
];

const secondaryNav = [
  { href: "/my-uploads", label: "My uploads", icon: ListMusic },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/upload", label: "Upload music", icon: Upload },
];

const bottomNav = [
  primaryNav[0],
  primaryNav[1],
  primaryNav[2],
  primaryNav[3],
  { href: "/profile", label: "You", icon: Settings },
];

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitial(name) {
  const value = String(name || "").trim();
  return value ? value.charAt(0).toUpperCase() : "S";
}

function NavLink({ item, pathname, onNavigate, mobile = false }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex min-w-0 items-center rounded-2xl transition-all duration-200",
        mobile ? "gap-3 px-3 py-3.5" : "gap-3 px-3 py-3",
        active
          ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]"
          : "text-white/45 hover:bg-white/[0.045] hover:text-white/85",
      ].join(" ")}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
          active
            ? "border-violet-300/15 bg-violet-300/10 text-violet-100"
            : "border-white/[0.06] bg-white/[0.025] text-white/35 group-hover:text-white/70"
        }`}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.1 : 1.8} />
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {item.label}
      </span>

      {active ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,.85)]" />
      ) : null}
    </Link>
  );
}

export default function SunoAppShell({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const session = await response.json().catch(() => null);
        if (alive) setUserName(session?.user?.name || "");
      } catch {
        // Keep the branded fallback initial.
      }
    }

    void loadSession();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const initial = useMemo(() => getInitial(userName), [userName]);

  function handleNavigate() {
    setNavigating(true);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#07070b] text-white selection:bg-violet-300/20 selection:text-violet-100">
      {navigating ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] bg-white/[0.05]">
          <div className="h-full w-1/3 animate-[pulse_900ms_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-200" />
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-white/[0.06] bg-[#09090e]/95 px-3 backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="flex h-20 shrink-0 items-center px-2">
          <Link href="/dashboard" prefetch={false} className="rounded-2xl px-2 py-2">
            <SunoLogo />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
            Browse
          </p>
          <div className="space-y-1">
            {primaryNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={handleNavigate} />
            ))}
          </div>

          <div className="my-5 h-px bg-white/[0.06]" />

          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
            Your space
          </p>
          <div className="space-y-1">
            {secondaryNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={handleNavigate} />
            ))}
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-violet-300/10 bg-gradient-to-br from-violet-400/[0.10] via-fuchsia-400/[0.05] to-transparent p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-violet-200">
              <Headphones className="h-4 w-4" />
            </div>
            <p className="mt-4 text-sm font-semibold">Listen together</p>
            <p className="mt-1 text-xs leading-5 text-white/35">
              Create a room and keep everyone on the same song.
            </p>
            <Link
              href="/rooms"
              prefetch={false}
              onClick={handleNavigate}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-200 hover:text-white"
            >
              Open rooms <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.06] py-3">
          <Link
            href="/profile"
            prefetch={false}
            onClick={handleNavigate}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3 transition hover:bg-white/[0.05]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-300/20 to-fuchsia-300/10 text-xs font-semibold text-violet-100">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold text-white/80">
                {userName || "My account"}
              </strong>
              <small className="block truncate text-[10px] text-white/30">
                Profile & settings
              </small>
            </span>
            <Settings className="h-4 w-4 shrink-0 text-white/25" />
          </Link>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[248px]">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07070b]/90 px-3 py-2.5 backdrop-blur-2xl sm:px-5 lg:hidden">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-white/70 transition active:scale-[0.98]"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/dashboard" prefetch={false} className="min-w-0">
              <SunoLogo size="sm" />
            </Link>

            <Link
              href="/profile"
              prefetch={false}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/10 bg-gradient-to-br from-violet-300/15 to-fuchsia-300/10 text-sm font-semibold text-violet-100"
              aria-label="Open profile"
            >
              {initial}
            </Link>
          </div>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />

            <aside className="absolute inset-y-0 left-0 flex w-[min(86vw,360px)] flex-col border-r border-white/[0.08] bg-[#09090f] shadow-2xl shadow-black/70">
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-4">
                <Link href="/dashboard" prefetch={false} onClick={handleNavigate} className="min-w-0">
                  <SunoLogo />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/55"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5">
                <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
                  Browse
                </div>
                <div className="space-y-1">
                  {primaryNav.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} onNavigate={handleNavigate} mobile />
                  ))}
                </div>

                <div className="my-5 h-px bg-white/[0.06]" />

                <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20">
                  Your space
                </div>
                <div className="space-y-1">
                  {secondaryNav.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} onNavigate={handleNavigate} mobile />
                  ))}
                </div>

                <Link
                  href="/rooms"
                  prefetch={false}
                  onClick={handleNavigate}
                  className="mt-6 block overflow-hidden rounded-3xl border border-violet-300/10 bg-gradient-to-br from-violet-500/[0.12] via-white/[0.02] to-fuchsia-500/[0.08] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-violet-200">
                      <UsersRound className="h-4 w-4" />
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/25" />
                  </div>
                  <p className="mt-4 text-sm font-semibold">Listen together</p>
                  <p className="mt-1 text-xs leading-5 text-white/35">
                    Create a room and listen with your people in sync.
                  </p>
                </Link>
              </div>

              <div className="shrink-0 border-t border-white/[0.06] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <Link
                  href="/profile"
                  prefetch={false}
                  onClick={handleNavigate}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-300/20 to-fuchsia-300/10 text-sm font-semibold text-violet-100">
                    {initial}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-semibold text-white/80">
                      {userName || "My account"}
                    </strong>
                    <small className="block truncate text-[10px] text-white/30">
                      Profile & settings
                    </small>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
                </Link>
              </div>
            </aside>
          </div>
        ) : null}

        <main className="min-h-screen min-w-0 overflow-x-clip pb-[142px] pt-3 sm:pb-[150px] lg:pb-28 lg:pt-6">
          <div className="mx-auto w-full max-w-[1440px] min-w-0 px-3 sm:px-5 lg:px-7 xl:px-9">
            {children}
          </div>
        </main>

        <SunoGlobalPlayer />

        <nav
          className="fixed inset-x-2 bottom-2 z-40 rounded-[1.7rem] border border-white/[0.08] bg-[#0c0c12]/95 p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 backdrop-blur-2xl lg:hidden"
          aria-label="Primary navigation"
        >
          <div className="grid grid-cols-5 gap-1">
            {bottomNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={handleNavigate}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2.5 text-[10px] font-medium transition active:scale-[0.98] ${
                    active ? "bg-white/[0.09] text-white" : "text-white/35 hover:text-white/70"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-violet-200" : ""}`} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}