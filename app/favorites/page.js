import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import Link from "next/link";
import { Heart, LibraryBig, ArrowRight } from "lucide-react";

export const metadata = { title: "Favorites | Suno", description: "Your favorite Suno tracks." };

export default async function FavoritesRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <SunoAppShell>
      <div className="suno-favorites-page">
        <section className="suno-simple-page-hero">
          <span className="suno-eyebrow-pill"><Heart size={12} /> YOUR SPACE</span>
          <h1>Keep the <span>songs you love.</span></h1>
          <p>Your favorites surface is ready for the saved-song state layer. For now, use the shared library to discover tracks.</p>
        </section>
        <div className="suno-favorites-empty">
          <div><Heart size={21} /></div>
          <h2>Your favorites will live here.</h2>
          <p>Browse the shared library and keep the tracks you want close once favorites storage is connected.</p>
          <Link href="/library">Explore the library <ArrowRight size={14} /></Link>
        </div>
        <Link href="/dashboard" className="suno-back-link"><LibraryBig size={14} /> Back to home</Link>
      </div>
    </SunoAppShell>
  );
}