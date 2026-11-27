import { escapeHtml, html, page } from "@/labs/kit";

const CSS = `body{font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;display:grid;place-items:center;min-height:100vh;margin:0}
main{max-width:28rem;padding:2rem;text-align:center}a{color:#34d399}`;

const portal = () => process.env.BETTER_AUTH_URL ?? "/";

/** Notice pages shown by the lab host itself (not by a challenge). */
export function notice(title: string, message: string, status: number) {
  return html(
    page(title, `<main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(portal())}">CTF 포털로 이동</a></p></main>`, CSS),
    { status },
  );
}
