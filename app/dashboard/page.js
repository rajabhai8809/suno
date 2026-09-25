import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import DashboardHome from "@/components/dashboard/DashboardHome";

export const metadata = {
  title: "Home",
  description: "Your Suno music home.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <SunoAppShell>
      <DashboardHome name={session.user.name} email={session.user.email} />
    </SunoAppShell>
  );
}