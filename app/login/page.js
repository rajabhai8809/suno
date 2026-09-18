import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Login",
  description: "Sign in to your Suno account.",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Welcome back."
      description="Sign in and get back to listening together."
      footer={null}
    >
      <LoginForm
        initialError={params?.error || ""}
        verified={params?.verified === "1"}
        reset={params?.reset === "1"}
      />
    </AuthShell>
  );
}