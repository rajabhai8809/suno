"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, LogOut, Mail, ShieldCheck, UserRound, KeyRound, ChevronRight } from "lucide-react";

export default function ProfilePage({ user }) {
  return (
    <div className="suno-profile-page">
      <section className="suno-profile-hero">
        <div className="suno-profile-avatar-large">{user?.name?.slice(0, 1)?.toUpperCase() || "S"}</div>
        <div>
          <span className="suno-section-overline">YOUR ACCOUNT</span>
          <h1>{user?.name || "Suno user"}</h1>
          <p>{user?.email || ""}</p>
        </div>
      </section>

      <div className="suno-profile-grid">
        <section className="suno-settings-card">
          <div className="suno-settings-title"><div><span className="suno-section-overline">ACCOUNT</span><h2>Your details</h2></div><UserRound size={17} /></div>
          <div className="suno-detail-list">
            <div><span><UserRound size={15} /> Name</span><strong>{user?.name || "Not set"}</strong></div>
            <div><span><Mail size={15} /> Email</span><strong>{user?.email || "Not set"}</strong></div>
            <div><span><ShieldCheck size={15} /> Status</span><strong className="verified">Verified</strong></div>
          </div>
        </section>

        <section className="suno-settings-card">
          <div className="suno-settings-title"><div><span className="suno-section-overline">SECURITY</span><h2>Account controls</h2></div><KeyRound size={17} /></div>
          <div className="suno-settings-links">
            <Link href="/forgot-password"><span><KeyRound size={15} /><span><strong>Reset password</strong><small>Start a secure password reset</small></span></span><ChevronRight size={15} /></Link>
            <Link href="/library"><span><Mail size={15} /><span><strong>Your library</strong><small>Browse your shared music</small></span></span><ChevronRight size={15} /></Link>
          </div>
        </section>
      </div>

      <section className="suno-danger-card">
        <div><span className="suno-section-overline">SESSION</span><h2>Sign out of Suno</h2><p>You can sign back in any time.</p></div>
        <button type="button" onClick={() => signOut({ callbackUrl: "/" })}><LogOut size={15} /> Sign out</button>
      </section>

      <Link href="/dashboard" className="suno-back-link"><ArrowLeft size={14} /> Back to home</Link>
    </div>
  );
}