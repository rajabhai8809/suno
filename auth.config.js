const protectedPrefixes = [
  "/dashboard",
  "/room",
  "/rooms",
  "/library",
  "/upload",
  "/settings",
];

const authPages = new Set(["/login", "/register"]);

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user?.id);
      const isProtectedRoute = protectedPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

      if (isProtectedRoute) {
        return isLoggedIn;
      }

      if (isLoggedIn && authPages.has(pathname)) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
  providers: [],
};