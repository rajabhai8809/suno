import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import ProfilePage from "@/components/profile/ProfilePage";

export const metadata = { title: "Profile | Suno", description: "Your Suno profile." };

export default async function ProfileRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <SunoAppShell><ProfilePage user={session.user} /></SunoAppShell>;
}