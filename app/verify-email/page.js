import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

export const metadata = {
  title: "Verify email",
  description: "Verify your Suno email address.",
};

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Check your inbox."
      description="Verify your email before signing in with a password."
    >
      <VerifyEmailForm
        email={params?.email || ""}
        initialError={params?.error || ""}
      />
    </AuthShell>
  );
}