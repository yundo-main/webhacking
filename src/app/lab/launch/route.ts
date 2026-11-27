import type { NextRequest } from "next/server";
import { cookie, PLAYER_COOKIE, redirect } from "@/labs/kit";
import { hasLab } from "@/labs";
import { labOrigin, signToken, verifyToken } from "@/lib/lab-token";
import { notice } from "../lab-pages";

const PLAYER_TTL = 12 * 3600;

/** Exchanges a short-lived launch token from the portal for a player cookie on the lab host. */
export function GET(request: NextRequest) {
  const launch = verifyToken<{ u: string; c: string }>("launch", request.nextUrl.searchParams.get("t"));
  if (!launch || typeof launch.u !== "string" || typeof launch.c !== "string" || !hasLab(launch.c)) {
    return notice("링크가 만료되었습니다", "포털에서 '문제 사이트 열기'를 다시 눌러 주세요.", 401);
  }
  const player = signToken("player", { u: launch.u }, PLAYER_TTL);
  const secure = labOrigin().startsWith("https:");
  return redirect(`/c/${launch.c}`, [cookie(PLAYER_COOKIE, player, { path: "/", maxAge: PLAYER_TTL, secure })]);
}
