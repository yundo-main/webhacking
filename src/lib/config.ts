/** Names (never values) of required settings that are missing or too short. */
export function missingConfig() {
  const env = process.env;
  const missing: string[] = [];
  const secret = (name: string) => (env[name] ?? "").length >= 32 || missing.push(name);
  secret("BETTER_AUTH_SECRET");
  secret("FLAG_SECRET");
  secret("LAB_SECRET");
  if (!env.BETTER_AUTH_URL) missing.push("BETTER_AUTH_URL");
  if (!env.LAB_ORIGIN) missing.push("LAB_ORIGIN");
  if (!env.DATABASE_URL && !env.POSTGRES_URL) missing.push("DATABASE_URL (또는 POSTGRES_URL)");
  // OAuth providers are optional: email/password sign-in always works.
  return missing;
}
