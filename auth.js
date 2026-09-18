import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "./auth.config";
import { connectDB } from "@/lib/db/mongodb";
import { clearRateLimits, consumeRateLimit, isRateLimited } from "@/lib/security/rateLimit";
import { getClientIp } from "@/lib/security/request";
import { loginSchema } from "@/lib/security/schemas";
import { verifyPassword } from "@/lib/security/password";
import User from "@/models/User";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = 20;
const EMAIL_LIMIT = 8;
const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email;
        const password = parsed.data.password;
        const ip = getClientIp(request);
        const ipKey = `login:ip:${ip}`;
        const emailKey = `login:email:${email}`;

        if (
          (await isRateLimited(ipKey, IP_LIMIT, LOGIN_WINDOW_MS)) ||
          (await isRateLimited(emailKey, EMAIL_LIMIT, LOGIN_WINDOW_MS))
        ) {
          return null;
        }

        await connectDB();

        const user = await User.findOne({ email }).select(
          "+passwordHash +googleId",
        );

        if (!user || user.authProvider !== "credentials" || !user.passwordHash) {
          await consumeRateLimit(ipKey, IP_LIMIT, LOGIN_WINDOW_MS);
          await consumeRateLimit(emailKey, EMAIL_LIMIT, LOGIN_WINDOW_MS);
          return null;
        }

        if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
          return null;
        }

        const validPassword = await verifyPassword(password, user.passwordHash);

        if (!validPassword || !user.emailVerifiedAt || !user.isActive) {
          const updated = await User.findByIdAndUpdate(
            user._id,
            { $inc: { failedLoginCount: 1 } },
            { new: true },
          ).select("failedLoginCount");

          if (updated?.failedLoginCount >= MAX_FAILED_LOGINS) {
            await User.findByIdAndUpdate(user._id, {
              $set: {
                lockUntil: new Date(Date.now() + LOCK_DURATION_MS),
              },
            });
          }

          await consumeRateLimit(ipKey, IP_LIMIT, LOGIN_WINDOW_MS);
          await consumeRateLimit(emailKey, EMAIL_LIMIT, LOGIN_WINDOW_MS);
          return null;
        }

        await User.findByIdAndUpdate(user._id, {
          $set: {
            failedLoginCount: 0,
            lockUntil: null,
            lastLoginAt: new Date(),
          },
        });

        await clearRateLimits([ipKey, emailKey]);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      if (!profile?.email || profile.email_verified !== true || !profile.sub) {
        return "/login?error=GOOGLE_NOT_VERIFIED";
      }

      await connectDB();

      const email = profile.email.trim().toLowerCase();
      let user = await User.findOne({ email }).select("+googleId");

      if (!user) {
        try {
          user = await User.create({
            name: profile.name?.trim() || email.split("@")[0],
            email,
            image: profile.picture || null,
            authProvider: "google",
            googleId: profile.sub,
            emailVerifiedAt: new Date(),
          });
        } catch (error) {
          if (error?.code !== 11000) throw error;
          user = await User.findOne({ email }).select("+googleId");
        }
      }

      if (!user) {
        return "/login?error=GOOGLE_ERROR";
      }

      if (!user.isActive) {
        return "/login?error=ACCOUNT_DISABLED";
      }

      if (user.authProvider === "credentials") {
        return "/login?error=ACCOUNT_EXISTS";
      }

      if (user.googleId && user.googleId !== profile.sub) {
        return "/login?error=GOOGLE_ID_MISMATCH";
      }

      if (!user.googleId) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            googleId: profile.sub,
            emailVerifiedAt: user.emailVerifiedAt || new Date(),
            image: profile.picture || user.image || null,
          },
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      await connectDB();

      const email = user?.email?.trim().toLowerCase();
      const dbUser = email
        ? await User.findOne({ email }).lean()
        : token.sub
          ? await User.findById(token.sub).lean()
          : null;

      if (!dbUser || !dbUser.isActive) {
        token.revoked = true;
        return token;
      }

      if (
        typeof token.sessionVersion === "number" &&
        token.sessionVersion !== dbUser.sessionVersion
      ) {
        token.revoked = true;
        return token;
      }

      token.sub = dbUser._id.toString();
      token.role = dbUser.role;
      token.sessionVersion = dbUser.sessionVersion;
      token.revoked = false;

      return token;
    },

    async session({ session, token }) {
      if (token.revoked || !token.sub) {
        session.user = undefined;
        return session;
      }

      await connectDB();

      const user = await User.findById(token.sub).lean();

      if (
        !user ||
        !user.isActive ||
        user.sessionVersion !== token.sessionVersion
      ) {
        session.user = undefined;
        return session;
      }

      session.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
      };

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
});