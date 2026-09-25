import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import UploadForm from "@/components/upload/UploadForm";

export const metadata = { title: "Upload | Suno", description: "Upload an MP3 to your Suno library." };

export default async function UploadRoute() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <SunoAppShell><div className="suno-upload-page-shell"><UploadForm /></div></SunoAppShell>;
}