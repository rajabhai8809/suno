import Link from "next/link";

const messages = {
  OAuthSignin: "Google sign-in could not be started. Please try again.",
  OAuthCallback: "Google sign-in could not be completed. Please try again.",
  AccessDenied: "Access was denied by the authentication provider.",
  ACCOUNT_EXISTS: "This email already belongs to a password account. Sign in with your password instead.",
};

export const metadata = {
  title: "Authentication error",
};

export default async function AuthErrorPage({ searchParams }) {
  const params = await searchParams;
  const message = messages[params?.error] || "Authentication could not be completed.";

  return (
    <main className="grid min-h-screen place-items-center bg-[#07070b] px-4 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-6 text-center sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/60">Suno</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Authentication error</h1>
        <p className="mt-3 text-sm leading-6 text-white/35">{message}</p>
        <Link href="/login" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black">
          Back to login
        </Link>
      </div>
    </main>
  );
}