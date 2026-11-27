"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { solve, submission, user } from "@/db/schema";
import { getChallenge } from "@/lib/challenges";
import { competitionState } from "@/lib/competition";
import { flagMatches } from "@/lib/flags";
import { getUser } from "@/lib/session";

export type SubmitState = { status: "idle" | "correct" | "wrong" | "error"; message: string };

const MAX_SUBMISSIONS_PER_MINUTE = 10;

/** A wrong flag that is someone else's valid flag means it was shared. Recorded, never revealed. */
async function findFlagOwner(challengeId: string, flag: string, submitterId: string) {
  if (!flag.trim().startsWith(`WH{${challengeId}_`)) return null;
  const users = await db.select({ id: user.id }).from(user);
  return users.find((u) => u.id !== submitterId && flagMatches(u.id, challengeId, flag))?.id ?? null;
}

export async function submitFlag(challengeId: string, _prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const current = await getUser();
  if (!current) return { status: "error", message: "로그인이 필요합니다." };

  const challenge = getChallenge(challengeId);
  if (!challenge) return { status: "error", message: "존재하지 않는 문제입니다." };

  const competition = competitionState();
  if (!competition.open) return { status: "error", message: competition.reason };

  const flag = formData.get("flag");
  if (typeof flag !== "string" || !flag.trim() || flag.length > 200) {
    return { status: "error", message: "플래그를 입력하세요." };
  }

  const [{ recent }] = await db
    .select({ recent: sql<number>`count(*)::int` })
    .from(submission)
    .where(and(eq(submission.userId, current.id), gte(submission.createdAt, new Date(Date.now() - 60_000))));
  if (recent >= MAX_SUBMISSIONS_PER_MINUTE) {
    return { status: "error", message: "제출이 너무 잦습니다. 1분 뒤 다시 시도하세요." };
  }

  const correct = flagMatches(current.id, challenge.id, flag);
  const matchedUserId = correct ? null : await findFlagOwner(challenge.id, flag, current.id);
  await db.insert(submission).values({ userId: current.id, challengeId: challenge.id, correct, matchedUserId });

  if (!correct) return { status: "wrong", message: "오답입니다." };

  await db.insert(solve).values({ userId: current.id, challengeId: challenge.id }).onConflictDoNothing();
  revalidatePath("/challenges");
  revalidatePath("/scoreboard");
  return { status: "correct", message: `정답입니다! +${challenge.points}점` };
}
