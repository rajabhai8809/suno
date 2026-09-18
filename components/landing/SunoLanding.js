"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  CirclePlay,
  Headphones,
  ListMusic,
  Menu,
  Music2,
  Pause,
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

const songs = [
  {
    title: "Kasoor",
    artist: "Prateek Kuhad",
    duration: "3:17",
    code: "K",
    gradient: "from-cyan-300 via-blue-500 to-violet-700",
  },
  {
    title: "Husn",
    artist: "Anuv Jain",
    duration: "3:37",
    code: "H",
    gradient: "from-fuchsia-300 via-violet-500 to-indigo-700",
  },
  {
    title: "Phir Se Ud Chala",
    artist: "Mohit Chauhan",
    duration: "5:31",
    code: "P",
    gradient: "from-orange-300 via-rose-500 to-fuchsia-700",
  },
  {
    title: "Kho Gaye Hum Kahan",
    artist: "Jasleen Royal",
    duration: "3:34",
    code: "K",
    gradient: "from-emerald-300 via-teal-500 to-cyan-700",
  },
];

const roomSteps = [
  {
    number: "01",
    label: "CREATE",
    title: "Open a room.",
    text: "Start a room and get a simple secret code.",
    visual: "create",
  },
  {
    number: "02",
    label: "INVITE",
    title: "Bring your people.",
    text: "Share the code and let up to 10 listeners join.",
    visual: "invite",
  },
  {
    number: "03",
    label: "SYNC",
    title: "Press play together.",
    text: "One shared playback state keeps everybody aligned.",
    visual: "sync",
  },
];

const features = [
  {
    icon: Music2,
    tag: "LIBRARY",
    title: "Your music, everywhere.",
    text: "Upload MP3 files and build a shared music library around your people.",
  },
  {
    icon: Radio,
    tag: "REALTIME",
    title: "One shared heartbeat.",
    text: "Play, pause, seek or change a song and keep the room together.",
  },
  {
    icon: ListMusic,
    tag: "QUEUE",
    title: "Everyone gets a say.",
    text: "A shared queue lets every listener shape what plays next.",
  },
  {
    icon: ShieldCheck,
    tag: "SECURITY",
    title: "Built carefully.",
    text: "Secure accounts, protected uploads, validation and room authorization.",
  },
];

