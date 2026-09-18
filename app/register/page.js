import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create account",
  description: "Create your Suno account.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account."
      description="Join Suno and start listening together."
    >
      <RegisterForm />
    </AuthShell>
  );
}