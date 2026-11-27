import { NextResponse, type NextRequest } from "next/server";
import { hasLab } from "@/labs";
import { auth } from "@/lib/auth";
import { getChallenge } from "@/lib/challenges";
import { competitionState } from "@/lib/competition";
import { labOrigin, signToken } from "@/lib/lab-token";

/** Portal → lab host hand-off: a 2-minute launch token naming the player and the challenge. */
export async function GET(request: NextRequest, { params }: RouteContext<"/challenges/[id]/open">) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.redirect(new URL("/", request.url), 303);
  if (!getChallenge(id) || !hasLab(id) || !competitionState().open) {
    return NextResponse.redirect(new URL(`/challenges/${id}`, request.url), 303);
  }
  const token = signToken("launch", { u: session.user.id, c: id }, 120);
  return NextResponse.redirect(`${labOrigin()}/launch?t=${encodeURIComponent(token)}`, 303);
}
