"use client";

import { useState } from "react";
import { ArrowRight, Copy, Headphones, LockKeyhole, Plus, UsersRound, WandSparkles } from "lucide-react";

export default function RoomsPage() {
  const [copied, setCopied] = useState(false);
  const demoCode = "K8M72Q";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(demoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <div className="suno-rooms-page">
      <section className="suno-rooms-hero">
        <div>
          <span className="suno-eyebrow-pill"><Headphones size={12} /> SHARED LISTENING</span>
          <h1>Make a room.<br /><span>Make a moment.</span></h1>
          <p>Bring your people into one synchronized listening session. The room system will connect here as we build the realtime layer.</p>
        </div>
        <div className="suno-room-hero-card">
          <div className="suno-room-hero-ring" />
          <div className="suno-room-hero-icon"><UsersRound size={22} /></div>
          <strong>Up to 10 listeners</strong>
          <span>one shared timeline</span>
        </div>
      </section>

      <section className="suno-room-action-grid">
        <div className="suno-room-action-card primary">
          <div className="suno-action-icon"><Plus size={18} /></div>
          <span className="suno-section-overline">START NEW</span>
          <h2>Create a listening room.</h2>
          <p>Room creation and realtime synchronization will connect to this surface in the room phase.</p>
          <button type="button" disabled className="suno-disabled-primary"><WandSparkles size={15} /> Create room</button>
        </div>

        <div className="suno-room-action-card">
          <div className="suno-action-icon"><LockKeyhole size={18} /></div>
          <span className="suno-section-overline">JOIN</span>
          <h2>Enter a room code.</h2>
          <p>Use the secret code shared by the room creator to join the same listening session.</p>
          <div className="suno-room-code-input-row"><input placeholder="6-character code" maxLength={6} /><button type="button" disabled>Join <ArrowRight size={14} /></button></div>
        </div>
      </section>

      <section className="suno-room-preview">
        <div className="suno-room-preview-heading"><div><span className="suno-section-overline">A ROOM, VISUALIZED</span><h2>This is what the shared room will feel like.</h2></div><span className="suno-room-preview-chip">FRONTEND READY</span></div>
        <div className="suno-room-preview-body">
          <div className="suno-room-art"><Headphones size={22} /></div>
          <div className="suno-room-preview-info"><strong>Midnight Drive</strong><span>Night Changes · 02:41 / 04:11</span><div className="suno-mini-wave">{Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ height: `${20 + ((i * 31) % 65)}%` }} />)}</div></div>
          <div className="suno-room-members"><div className="suno-member-stack"><span>TA</span><span>AK</span><span>RS</span><span>MN</span><span>+3</span></div><small>7 listening</small></div>
        </div>
        <div className="suno-room-preview-footer"><span>Room code <strong>{demoCode}</strong></span><button type="button" onClick={copyCode}><Copy size={13} /> {copied ? "Copied" : "Copy code"}</button></div>
      </section>
    </div>
  );
}