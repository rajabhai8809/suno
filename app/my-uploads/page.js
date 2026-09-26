import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import Library from "@/components/library/Library";

export const metadata = {
  title: "My Uploads | Suno",
  description: "Browse and play the music you uploaded to Suno.",
};

export default async function MyUploadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <SunoAppShell>
      <Library initialScope="mine" />
    </SunoAppShell>
  );
}