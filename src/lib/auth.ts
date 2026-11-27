import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, rateLimit, session, user, verification } from "@/db/schema";

// Only register providers that are configured, so a missing provider never breaks sign-in for the other.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

export const enabledProviders = Object.keys(socialProviders) as ("github" | "google")[];

/** Email sign-up can be closed (e.g. once a competition starts) with EMAIL_SIGNUP_DISABLED=true. */
export const emailSignupEnabled = process.env.EMAIL_SIGNUP_DISABLED !== "true";

export const NAME_MAX = 30;

/** Scoreboard names: trimmed, no control characters, at most NAME_MAX; never derived from the email. */
export function cleanName(raw: unknown) {
  const name = String(raw ?? "")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
  return name || `참가자-${randomBytes(2).toString("hex")}`;
}

export const auth = betterAuth({
  // BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  // Email is the account ID. No mail server, so addresses are not verified; because of that,
  // Better Auth never links a later Google/GitHub sign-in into an unverified email account.
  emailAndPassword: {
    enabled: true,
    disableSignUp: !emailSignupEnabled,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  socialProviders,
  // Stored in Postgres so limits hold across serverless instances (defaults: tighter on sign-in/sign-up).
  rateLimit: { enabled: true, storage: "database", window: 60, max: 100 },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => ({ data: { ...data, name: cleanName(data.name) } }),
      },
    },
  },
  plugins: [nextCookies()],
});
