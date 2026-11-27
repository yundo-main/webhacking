import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring tokens for the challenge site: "<base64url JSON>.<base64url HMAC>".
 * Every token carries a purpose so a token minted for one use is never accepted for another.
 */
function secret() {
  const value = process.env.LAB_SECRET;
  if (!value || value.length < 32) throw new Error("LAB_SECRET must be set (32+ characters)");
  return value;
}

const mac = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function signToken(purpose: string, payload: Record<string, unknown>, ttlSeconds: number) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, p: purpose, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verifyToken<T extends Record<string, unknown>>(purpose: string, token: string | undefined | null): T | null {
  if (!token || token.length > 4096) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(mac(body));
  const got = Buffer.from(signature);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data || data.p !== purpose || typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data as T;
  } catch {
    return null;
  }
}

/** Public origin of the challenge site, e.g. https://lab.example.net (local: http://lab.localhost:3000). */
export function labOrigin() {
  const value = process.env.LAB_ORIGIN;
  if (!value) throw new Error("LAB_ORIGIN must be set");
  return new URL(value).origin;
}
