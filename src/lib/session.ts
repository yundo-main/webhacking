import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { auth } from "./auth";

/**
 * Current user, or null. A broken auth setup (missing secret, unreachable DB) must not take down
 * every page, so failures are logged and treated as "signed out".
 */
export async function getUser() {
  try {
    const result = await auth.api.getSession({ headers: await headers() });
    return result?.user ?? null;
  } catch (error) {
    unstable_rethrow(error); // let Next.js's own control-flow errors (prerender bailout, redirects) through
    console.error("[auth] getSession failed:", error);
    return null;
  }
}
