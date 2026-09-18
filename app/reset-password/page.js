import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset password",
  description: "Choose a new Suno password.",
};

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Choose a new password."
      description="Use a strong password you do not reuse elsewhere."
    >
      <ResetPasswordForm token={params?.token || ""} />
    </AuthShell>
  );
}