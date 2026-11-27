import { NextResponse, type NextRequest } from "next/server";

/**
 * One deployment, two hosts:
 *   portal host  → normal app routes; /lab/* is hidden (404)
 *   LAB_ORIGIN   → everything is rewritten to /lab/*, so challenge pages live on their own origin
 *                  and never see portal cookies or routes.
 */
const labHost = (() => {
  try {
    return process.env.LAB_ORIGIN ? new URL(process.env.LAB_ORIGIN).host.toLowerCase() : null;
  } catch {
    return null;
  }
})();

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  if (labHost && host === labHost) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/lab" : `/lab${pathname}`;
    url.search = search;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/lab" || pathname.startsWith("/lab/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  // Static assets and Next internals pass through untouched.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
