import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Per-player flags: HMAC(FLAG_SECRET, challenge:user). Each player gets a different flag,
 * so a shared flag is simply wrong for the receiver — and traceable to its owner.
 * The portal is the only place flags are computed and checked; lab containers only receive theirs.
 */
function secret() {
  const value = process.env.FLAG_SECRET;
  if (!value || value.length < 32) throw new Error("FLAG_SECRET must be set (32+ characters)");
  return value;
}

export function flagFor(userId: string, challengeId: string) {
  const mac = createHmac("sha256", secret()).update(`${challengeId}:${userId}`).digest("hex");
  return `WH{${challengeId}_${mac.slice(0, 32)}}`;
}

export function flagMatches(userId: string, challengeId: string, submitted: string) {
  const expected = Buffer.from(flagFor(userId, challengeId));
  const got = Buffer.from(submitted.trim());
  return got.length === expected.length && timingSafeEqual(got, expected);
}