function Waveform({ bars = 26 }) {
  return (
    <div className="suno-wave" aria-hidden="true">
      {Array.from({ length: bars }).map((_, index) => (
        <span
          key={index}
          style={{
            height: `${18 + ((index * 23) % 70)}%`,
            animationDelay: `${index * 55}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Avatar({ text, index = 0 }) {
  const styles = [
    "from-violet-400 to-fuchsia-500",
    "from-cyan-300 to-blue-600",
    "from-orange-300 to-rose-500",
    "from-emerald-300 to-teal-600",
    "from-white/10 to-white/5",
  ];

  return (
    <span
      className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#0c0c11] bg-gradient-to-br ${styles[index % styles.length]} text-[8px] font-bold text-white`}
    >
      {text}
    </span>
  );
}

function Vinyl({ size = "large" }) {
  return (
    <div
      className={`suno-vinyl ${
        size === "small"
          ? "h-28 w-28"
          : "h-44 w-44 sm:h-56 sm:w-56 lg:h-64 lg:w-64"
      }`}
    >
      <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle_at_center,rgba(255,255,255,0.055)_0,rgba(255,255,255,0.055)_1px,transparent_2px,transparent_7px)]" />

      <div className="absolute inset-[9%] rounded-full bg-[conic-gradient(from_25deg,#06b6d4,#6366f1,#d946ef,#fb7185,#06b6d4)] shadow-[0_0_55px_rgba(139,92,246,0.24)]" />

      <div className="absolute inset-[24%] rounded-full bg-[#14141a] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]" />

      <div className="absolute inset-[39%] rounded-full bg-[#09090d] shadow-[0_0_22px_rgba(255,255,255,0.08)]" />

      <div className="absolute inset-[47%] rounded-full bg-white" />
    </div>
  );
}

function HeroPlayer() {
  return (
    <div
      data-hero-player
      className="relative mx-auto w-full max-w-[620px]"
    >
      <div className="suno-hero-glow absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[100px] sm:h-[28rem] sm:w-[28rem]" />

      <div className="relative rounded-[2rem] border border-white/[0.09] bg-white/[0.025] p-2.5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-4">
        <div className="overflow-hidden rounded-[1.55rem] border border-white/[0.07] bg-[#0c0c11]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                <Headphones size={14} />
              </div>

              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] text-white/20">
                  Live room
                </p>
                <p className="mt-1 text-[11px] font-semibold text-white/70">
                  midnight-drive
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-1.5 text-[8px] uppercase tracking-[0.16em] text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              7 online
            </div>
          </div>

          <div className="px-5 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
            <div className="grid place-items-center">
              <div className="relative">
                <div className="absolute inset-0 scale-125 rounded-full bg-fuchsia-500/10 blur-3xl" />

                <Vinyl />

                <div className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/40 text-white shadow-2xl backdrop-blur-xl sm:h-16 sm:w-16">
                  <AudioLines size={21} />
                </div>
              </div>
            </div>

            <div className="mx-auto mt-7 max-w-sm text-center">
              <p className="text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
                Night Changes
              </p>

              <p className="mt-1 text-xs text-white/25">
                everybody hears the same moment
              </p>
            </div>

            <div className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between font-mono text-[9px] text-white/25">
                <span>02:41</span>
                <span>04:11</span>
              </div>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400" />
              </div>

              <div className="mt-3 text-violet-300">
                <Waveform bars={25} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                <Avatar text="TA" index={0} />
                <Avatar text="AK" index={1} />
                <Avatar text="RS" index={2} />
                <Avatar text="+3" index={4} />
              </div>

              <div className="flex items-center gap-2 text-[9px] text-white/20">
                <Check size={12} className="text-emerald-300" />
                synced
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        data-floating
        className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-white/10 bg-[#111117]/90 p-3 shadow-2xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
            <Radio size={15} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-white/70">
              Realtime sync
            </p>
            <p className="mt-1 text-[9px] text-white/25">
              Everyone · 02:41
            </p>
          </div>
        </div>
      </div>

      <div
        data-floating
        className="absolute -right-2 top-10 hidden rounded-2xl border border-white/10 bg-[#111117]/90 p-3 shadow-2xl backdrop-blur-xl sm:block"
      >
        <p className="text-[8px] uppercase tracking-[0.2em] text-white/20">
          Room code
        </p>
        <p className="mt-2 font-mono text-xs font-bold tracking-[0.2em] text-white/75">
          K8M72Q
        </p>
      </div>
    </div>
  );
}

function RoomVisual({ type }) {
  if (type === "create") {
    return (
      <div className="suno-room-visual">
        <div className="suno-room-top">
          <span>NEW ROOM</span>
          <Sparkles size={14} />
        </div>

        <div className="suno-room-code-card">
          <p>YOUR ROOM CODE</p>
          <strong>7K8M2A</strong>

          <div className="mt-5 flex gap-2">
            <span>SECRET CODE</span>
            <span className="success">READY</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[9px] text-white/20">
          <span>Share this code with your people.</span>
          <ArrowRight size={13} />
        </div>
      </div>
    );
  }

  if (type === "invite") {
    const people = ["TA", "AK", "RS", "MN", "DK", "AM", "SR", "+3"];

    return (
      <div className="suno-room-visual">
        <div className="suno-room-top">
          <span>ROOM MEMBERS</span>
          <Users size={14} />
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {people.map((person, index) => (
            <div
              key={person}
              className="grid aspect-square place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.025]"
            >
              <Avatar text={person} index={index} />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
          <p className="text-xs font-semibold text-white/65">
            7 people joined
          </p>

          <p className="mt-1 text-[10px] leading-5 text-white/25">
            The room is ready for everyone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="suno-room-visual">
      <div className="suno-room-top">
        <span>SHARED PLAYBACK</span>
        <Waves size={14} />
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              Night Changes
            </p>

            <p className="mt-1 text-[10px] text-white/25">
              Everyone · 02:41
            </p>
          </div>

          <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-black">
            <Play size={14} fill="currentColor" />
          </div>
        </div>

        <div className="mt-5 text-violet-300">
          <Waveform bars={30} />
        </div>

        <div className="mt-3 flex items-center gap-2 text-[9px] text-emerald-300">
          <Check size={12} />
          all listeners aligned
        </div>
      </div>
    </div>
  );
}

export default function SunoLanding() {
  const pageRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const page = pageRef.current;

    if (!page) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const ctx = gsap.context(() => {
      const progressLine = page.querySelector("[data-scroll-progress]");

      if (reduceMotion) {
        if (progressLine) {
          progressLine.style.width = "0%";
        }

        return;
      }

      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        smoothTouch: false,
      });

      const raf = (time) => {
        lenis.raf(time * 1000);
      };

      lenis.on("scroll", ScrollTrigger.update);

      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      if (progressLine) {
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            progressLine.style.width = `${self.progress * 100}%`;
          },
        });
      }

      const mm = gsap.matchMedia();

      /*
       * HERO
       */
      const heroTl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      heroTl
        .from("[data-hero-eyebrow]", {
          opacity: 0,
          y: 20,
          duration: 0.65,
        })
        .from(
          "[data-hero-line]",
          {
            opacity: 0,
            yPercent: 100,
            duration: 0.85,
            stagger: 0.1,
          },
          "-=0.25",
        )
        .from(
          "[data-hero-copy]",
          {
            opacity: 0,
            y: 18,
            duration: 0.6,
          },
          "-=0.45",
        )
        .from(
          "[data-hero-actions]",
          {
            opacity: 0,
            y: 16,
            duration: 0.6,
          },
          "-=0.4",
        )
        .from(
          "[data-hero-player]",
          {
            opacity: 0,
            y: 45,
            scale: 0.94,
            duration: 0.95,
          },
          "-=0.55",
        );

      /*
       * Desktop / tablet hero parallax.
       * Mobile gets a lighter effect.
       */
      mm.add("(min-width: 768px)", () => {
        gsap.to("[data-hero-player]", {
          yPercent: -8,
          rotateZ: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        gsap.to("[data-hero-glow]", {
          yPercent: 35,
          scale: 1.15,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });

        gsap.to("[data-floating]", {
          y: (index) => (index % 2 === 0 ? -16 : 14),
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      /*
       * Mobile hero.
       */
      mm.add("(max-width: 767px)", () => {
        gsap.to("[data-hero-player]", {
          yPercent: -3,
          scale: 0.98,
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      });

      /*
       * SIMPLE REVEALS
       */
      gsap.utils.toArray("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 42,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 87%",
            toggleActions: "play none none reverse",
          },
        });
      });

      /*
       * LIBRARY STAGGER
       */
      gsap.utils.toArray("[data-library-item]").forEach((item, index) => {
        gsap.from(item, {
          opacity: 0,
          x: index % 2 === 0 ? -25 : 25,
          duration: 0.65,
          delay: index * 0.04,
          ease: "power3.out",
          scrollTrigger: {
            trigger: item,
            start: "top 90%",
          },
        });
      });

      /*
       * ROOM STORY
       *
       * Desktop = sticky visual + animated cards
       * Mobile = normal vertical storytelling
       */
      mm.add("(min-width: 1024px)", () => {
        const roomSection = page.querySelector("[data-room-section]");
        const roomVisual = page.querySelector("[data-room-sticky]");
        const roomSteps = gsap.utils.toArray("[data-room-step]");
        const visuals = gsap.utils.toArray("[data-room-visual]");

        gsap.set(visuals, {
          opacity: 0,
          scale: 0.96,
        });

        gsap.set(visuals[0], {
          opacity: 1,
          scale: 1,
        });

        roomSteps.forEach((step, index) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 52%",
            end: "bottom 52%",
            onEnter: () => {
              visuals.forEach((visual, visualIndex) => {
                gsap.to(visual, {
                  opacity: visualIndex === index ? 1 : 0,
                  scale: visualIndex === index ? 1 : 0.96,
                  duration: 0.45,
                  overwrite: true,
                });
              });
            },
            onEnterBack: () => {
              visuals.forEach((visual, visualIndex) => {
                gsap.to(visual, {
                  opacity: visualIndex === index ? 1 : 0,
                  scale: visualIndex === index ? 1 : 0.96,
                  duration: 0.45,
                  overwrite: true,
                });
              });
            },
          });
        });

        gsap.from(roomVisual, {
          opacity: 0,
          y: 50,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: roomSection,
            start: "top 80%",
          },
        });
      });

      /*
       * MOBILE ROOM CARDS
       */
      mm.add("(max-width: 1023px)", () => {
        gsap.utils.toArray("[data-room-step]").forEach((step) => {
          gsap.from(step, {
            opacity: 0,
            y: 40,
            duration: 0.75,
            ease: "power3.out",
            scrollTrigger: {
              trigger: step,
              start: "top 88%",
            },
          });
        });
      });

      /*
       * FEATURES BENTO
       */
      gsap.utils.toArray("[data-feature]").forEach((card, index) => {
        gsap.from(card, {
          opacity: 0,
          y: 50,
          scale: 0.97,
          duration: 0.75,
          delay: index * 0.06,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
          },
        });
      });

      /*
       * FINAL STATEMENT
       */
      const statement = page.querySelector("[data-statement]");

      if (statement) {
        gsap.from(statement, {
          opacity: 0,
          scale: 0.92,
          y: 35,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: statement,
            start: "top 78%",
          },
        });
      }

      /*
       * Ambient movement
       */
      gsap.to("[data-orbit]", {
        rotate: 360,
        duration: 30,
        ease: "none",
        repeat: -1,
      });

      gsap.to("[data-ambient]", {
        y: -18,
        duration: 3.4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      return () => {
        gsap.ticker.remove(raf);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
        mm.revert();
      };
    }, page);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <main ref={pageRef} className="suno-page">
      {/* GLOBAL PROGRESS */}
      <div className="suno-progress-track">
        <div data-scroll-progress className="suno-progress-line" />
      </div>

      {/* BACKGROUND */}
      <div className="suno-background" aria-hidden="true">
        <div className="suno-bg-glow suno-bg-glow-1" />
        <div className="suno-bg-glow suno-bg-glow-2" />
        <div className="suno-bg-glow suno-bg-glow-3" />
        <div className="suno-grid" />
      </div>

      {/* NAV */}
      <header className="suno-header">
        <div className="suno-container">
          <div className="suno-nav">
            <SunoLogo size="sm" />

            <nav className="hidden items-center gap-7 md:flex">
              <a href="#how">How it works</a>
              <a href="#library">Library</a>
              <a href="#features">Features</a>
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="suno-nav-login">
                Log in
              </Link>

              <Link href="/register" className="suno-nav-cta">
                Get started
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="suno-menu-button md:hidden"
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>

          {menuOpen && (
            <div className="suno-mobile-menu md:hidden">
              <a
                href="#how"
                onClick={() => setMenuOpen(false)}
              >
                How it works
              </a>

              <a
                href="#library"
                onClick={() => setMenuOpen(false)}
              >
                Library
              </a>

              <a
                href="#features"
                onClick={() => setMenuOpen(false)}
              >
                Features
              </a>

              <div className="suno-mobile-actions">
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  Log in
                </Link>

                <Link href="/register" onClick={() => setMenuOpen(false)}>
                  Get started
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* HERO */}
      <section
        data-hero
        className="relative px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8 xl:pb-32 xl:pt-40"
      >
        <div className="suno-container">
          <div className="grid items-center gap-14 xl:grid-cols-[0.9fr_1.1fr] xl:gap-16">
            <div className="min-w-0">
              <div
                data-hero-eyebrow
                className="suno-eyebrow"
              >
                <span />
                Shared listening, reimagined
              </div>

              <div className="mt-7 overflow-hidden [perspective:1000px] sm:mt-9">
                <h1 className="suno-hero-title">
                  <span data-hero-line>Same</span>
                  <span data-hero-line className="muted">
                    song.
                  </span>
                  <span data-hero-line className="gradient">
                    Same moment.
                  </span>
                </h1>
              </div>

              <p
                data-hero-copy
                className="suno-hero-copy"
              >
                Create a room. Invite your people. Pick a song. Suno keeps
                everyone listening to the same moment, together.
              </p>

              <div
                data-hero-actions
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Link href="/register" className="suno-primary-button">
                  Start listening
                  <ArrowRight size={16} />
                </Link>

                <a href="#how" className="suno-secondary-button">
                  Explore Suno
                  <ArrowDown size={15} />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-[9px] uppercase tracking-[0.15em] text-white/25">
                <span className="inline-flex items-center gap-2">
                  <Users size={12} />
                  Up to 10
                </span>

                <span className="inline-flex items-center gap-2">
                  <Upload size={12} />
                  MP3 uploads
                </span>

                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={12} />
                  Secure
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <HeroPlayer />
            </div>
          </div>

          <div className="mt-14 flex items-center justify-center gap-3 text-[9px] uppercase tracking-[0.25em] text-white/15 sm:mt-20">
            <span className="h-px w-7 bg-white/10" />
            Scroll
            <ArrowDown size={11} />
            <span className="h-px w-7 bg-white/10" />
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-48">
        <div className="suno-container">
          <div className="mx-auto max-w-6xl text-center">
            <p data-reveal className="suno-kicker justify-center">
              The idea behind Suno
            </p>

            <h2
              data-reveal
              className="suno-manifesto-title"
            >
              A song is better when{" "}
              <span>someone is there with you.</span>
            </h2>

            <p
              data-reveal
              className="mx-auto mt-8 max-w-2xl text-sm leading-6 text-white/35 sm:text-base sm:leading-7"
            >
              Suno turns listening into a shared moment — with one room, one
              queue and one synchronized timeline.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        data-room-section
        className="border-y border-white/[0.06] bg-white/[0.012] px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40"
      >
        <div className="suno-container">
          <div className="mb-14 max-w-2xl" data-reveal>
            <p className="suno-kicker">How it works</p>

            <h2 className="suno-section-title">
              Three steps.
              <br />
              <span>One shared session.</span>
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-6 text-white/35 sm:text-base">
              The room stays simple for users while the system underneath
              handles synchronization.
            </p>
          </div>

          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            {/* LEFT STORY */}
            <div className="grid gap-12">
              {roomSteps.map((step) => (
                <article
                  key={step.number}
                  data-room-step
                  className="min-w-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="suno-number">
                      {step.number}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-300/70">
                        {step.label}
                      </p>

                      <h3 className="mt-3 text-3xl font-semibold leading-[0.97] tracking-[-0.05em] text-white sm:text-5xl">
                        {step.title}
                      </h3>

                      <p className="mt-4 max-w-md text-sm leading-6 text-white/30 sm:text-base">
                        {step.text}
                      </p>
                    </div>
                  </div>

                  {/* MOBILE VISUAL */}
                  <div className="mt-7 lg:hidden">
                    <div className="suno-story-card">
                      <RoomVisual type={step.visual} />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* DESKTOP STICKY VISUAL */}
            <div
              ref={(node) => {
                if (node) {
                  node.setAttribute("data-room-sticky", "");
                }
              }}
              className="hidden lg:block"
            >
              <div className="suno-room-sticky">
                <div className="suno-story-card">
                  <div
                    data-room-visual
                    className="suno-visual-layer"
                  >
                    <RoomVisual type="create" />
                  </div>

                  <div
                    data-room-visual
                    className="suno-visual-layer"
                  >
                    <RoomVisual type="invite" />
                  </div>

                  <div
                    data-room-visual
                    className="suno-visual-layer"
                  >
                    <RoomVisual type="sync" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-white/20">
                  <span>Scroll to change the scene</span>
                  <span>03 scenes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIBRARY */}
      <section
        id="library"
        className="px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-44"
      >
        <div className="suno-container">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr] lg:items-end">
            <div data-reveal>
              <p className="suno-kicker">Shared library</p>

              <h2 className="suno-section-title">
                More people.
                <br />
                <span>More music.</span>
              </h2>
            </div>

            <p
              data-reveal
              className="max-w-lg text-sm leading-6 text-white/35 sm:text-base"
            >
              Users upload MP3s and the library becomes a shared discovery
              space for every listening room.
            </p>
          </div>

          <div className="mt-12 grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
            <div
              data-reveal
              className="suno-search-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">
                    Search
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white/70">
                    Find the feeling.
                  </p>
                </div>

                <Search size={15} className="text-white/20" />
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3.5">
                <span className="text-xs text-white/20">
                  Search songs or artists...
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {["Arijit Singh", "Anuv Jain", "Prateek Kuhad"].map(
                  (artist) => (
                    <div
                      key={artist}
                      className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-3"
                    >
                      <span className="text-xs text-white/40">
                        {artist}
                      </span>

                      <ChevronRight size={13} className="text-white/15" />
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="grid gap-3">
              {songs.map((song, index) => (
                <div
                  key={`${song.title}-${index}`}
                  data-library-item
                  className="suno-song-row"
                >
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${song.gradient} text-sm font-bold text-white shadow-lg sm:h-14 sm:w-14`}
                  >
                    {song.code}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white/80 sm:text-sm">
                      {song.title}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-white/25 sm:text-xs">
                      {song.artist}
                    </p>
                  </div>

                  <div className="hidden text-violet-300/60 sm:block">
                    <Waveform bars={10} />
                  </div>

                  <span className="font-mono text-[9px] text-white/20">
                    {song.duration}
                  </span>

                  <button
                    type="button"
                    aria-label={`Play ${song.title}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/45 transition hover:bg-white hover:text-black"
                  >
                    <Play size={12} fill="currentColor" />
                  </button>
                </div>
              ))}

              <div
                data-reveal
                className="suno-upload-card"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                    <Upload size={16} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-white/65">
                      Have a song?
                    </p>

                    <p className="mt-1 text-[9px] text-white/20">
                      MP3 only · add it to the shared library
                    </p>
                  </div>
                </div>

                <Link href="/register" className="suno-mini-button">
                  Upload
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="border-y border-white/[0.06] bg-white/[0.012] px-4 py-28 sm:px-6 sm:py-36 lg:px-8 lg:py-44"
      >
        <div className="suno-container">
          <div data-reveal className="max-w-3xl">
            <p className="suno-kicker">Under the surface</p>

            <h2 className="suno-section-title">
              Simple outside.
              <br />
              <span>Serious inside.</span>
            </h2>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  data-feature
                  className={`suno-feature-card ${
                    index === 0 ? "sm:min-h-[340px]" : ""
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-white/55 transition group-hover:text-violet-300">
                        <Icon size={18} />
                      </div>

                      <span className="text-[9px] font-semibold tracking-[0.18em] text-white/15">
                        0{index + 1}
                      </span>
                    </div>

                    <p className="mt-12 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/20">
                      {feature.tag}
                    </p>

                    <h3 className="mt-3 max-w-sm text-2xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-3xl">
                      {feature.title}
                    </h3>

                    <p className="mt-4 max-w-md text-sm leading-6 text-white/30">
                      {feature.text}
                    </p>
                  </div>

                  <div className="suno-feature-glow" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* BIG STATEMENT */}
      <section className="relative px-4 py-32 sm:px-6 sm:py-44 lg:px-8 lg:py-56">
        <div className="suno-container">
          <div
            data-statement
            className="relative mx-auto max-w-6xl text-center"
          >
            <div
              data-orbit
              className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-300/10 sm:h-72 sm:w-72"
            />

            <p className="suno-kicker justify-center">
              The Suno feeling
            </p>

            <h2 className="suno-big-statement">
              Stop listening
              <span> alone.</span>
            </h2>

            <p className="mx-auto mt-8 max-w-xl text-sm leading-6 text-white/30 sm:text-base sm:leading-7">
              Create a room. Share the code. Pick a song. Let the moment
              happen together.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-6 sm:px-6 lg:px-8">
        <div className="suno-container">
          <div className="suno-final-card">
            <div className="suno-final-glow" />

            <div className="relative z-10 text-center">
              <p className="suno-kicker justify-center">
                Ready?
              </p>

              <h2 className="mt-6 text-[clamp(2.7rem,8vw,6.7rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
                Same song.
                <br />
                <span className="text-white/25">
                  Same moment.
                </span>
              </h2>

              <p className="mx-auto mt-7 max-w-xl text-sm leading-6 text-white/30 sm:text-base">
                Your room is waiting.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="suno-primary-button">
                  Create your account
                  <ArrowUpRight size={15} />
                </Link>

                <Link href="/login" className="suno-secondary-button">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 pb-8 pt-14 sm:px-6 lg:px-8">
        <div className="suno-container border-t border-white/[0.06] pt-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <SunoLogo size="sm" />

              <p className="mt-3 max-w-sm text-[10px] leading-5 text-white/20">
                Shared listening for people who want the moment, not just the
                song.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-[9px] uppercase tracking-[0.16em] text-white/20">
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
              <a href="#how">How it works</a>
              <a href="#library">Library</a>
              <a href="#features">Features</a>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-2 border-t border-white/[0.05] pt-6 text-[9px] uppercase tracking-[0.16em] text-white/15 sm:flex-row">
            <span>© 2026 Suno</span>
            <span>Listen together.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}