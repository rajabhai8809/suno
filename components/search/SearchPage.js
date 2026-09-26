"use client";

import { Search, Sparkles, UploadCloud, UsersRound } from "lucide-react";
import Link from "next/link";
import Library from "@/components/library/Library";

export default function SearchPage() {
  return (
    <div className="space-y-6 pb-10 sm:space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-white/[0.055] via-white/[0.025] to-violet-500/[0.07] p-5 sm:p-7 lg:p-9">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/10 bg-violet-300/[0.07] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-200">
            <Sparkles className="h-3 w-3" /> Search Suno
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl lg:text-5xl">
            Find something to play.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">
            Search across songs, artists, albums, genres and languages without loading the entire library into the page.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/library" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-black">
              <Search className="h-3.5 w-3.5" /> Browse all music
            </Link>
            <Link href="/my-uploads" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/55 hover:text-white">
              My uploads
            </Link>
            <Link href="/rooms" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/55 hover:text-white">
              <UsersRound className="h-3.5 w-3.5" /> Listen together
            </Link>
            <Link href="/upload" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 text-xs font-semibold text-white/55 hover:text-white">
              <UploadCloud className="h-3.5 w-3.5" /> Add MP3
            </Link>
          </div>
        </div>
      </section>

      <Library searchOnly />
    </div>
  );
}