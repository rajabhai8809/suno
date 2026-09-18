const protectedPrefixes = [
  "/dashboard",
  "/room",
  "/rooms",
  "/library",
  "/upload",
  "/settings",
];

const authPages = new Set([
  "/login",
  "/register",
]);

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);

      const pathname = nextUrl.pathname;

      const isProtectedRoute = protectedPrefixes.some(
        (prefix) =>
          pathname === prefix ||
          pathname.startsWith(`${prefix}/`),
      );

      if (isProtectedRoute) {
        return isLoggedIn;
      }

      if (isLoggedIn && authPages.has(pathname)) {
        return Response.redirect(
          new URL("/dashboard", nextUrl),
        );
      }

      return true;
    },
  },

  providers: [],
};