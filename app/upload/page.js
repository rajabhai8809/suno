import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SunoAppShell from "@/components/suno/SunoAppShell";
import UploadForm from "@/components/upload/UploadForm";

export const metadata = {
  title: "Upload Music | Suno",
  description: "Upload an MP3 to the shared Suno library.",
};

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <SunoAppShell>
      <UploadForm />
    </SunoAppShell>
  );
}