import { headers } from "next/headers";
import { auth } from "./auth";

export async function getUser() {
  const result = await auth.api.getSession({ headers: await headers() });
  return result?.user ?? null;
}
