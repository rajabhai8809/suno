import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import Library from "@/components/library/Library";

export const metadata = {
  title: "Library | Suno",
  description: "Discover, search and play music from the Suno community.",
};

export default async function LibraryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <SunoAppShell>
      <Library />
    </SunoAppShell>
  );
}