import type { LabHandler } from "./kit";

/** Implemented challenge sites. Lazy imports keep challenge code (and sql.js) out of portal routes. */
const LABS: Record<string, () => Promise<{ default: LabHandler }>> = {
  "sqli-login": () => import("./sqli-login"),
  "path-traversal": () => import("./path-traversal"),
  "auth-recovery": () => import("./auth-recovery"),
  "upload-filter": () => import("./upload-filter"),
  "ssrf-oracle": () => import("./ssrf-oracle"),
  "nosql-login": () => import("./nosql-login"),
};

export function hasLab(challengeId: string) {
  return Object.hasOwn(LABS, challengeId);
}

export async function loadLab(challengeId: string) {
  return hasLab(challengeId) ? (await LABS[challengeId]()).default : null;
}
