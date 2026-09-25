import SunoLogo from "@/components/brand/SunoLogo";
import { Headphones, Radio, ShieldCheck, UsersRound } from "lucide-react";

export default function AuthShell({ title, description, children, footer }) {
  return (
    <main className="suno-auth-page">
      <div className="suno-auth-bg" aria-hidden="true"><div className="suno-auth-glow one" /><div className="suno-auth-glow two" /><div className="suno-auth-grid" /></div>
      <div className="suno-auth-wrap">
        <section className="suno-auth-art-panel">
          <div className="suno-auth-art-top"><SunoLogo /><span><i /> SUNO MUSIC</span></div>
          <div className="suno-auth-art-copy"><span className="suno-section-overline">SHARED LISTENING</span><h2>Same song.<br /><span>Same moment.</span></h2><p>Discover music, create rooms, and turn a song into something shared.</p></div>
          <div className="suno-auth-art-visual"><div className="suno-auth-disc"><div><Headphones size={20} /></div></div><div className="suno-auth-wave">{Array.from({ length: 30 }).map((_, i) => <i key={i} style={{ height: `${18 + ((i * 23) % 70)}%` }} />)}</div></div>
          <div className="suno-auth-feature-row"><span><UsersRound size={13} /> Up to 10</span><span><Radio size={13} /> Realtime</span><span><ShieldCheck size={13} /> Secure</span></div>
        </section>
        <section className="suno-auth-form-panel">
          <div className="suno-auth-mobile-logo"><SunoLogo /></div>
          <div className="suno-auth-heading"><span className="suno-section-overline">WELCOME TO SUNO</span><h1>{title}</h1><p>{description}</p></div>
          {children}
          {footer ? <div className="suno-auth-footer">{footer}</div> : null}
        </section>
      </div>
    </main>
  );
}