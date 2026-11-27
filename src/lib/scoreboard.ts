import { eq } from "drizzle-orm";
import { db } from "@/db";
import { solve, user } from "@/db/schema";
import { CHALLENGES } from "./challenges";

export type ScoreRow = { userId: string; name: string; image: string | null; score: number; solves: number; lastSolve: Date };

const points = new Map(CHALLENGES.map((c) => [c.id, c.points]));

/** Ranked by score, ties broken by who reached it first. Only names are public, never emails. */
export async function getScoreboard(): Promise<ScoreRow[]> {
  const rows = await db
    .select({ userId: solve.userId, name: user.name, image: user.image, challengeId: solve.challengeId, solvedAt: solve.solvedAt })
    .from(solve)
    .innerJoin(user, eq(user.id, solve.userId));

  const byUser = new Map<string, ScoreRow>();
  for (const row of rows) {
    const value = points.get(row.challengeId);
    if (value === undefined) continue; // removed challenge
    const entry = byUser.get(row.userId) ?? { userId: row.userId, name: row.name, image: row.image, score: 0, solves: 0, lastSolve: row.solvedAt };
    entry.score += value;
    entry.solves += 1;
    if (row.solvedAt > entry.lastSolve) entry.lastSolve = row.solvedAt;
    byUser.set(row.userId, entry);
  }
  return [...byUser.values()].sort((a, b) => b.score - a.score || a.lastSolve.getTime() - b.lastSolve.getTime());
}

export async function getSolveCounts() {
  const rows = await db.select({ challengeId: solve.challengeId }).from(solve);
  const counts = new Map<string, number>();
  for (const { challengeId } of rows) counts.set(challengeId, (counts.get(challengeId) ?? 0) + 1);
  return counts;
}

export async function getSolvedBy(userId: string) {
  const rows = await db.select({ challengeId: solve.challengeId }).from(solve).where(eq(solve.userId, userId));
  return new Set(rows.map((r) => r.challengeId));
}
