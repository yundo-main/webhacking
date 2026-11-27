/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export function safeNext(value: string | string[] | undefined | null, fallback = "/challenges") {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.length > 200) return fallback;
  return next;
}

export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
