import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer } from "better-auth/plugins";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// A standalone PrismaClient, separate from the Nest-injectable PrismaService (server/src/prisma) —
// Better Auth's config is constructed outside Nest's DI container (see @thallesp/nestjs-better-auth's
// documented integration pattern), so it can't receive an injected instance here.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const isProduction = process.env.NODE_ENV === "production";
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  basePath: "/api/auth",
  // RENDER_EXTERNAL_URL is auto-injected by Render at runtime (the service's own
  // https://<name>.onrender.com URL) — falls back to it so BETTER_AUTH_URL doesn't need to be
  // hand-set (and re-guessed if Render appends a suffix to a taken service name).
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    `http://localhost:${process.env.NEST_PORT ?? 3001}`,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [frontendOrigin],
  emailAndPassword: {
    enabled: true,
    // Password reset / email verification are out of scope for this take-home (see CLAUDE.md) —
    // task2.md doesn't require them, and the time budget goes to auth+sharing+move instead.
    requireEmailVerification: false,
  },
  // Without this, signing in with Google using an email that already has an email/password
  // account here throws account_not_linked instead of linking the two — Better Auth's default
  // auto-link path normally requires the existing account's email to already be verified, but
  // this app never verifies email/password signups at all (see requireEmailVerification above),
  // so every existing account would otherwise permanently fail Google sign-in. Trusting google
  // specifically is reasonable here (unlike the general case) since Google itself verifies the
  // email before ever handing it back to us.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  // Registered only when a Google Cloud OAuth client is configured, so local dev works without
  // one — see the "Open items" section in CLAUDE.md and .env.example.
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Points Google's redirect at the FRONTEND origin (proxied to this backend via
            // vercel.json's /api/* rewrite, same as every other request — see CLAUDE.md), not
            // this server's own baseURL (Render). Two real problems if it redirected straight to
            // Render instead: (1) Chrome's Safe Browsing flags onrender.com's shared domain as
            // dangerous for some users, blocking the redirect outright; (2) the OAuth state
            // cookie gets set during sign-in initiation (which already goes through the frontend
            // origin, since authClient's baseURL is unset — see shared/api/auth-client.ts) but
            // would then need to be read back on a completely different origin (Render) during
            // the callback, which Safari's ITP won't allow — surfaces as "state_mismatch". Both
            // disappear once initiation and callback happen on the same origin throughout.
            redirectURI: `${frontendOrigin}/api/auth/callback/google`,
          },
        },
      }
    : {}),
  // Cross-origin (Vercel frontend / Railway-or-Render backend) cookies require sameSite:"none",
  // which in turn requires secure:true — that breaks local http dev, so only set it in prod.
  ...(isProduction
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
  // Stricter limits than the app-wide default on the two credential-guessing/stuffing-prone
  // endpoints — see CLAUDE.md §6b security hardening. Signup gets a slightly looser limit than
  // login since a legitimate user retrying a validation error (weak password, taken email) is
  // more common there than a legitimate user mistyping their password 3+ times in 10s.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 10, max: 5 },
      "/sign-up/email": { window: 60, max: 10 },
    },
  },
  plugins: [bearer()],
});

export type Auth = typeof auth;
