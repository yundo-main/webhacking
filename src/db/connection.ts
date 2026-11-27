/**
 * Resolves the Postgres connection for Supabase (or any Postgres).
 *
 * Runtime  : DATABASE_URL, else POSTGRES_URL (set by the Vercel ↔ Supabase integration; transaction pooler :6543)
 * Migrations: DIRECT_URL, else POSTGRES_URL_NON_POOLING (session/direct connection), else the runtime URL
 *
 * Integration URLs can carry driver-specific query params (e.g. `supa=base-pooler.x`) that postgres.js
 * would forward to the server as settings and fail on, so only `sslmode` is kept and mapped to `ssl`.
 */
export type Connection = { url: string; ssl: "require" | false };

export function resolveConnection(raw: string | undefined): Connection | null {
  if (!raw) return null;
  const url = new URL(raw);
  const sslmode = url.searchParams.get("sslmode");
  url.search = "";
  const supabase = /\.supabase\.(co|com)$/i.test(url.hostname);
  const ssl = sslmode ? (sslmode === "disable" ? false : "require") : supabase ? "require" : false;
  return { url: url.toString(), ssl };
}

export const runtimeUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const migrationUrl = () => process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING || runtimeUrl();
