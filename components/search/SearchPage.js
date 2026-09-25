"use client";

import Link from "next/link";
import { Search, ArrowRight, UsersRound, Music2, UploadCloud } from "lucide-react";
import Library from "@/components/library/Library";

export default function SearchPage() {
  return (
    <div className="suno-search-page">
      <section className="suno-search-hero">
        <span className="suno-eyebrow-pill"><Search size={12} /> DISCOVER</span>
        <h1>Find your next song.</h1>
        <p>Search songs, artists and albums from the shared Suno library.</p>
        <div className="suno-search-shortcuts">
          <Link href="/library"><Music2 size={14} /> Browse all music</Link>
          <Link href="/rooms"><UsersRound size={14} /> Listen together</Link>
          <Link href="/upload"><UploadCloud size={14} /> Add an MP3</Link>
        </div>
      </section>
      <Library searchOnly />
      <div className="suno-search-footer-note"><span>Can’t find the track?</span><Link href="/upload">Upload it to Suno <ArrowRight size={13} /></Link></div>
    </div>
  );
}