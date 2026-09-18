import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot password",
  description: "Reset your Suno password securely.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter your email and we will send a reset link if an eligible account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}