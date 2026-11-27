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
  const github = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  const google = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  if (!github && !google) missing.push("GITHUB_CLIENT_ID/SECRET 또는 GOOGLE_CLIENT_ID/SECRET");
  return missing;
}
