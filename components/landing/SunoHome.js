"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronDown,
  Headphones,
  ListMusic,
  Menu,
  Music2,
  Play,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Waves,
  X,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import SunoLogo from "@/components/brand/SunoLogo";

gsap.registerPlugin(ScrollTrigger);

const librarySongs = [
  {
    title: "Phir Se Ud Chala",
    artist: "Mohit Chauhan",
    duration: "5:31",
    accent: "from-orange-300 via-rose-400 to-fuchsia-600",
    glyph: "FU",
  },
  {
    title: "Kasoor",
    artist: "Prateek Kuhad",
    duration: "3:17",
    accent: "from-cyan-300 via-sky-500 to-indigo-600",
    glyph: "KS",
  },
  {
    title: "Husn",
    artist: "Anuv Jain",
    duration: "3:37",
    accent: "from-violet-300 via-purple-500 to-fuchsia-700",
    glyph: "HS",
  },
];

const features = [
  {
    number: "01",
    icon: Users,
    title: "One room. Everyone together.",
    description:
      "Create a room, share the code, and let up to 10 people listen in perfect sync.",
  },
  {
    number: "02",
    icon: Music2,
    title: "Your music, your library.",
    description:
      "Upload MP3 files and build a shared music library that everyone can discover.",
  },
  {
    number: "03",
    icon: ListMusic,
    title: "A queue everyone can shape.",
    description:
      "Anyone in the room can add songs and keep the listening session moving.",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Designed with security in mind.",
    description:
      "Secure accounts, protected uploads, room controls, validation, and abuse protection.",
  },
];

