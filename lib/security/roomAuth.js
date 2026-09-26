import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { ok: false, status: 401, session: null };
  }

  return { ok: true, status: 200, session };
}

export function jsonError(message, status = 400, extra = {}) {
  return Response.json(
    {
      success: false,
      message,
      ...extra,
    },
    { status },
  );
}