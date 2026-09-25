import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import RoomsPage from "@/components/rooms/RoomsPage";

export const metadata = { title: "Rooms | Suno", description: "Create and join shared listening rooms." };

export default async function RoomsRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <SunoAppShell><RoomsPage /></SunoAppShell>;
}