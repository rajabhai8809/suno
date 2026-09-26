import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import SearchPage from "@/components/search/SearchPage";

export const metadata = {
  title: "Search | Suno",
  description: "Search songs, artists, albums, genres and languages in Suno.",
};

export default async function SearchRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <SunoAppShell>
      <SearchPage />
    </SunoAppShell>
  );
}