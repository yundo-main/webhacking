import type { NextRequest } from "next/server";
import { loadLab } from "@/labs";
import { PLAYER_COOKIE } from "@/labs/kit";
import { competitionState } from "@/lib/competition";
import { flagFor } from "@/lib/flags";
import { labOrigin, verifyToken } from "@/lib/lab-token";
import { notice } from "../../../lab-pages";

// A runaway query (e.g. a recursive CTE) only ever stalls the player's own request.
export const maxDuration = 10;

async function handle(request: NextRequest, { params }: RouteContext<"/lab/c/[challenge]/[[...path]]">) {
  const { challenge, path } = await params;
  const lab = await loadLab(challenge);
  if (!lab) return notice("404", "존재하지 않는 문제입니다.", 404);

  const player = verifyToken<{ u: string }>("player", request.cookies.get(PLAYER_COOKIE)?.value);
  if (!player || typeof player.u !== "string") {
    return notice("다시 접속해 주세요", "포털의 문제 화면에서 '문제 사이트 열기'를 눌러 주세요.", 401);
  }
  const competition = competitionState();
  if (!competition.open) return notice("대회 시간이 아닙니다", competition.reason, 403);

  try {
    return await lab({
      request,
      method: request.method,
      path: "/" + (path ?? []).join("/"),
      challengeId: challenge,
      base: `/c/${challenge}`,
      player: { userId: player.u },
      flag: flagFor(player.u, challenge),
      secure: labOrigin().startsWith("https:"),
    });
  } catch (error) {
    console.error(`lab ${challenge} failed`, error);
    return notice("오류", "문제 사이트에서 예상하지 못한 오류가 발생했습니다.", 500);
  }
}

export const GET = handle;
export const POST = handle;