function Waveform({ small = false }) {
  const heights = [20, 36, 24, 54, 34, 70, 43, 59, 29, 48, 66, 38, 58, 26, 44];

  return (
    <div
      className={`flex items-center gap-[3px] ${
        small ? "h-8" : "h-14"
      }`}
      aria-hidden="true"
    >
      {heights.map((height, index) => (
        <span
          key={index}
          className="wave-bar w-[3px] rounded-full bg-white/70"
          style={{
            height: small ? `${Math.max(12, height / 2)}%` : `${height}%`,
            animationDelay: `${index * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Avatar({ initials, index }) {
  const gradients = [
    "from-violet-400 to-fuchsia-500",
    "from-cyan-400 to-blue-600",
    "from-amber-300 to-orange-500",
    "from-emerald-300 to-teal-600",
    "from-pink-300 to-rose-600",
  ];

  return (
    <div
      className={`grid h-9 w-9 place-items-center rounded-full border-2 border-[#0c0c10] bg-gradient-to-br ${gradients[index % gradients.length]} text-[10px] font-bold text-white shadow-lg`}
    >
      {initials}
    </div>
  );
}

export default function SunoHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(
          "[data-hero], [data-reveal], [data-parallax]",
          { clearProps: "all" },
        );
        return;
      }

      const lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        syncTouch: false,
      });

      lenis.on("scroll", ScrollTrigger.update);

      const update = (time) => {
        lenis.raf(time * 1000);
      };

      gsap.ticker.add(update);
      gsap.ticker.lagSmoothing(0);

      const hero = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      hero
        .from("[data-hero='eyebrow']", {
          opacity: 0,
          y: 24,
          duration: 0.8,
        })
        .from(
          "[data-hero='title'] .hero-line",
          {
            opacity: 0,
            yPercent: 110,
            rotateX: -35,
            stagger: 0.12,
            duration: 1,
          },
          "-=0.45",
        )
        .from(
          "[data-hero='copy']",
          {
            opacity: 0,
            y: 18,
            duration: 0.7,
          },
          "-=0.55",
        )
        .from(
          "[data-hero='actions']",
          {
            opacity: 0,
            y: 18,
            duration: 0.7,
          },
          "-=0.45",
        )
        .from(
          "[data-hero='meta']",
          {
            opacity: 0,
            y: 14,
            duration: 0.6,
          },
          "-=0.4",
        )
        .from(
          "[data-hero='visual']",
          {
            opacity: 0,
            y: 40,
            scale: 0.94,
            rotateX: 10,
            duration: 1.15,
          },
          "-=0.7",
        );

      gsap.utils.toArray("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 55,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 86%",
            toggleActions: "play none none reverse",
          },
        });
      });

      gsap.utils.toArray("[data-stagger]").forEach((group) => {
        const items = group.querySelectorAll("[data-stagger-item]");

        gsap.from(items, {
          opacity: 0,
          y: 35,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: group,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
      });

      gsap.to("[data-parallax='orb']", {
        yPercent: 28,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-parallax='section']",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to("[data-parallax='mockup']", {
        yPercent: -10,
        rotate: -1,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-parallax='section']",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.utils.toArray("[data-line]").forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "power4.out",
            scrollTrigger: {
              trigger: line,
              start: "top 88%",
            },
          },
        );
      });

      return () => {
        gsap.ticker.remove(update);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      };
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      ctx.revert();
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#07070a] text-white">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-[-15rem] top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-violet-700/15 blur-[130px]" />
        <div className="absolute right-[-12rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/10 blur-[130px]" />
        <div className="absolute bottom-[-16rem] left-[25%] h-[30rem] w-[30rem] rounded-full bg-blue-600/10 blur-[130px]" />
      </div>

      {/* Navigation */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.07] bg-[#07070a]/75 backdrop-blur-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <SunoLogo />

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#experience"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Experience
            </a>
            <a
              href="#rooms"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Rooms
            </a>
            <a
              href="#library"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Library
            </a>
            <a
              href="#features"
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              Features
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-white/75 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-[0_10px_35px_rgba(255,255,255,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/90"
            >
              Start listening
              <ArrowRight
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] md:hidden"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/[0.07] bg-[#0a0a0e]/95 px-5 pb-5 pt-3 backdrop-blur-2xl md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                ["Experience", "#experience"],
                ["Rooms", "#rooms"],
                ["Library", "#library"],
                ["Features", "#features"],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                >
                  {label}
                </a>
              ))}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-2xl border border-white/10 py-3 text-center text-sm font-medium text-white/80"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-2xl bg-white py-3 text-center text-sm font-semibold text-black"
                  onClick={() => setMenuOpen(false)}
                >
                  Start
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative flex min-h-screen items-center px-5 pb-16 pt-32 sm:px-8 lg:px-10 lg:pb-20 lg:pt-36">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-10">
            <div
              data-hero="eyebrow"
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.045] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55 backdrop-blur-xl"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-300" />
              </span>
              Shared listening, reimagined
            </div>

            <div
              data-hero="title"
              className="max-w-4xl overflow-hidden [perspective:900px]"
            >
              <h1 className="text-[clamp(3.7rem,9vw,8rem)] font-semibold leading-[0.89] tracking-[-0.07em] text-white">
                <span className="hero-line block">Listen</span>
                <span className="hero-line block text-white/55">
                  together.
                </span>
                <span className="hero-line block">
                  Feel <span className="text-gradient">closer.</span>
                </span>
              </h1>
            </div>

            <p
              data-hero="copy"
              className="mt-8 max-w-xl text-base leading-7 text-white/55 sm:text-lg"
            >
              Suno turns music into a shared experience. Create a room, invite
              your people, and keep every play, pause, seek and song change in
              sync.
            </p>

            <div
              data-hero="actions"
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black shadow-[0_20px_50px_rgba(255,255,255,0.13)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_65px_rgba(255,255,255,0.18)]"
              >
                Start listening free
                <ArrowRight
                  size={17}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <a
                href="#experience"
                className="group inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-6 py-3.5 text-sm font-medium text-white/80 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.08] hover:text-white"
              >
                Explore Suno
                <ArrowDownRight
                  size={17}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5"
                />
              </a>
            </div>

            <div
              data-hero="meta"
              className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/35"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={14} />
                Secure accounts
              </span>
              <span className="inline-flex items-center gap-2">
                <Users size={14} />
                Up to 10 listeners
              </span>
              <span className="inline-flex items-center gap-2">
                <Upload size={14} />
                MP3 uploads
              </span>
            </div>
          </div>

          {/* Hero visual */}
          <div
            data-hero="visual"
            data-parallax="section"
            className="relative mx-auto w-full max-w-[620px]"
          >
            <div
              data-parallax="orb"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-500/30 via-fuchsia-500/15 to-transparent blur-[80px]"
            />

            <div className="relative aspect-[0.9] overflow-hidden rounded-[2rem] border border-white/[0.09] bg-white/[0.035] p-3 shadow-[0_45px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_45%)]" />

              <div
                data-parallax="mockup"
                className="relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#101015]"
              >
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-white/65">
                      Room · midnight-drive
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 text-[11px] text-white/35">
                    <Users size={13} />
                    7 listening
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 sm:p-7">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                        Live sync
                      </span>

                      <div className="flex -space-x-2">
                        <Avatar initials="TA" index={0} />
                        <Avatar initials="AK" index={1} />
                        <Avatar initials="RS" index={2} />
                        <Avatar initials="MN" index={3} />
                        <Avatar initials="+3" index={4} />
                      </div>
                    </div>

                    <div className="mt-8 grid place-items-center">
                      <div className="relative aspect-square w-[68%] max-w-[290px] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-orange-300 via-rose-500 to-purple-700 p-[1px] shadow-[0_30px_70px_rgba(168,85,247,0.22)]">
                        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[1.95rem] bg-[#16131d]">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(251,146,60,0.34),transparent_42%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.25),transparent_38%)]" />

                          <div className="relative grid h-24 w-24 place-items-center rounded-full border border-white/20 bg-white/[0.08] shadow-2xl backdrop-blur-md sm:h-28 sm:w-28">
                            <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-black shadow-xl sm:h-16 sm:w-16">
                              <Play size={22} fill="currentColor" />
                            </div>
                          </div>

                          <span className="relative mt-5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/45">
                            Suno session
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto mt-7 max-w-md text-center">
                      <p className="text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl">
                        Night Changes
                      </p>
                      <p className="mt-1 text-sm text-white/35">
                        Shared listening session
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/30">
                        <span>Now playing</span>
                        <span>02:41 / 04:11</span>
                      </div>

                      <Waveform />

                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          aria-label="Previous song preview"
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                        >
                          <ChevronDown className="rotate-90" size={15} />
                        </button>
                        <button
                          type="button"
                          aria-label="Play preview"
                          className="grid h-12 w-12 place-items-center rounded-full bg-white text-black shadow-xl"
                        >
                          <Play size={18} fill="currentColor" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next song preview"
                          className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70"
                        >
                          <ChevronDown className="-rotate-90" size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-7 -left-4 hidden w-44 rounded-2xl border border-white/10 bg-[#121218]/90 p-4 shadow-2xl backdrop-blur-xl sm:block">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
                  <Radio size={17} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Perfectly synced
                  </p>
                  <p className="mt-1 text-[10px] text-white/35">
                    Everyone is at 02:41
                  </p>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -right-3 top-16 hidden w-48 rounded-2xl border border-white/10 bg-[#121218]/90 p-4 shadow-2xl backdrop-blur-xl sm:block">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Room code
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold tracking-[0.22em] text-white">
                  7K8M2A
                </span>
                <span className="text-[10px] text-emerald-400">
                  7 online
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-white/20 lg:flex">
          <span className="h-px w-10 bg-white/10" />
          Scroll to explore
          <span className="h-px w-10 bg-white/10" />
        </div>
      </section>

      {/* EXPERIENCE */}
      <section
        id="experience"
        className="relative px-5 py-28 sm:px-8 lg:px-10 lg:py-40"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div data-reveal>
              <p className="section-kicker">The experience</p>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl">
                Music feels different when nobody is listening alone.
              </h2>
            </div>

            <div data-reveal className="lg:justify-self-end">
              <p className="max-w-xl text-base leading-7 text-white/45 sm:text-lg">
                Suno is built around the moment that matters: pressing play
                together. No complicated setup. No separate timelines. Just
                one shared listening space.
              </p>
            </div>
          </div>

          <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.025]">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative min-h-[480px] overflow-hidden p-6 sm:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.18),transparent_35%),linear-gradient(to_bottom_right,rgba(255,255,255,0.04),transparent_48%)]" />

                <div className="relative flex h-full min-h-[430px] flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/30">
                        Room activity
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-[-0.04em]">
                        Friday, 11:48 PM
                      </p>
                    </div>

                    <div className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-300">
                      Live
                    </div>
                  </div>

                  <div className="relative mx-auto w-full max-w-2xl">
                    <div className="absolute left-[7%] right-[7%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

                    <div className="grid grid-cols-5 gap-2 sm:gap-4">
                      {[
                        ["TA", "Play"],
                        ["AK", "Pause"],
                        ["RS", "Queue"],
                        ["MN", "Seek"],
                        ["+3", "Listening"],
                      ].map(([initials, action], index) => (
                        <div
                          key={initials}
                          className="relative z-10 flex flex-col items-center"
                        >
                          <div className="rounded-full border border-white/10 bg-[#131319] p-1 shadow-xl">
                            <Avatar initials={initials} index={index} />
                          </div>
                          <span className="mt-3 text-[10px] font-medium text-white/30">
                            {action}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["01", "One shared clock"],
                      ["07", "Listeners online"],
                      ["100%", "Room synced"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
                      >
                        <p className="text-xl font-semibold tracking-[-0.04em] text-white">
                          {value}
                        </p>
                        <p className="mt-1 text-[11px] text-white/30">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.07] p-6 sm:p-10 lg:border-l lg:border-t-0">
                <p className="section-kicker">Why it works</p>

                <div className="mt-8 space-y-7">
                  {[
                    [
                      "01",
                      "Create a room",
                      "Start a room in a couple of taps and get a unique code.",
                    ],
                    [
                      "02",
                      "Share the code",
                      "Your friends join with the room code. No public room directory.",
                    ],
                    [
                      "03",
                      "Press play",
                      "Every listener receives the same playback state in realtime.",
                    ],
                  ].map(([number, title, description]) => (
                    <div key={number} className="flex gap-4">
                      <div className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-violet-300">
                        {number}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/40">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="my-8 h-px bg-white/[0.07]" />

                <div className="rounded-2xl border border-violet-400/15 bg-violet-400/[0.06] p-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-violet-300">
                      <Sparkles size={17} />
                    </div>
                    <p className="text-sm leading-6 text-white/55">
                      The room stays authoritative on the server, so
                      reconnecting users can receive the current playback state
                      instead of guessing where the song is.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROOMS */}
      <section
        id="rooms"
        data-parallax="section"
        className="relative border-y border-white/[0.06] bg-white/[0.015] px-5 py-28 sm:px-8 lg:px-10 lg:py-40"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div data-reveal>
              <p className="section-kicker">Rooms</p>

              <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Your room has one heartbeat.
              </h2>

              <p className="mt-7 max-w-xl text-base leading-7 text-white/45 sm:text-lg">
                Anyone can control the music. Add a song, change tracks, pause
                the room or jump to another moment — everyone follows the same
                session.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {["Up to 10 people", "Shared queue", "Realtime sync"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-xs text-white/45"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div
              data-reveal
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="absolute -inset-10 rounded-full bg-violet-500/10 blur-[90px]" />

              <div className="relative rounded-[2rem] border border-white/[0.08] bg-[#101015] p-4 shadow-[0_40px_100px_rgba(0,0,0,0.42)] sm:p-6">
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-5">
                  <div>
                    <p className="text-xs text-white/30">Room code</p>
                    <p className="mt-1 font-mono text-base font-semibold tracking-[0.18em] text-white">
                      K4P9XR
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-white/45"
                  >
                    Copy
                  </button>
                </div>

                <div className="grid gap-4 py-6 sm:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
                      Listening now
                    </p>

                    <div className="mt-6 grid place-items-center">
                      <div className="grid h-32 w-32 place-items-center rounded-[1.7rem] bg-gradient-to-br from-violet-300 via-fuchsia-500 to-blue-600 shadow-2xl">
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-black/20 backdrop-blur-md">
                          <Headphones size={25} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-semibold text-white">
                        After Hours
                      </p>
                      <p className="mt-1 text-xs text-white/30">
                        Shared room queue
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
                        Queue
                      </p>
                      <ListMusic size={14} className="text-white/25" />
                    </div>

                    <div className="mt-5 space-y-2">
                      {librarySongs.map((song, index) => (
                        <div
                          key={song.title}
                          className="flex items-center gap-3 rounded-xl border border-transparent bg-white/[0.025] p-3 transition hover:border-white/[0.06] hover:bg-white/[0.04]"
                        >
                          <div
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${song.accent} text-[9px] font-bold text-white`}
                          >
                            {song.glyph}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white/75">
                              {index + 1}. {song.title}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-white/25">
                              {song.artist}
                            </p>
                          </div>

                          <span className="font-mono text-[9px] text-white/20">
                            {song.duration}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-violet-400/10 bg-violet-400/[0.05] p-3 text-[10px] leading-5 text-white/35">
                      Anyone in the room can add a track to this queue.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIBRARY */}
      <section
        id="library"
        className="relative px-5 py-28 sm:px-8 lg:px-10 lg:py-40"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div data-reveal>
              <p className="section-kicker">Your music library</p>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Upload once. Discover everywhere.
              </h2>
            </div>

            <div data-reveal className="max-w-md">
              <p className="text-base leading-7 text-white/40">
                Every user can contribute an MP3. Your shared library becomes
                the place where rooms find their next song.
              </p>
            </div>
          </div>

          <div data-stagger className="mt-14">
            <div className="mb-5 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-white/60">
                <Search size={15} />
                Discover
              </div>

              <span className="text-[10px] uppercase tracking-[0.18em] text-white/20">
                Shared library
              </span>
            </div>

            <div className="grid gap-3">
              {librarySongs.map((song, index) => (
                <div
                  key={song.title}
                  data-stagger-item
                  className="group flex items-center gap-4 rounded-[1.35rem] border border-white/[0.07] bg-white/[0.025] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.11] hover:bg-white/[0.045] sm:p-4"
                >
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${song.accent} text-xs font-bold text-white shadow-lg`}
                  >
                    {song.glyph}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {song.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-white/30">
                      {song.artist}
                    </p>
                  </div>

                  <div className="hidden items-center gap-2 sm:flex">
                    <Waveform small />
                  </div>

                  <span className="font-mono text-[10px] text-white/20">
                    {song.duration}
                  </span>

                  <button
                    type="button"
                    aria-label={`Play ${song.title}`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition group-hover:bg-white group-hover:text-black"
                  >
                    <Play size={15} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>

            <div
              data-stagger-item
              className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.015] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Upload size={18} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Have a track to add?
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    Upload MP3 and make it available to the shared library.
                  </p>
                </div>
              </div>

              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white hover:text-black"
              >
                Create account
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="border-y border-white/[0.06] bg-white/[0.015] px-5 py-28 sm:px-8 lg:px-10 lg:py-40"
      >
        <div className="mx-auto max-w-7xl">
          <div data-reveal className="max-w-3xl">
            <p className="section-kicker">Built for the long run</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
              Simple to use. Serious underneath.
            </h2>
          </div>

          <div
            data-stagger
            className="mt-14 grid overflow-hidden rounded-[2rem] border border-white/[0.08] md:grid-cols-2"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.number}
                  data-stagger-item
                  className={`group relative p-7 sm:p-9 ${
                    index % 2 !== 0 ? "md:border-l" : ""
                  } ${index > 1 ? "border-t" : ""} border-white/[0.08]`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.11),transparent_38%)]" />
                  </div>

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition duration-300 group-hover:-translate-y-1 group-hover:bg-violet-500/10 group-hover:text-violet-300">
                        <Icon size={18} />
                      </div>

                      <span className="text-[10px] font-semibold tracking-[0.16em] text-white/20">
                        {feature.number}
                      </span>
                    </div>

                    <h3 className="mt-14 max-w-sm text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                      {feature.title}
                    </h3>

                    <p className="mt-4 max-w-md text-sm leading-6 text-white/35">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STORY / BIG STATEMENT */}
      <section className="relative px-5 py-32 sm:px-8 lg:px-10 lg:py-48">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
          <div className="mx-auto h-[26rem] max-w-4xl rounded-full bg-violet-500/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <p data-reveal className="section-kicker">
            The Suno idea
          </p>

          <h2
            data-reveal
            className="mt-7 text-[clamp(2.8rem,7vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-white"
          >
            The song is only half the experience.
          </h2>

          <div
            data-reveal
            data-line
            className="mx-auto mt-10 h-px max-w-xl origin-left bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          <p
            data-reveal
            className="mx-auto mt-8 max-w-2xl text-base leading-7 text-white/40 sm:text-lg"
          >
            The other half is the person on the other side of the room,
            listening to exactly what you are hearing.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-8 sm:px-8 lg:px-10">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.2rem] border border-white/[0.09] bg-[#111117] px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.2),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.15),transparent_30%)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div data-reveal>
              <p className="section-kicker">Ready when you are</p>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl">
                Bring your people.
                <br />
                Press play.
              </h2>
            </div>

            <div data-reveal className="flex flex-col items-start gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition duration-300 hover:-translate-y-1"
              >
                Create your Suno account
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <p className="max-w-xs text-xs leading-5 text-white/30">
                Secure authentication and the full room experience come next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-5 pb-8 pt-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl border-t border-white/[0.07] pt-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <SunoLogo size="sm" />
              <p className="mt-3 max-w-sm text-xs leading-5 text-white/25">
                A shared listening experience built around your music and your
                people.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/30">
              <Link href="/login" className="transition hover:text-white">
                Login
              </Link>
              <Link href="/register" className="transition hover:text-white">
                Register
              </Link>
              <a
                href="#experience"
                className="transition hover:text-white"
              >
                Experience
              </a>
              <a href="#features" className="transition hover:text-white">
                Features
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/[0.05] pt-6 text-[10px] uppercase tracking-[0.16em] text-white/15 sm:flex-row">
            <span>© 2026 Suno</span>
            <span>Listen together.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}