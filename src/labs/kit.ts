import type { NextRequest } from "next/server";
import { signToken, verifyToken } from "@/lib/lab-token";

/**
 * Toolkit for challenge sites. Rules for every challenge:
 *  - The vulnerability is real, but it only ever touches in-memory data built for this request/player.
 *  - Never read the real filesystem, make real network requests, eval input, or read process.env:
 *    challenge code runs in the same deployment as the portal.
 *  - Only `ctx.flag` (this player's flag) may be revealed.
 */
export type LabContext = {
  request: NextRequest;
  method: string;
  /** Path inside the challenge, always starting with "/" (e.g. "/login"). */
  path: string;
  challengeId: string;
  /** Public URL prefix of this challenge on the lab host, e.g. "/c/sqli-login". */
  base: string;
  player: { userId: string };
  flag: string;
  secure: boolean;
};

export type LabHandler = (ctx: LabContext) => Response | Promise<Response>;

export const PLAYER_COOKIE = "wh_player";

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function html(body: string, init: { status?: number; cookies?: string[] } = {}) {
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  for (const cookie of init.cookies ?? []) headers.append("Set-Cookie", cookie);
  return new Response(body, { status: init.status ?? 200, headers });
}

export function redirect(location: string, cookies: string[] = []) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

/** Minimal standalone page shell; each challenge passes its own look. */
export function page(title: string, body: string, css = "") {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

/** A plain card-style look shared by challenges; `accent` colors buttons and links. */
export function cardStyle(accent: string, background = "#0f172a", panel = "#1e293b") {
  return `body{font-family:system-ui,sans-serif;background:${background};color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem;box-sizing:border-box}
main{background:${panel};padding:2rem;border-radius:12px;width:min(560px,100%);box-sizing:border-box}
input,button,select,textarea{width:100%;box-sizing:border-box;padding:.6rem;margin:.3rem 0;border-radius:6px;border:1px solid #334155;background:${background};color:inherit;font:inherit}
button{background:${accent};border:0;font-weight:600;cursor:pointer;color:#fff}a{color:${accent}}
.err{color:#fca5a5}.ok{color:#86efac}.muted{color:#94a3b8;font-size:.9em}code,pre{word-break:break-all;white-space:pre-wrap;font-family:ui-monospace,monospace}
pre{background:${background};padding:1rem;border-radius:8px;overflow:auto}`;
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function cookie(name: string, value: string, opts: { path: string; maxAge: number; secure: boolean }) {
  return `${name}=${value}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Lax${opts.secure ? "; Secure" : ""}`;
}

const sessionName = (challengeId: string) => `wh_s_${challengeId.replace(/-/g, "_")}`;

/** In-challenge login state. Bound to the player, so sharing the cookie with someone else does nothing. */
export function readSession<T extends Record<string, unknown>>(ctx: LabContext): T | null {
  const data = verifyToken<{ u: string; d: T }>(`session:${ctx.challengeId}`, ctx.request.cookies.get(sessionName(ctx.challengeId))?.value);
  return data && data.u === ctx.player.userId ? data.d : null;
}

export function sessionCookie(ctx: LabContext, data: Record<string, unknown> | null) {
  const name = sessionName(ctx.challengeId);
  if (!data) return cookie(name, "", { path: ctx.base, maxAge: 0, secure: ctx.secure });
  const token = signToken(`session:${ctx.challengeId}`, { u: ctx.player.userId, d: data }, 6 * 3600);
  return cookie(name, token, { path: ctx.base, maxAge: 6 * 3600, secure: ctx.secure });
}

/** Reads an urlencoded or multipart form body, capped in size. */
export async function readForm(request: Request, limit = 64 * 1024) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > limit) throw new Error("body too large");
  return request.formData();
}
