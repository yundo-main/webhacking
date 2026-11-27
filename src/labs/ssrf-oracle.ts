import { cardStyle, escapeHtml, html, page, readForm, type LabHandler } from "./kit";

/**
 * ssrf-oracle: the server "fetches" any URL for you and only blocks loopback by a raw-string blacklist.
 * No real request is ever made: URLs resolve against a tiny virtual network defined below.
 */

const CSS = cardStyle("#ec4899", "#1a1033", "#2a1b4d");
const SELF_PORT = "8080";

type Fetched = { status: number; type: string; body: string } | { error: string };

function isLoopback(host: string) {
  const h = host.toLowerCase().replace(/\.$/, "");
  return h === "localhost" || h.endsWith(".localhost") || /^127\./.test(h) || h === "0.0.0.0" || h === "[::1]" || h === "[::]" || h === "[::ffff:7f00:1]";
}

/** The oracle app as seen from inside its own host. */
function selfResponse(path: string, flag: string): Fetched {
  if (path === "/internal-note") {
    return { status: 200, type: "text/plain", body: `[내부 메모 - 외부 공개 금지]\n점검용 인증 값: ${flag}\n` };
  }
  if (path === "/") return { status: 200, type: "text/html", body: "<h1>수정구슬</h1><p>주소를 입력하면 대신 들여다봅니다.</p>" };
  return { status: 404, type: "text/plain", body: "Not Found" };
}

function virtualFetch(target: URL, flag: string): Fetched {
  const port = target.port || (target.protocol === "https:" ? "443" : "80");
  if (isLoopback(target.hostname)) {
    if (port === SELF_PORT && target.protocol === "http:") return selfResponse(target.pathname, flag);
    return { error: `connect ECONNREFUSED ${target.hostname}:${port}` };
  }
  if (target.hostname === "169.254.169.254") {
    return { status: 404, type: "application/json", body: '{"message":"metadata service is not available in this environment"}' };
  }
  if (target.hostname === "example.com" || target.hostname === "www.example.com") {
    return { status: 200, type: "text/html", body: "<!doctype html><title>Example Domain</title><h1>Example Domain</h1><p>This domain is for use in documentation examples.</p>" };
  }
  return { error: `connect ETIMEDOUT ${target.hostname}:${port} (실습 환경에서는 외부 인터넷에 연결되지 않습니다)` };
}

const view = (base: string, value = "", result = "", status = 200) =>
  html(
    page(
      "수정구슬",
      `<main><h1>🔮 수정구슬</h1><p>보고 싶은 웹 주소를 입력하면 수정구슬(서버)이 대신 들여다보고 보여 줍니다.</p>
      <form method="post" action="${base}/gaze"><input name="url" placeholder="http://example.com/" value="${escapeHtml(value)}" autocomplete="off"><button>들여다보기</button></form>
      ${result}
      <p class="muted">관리자 메모는 <a href="${base}/internal-note">내부 메모</a>에 보관합니다. · oracle v1.2 · listening on 0.0.0.0:${SELF_PORT}</p></main>`,
      CSS,
    ),
    { status },
  );

const handler: LabHandler = async (ctx) => {
  const { base, method, path } = ctx;

  if (method === "GET" && path === "/") return view(base);

  if (method === "GET" && path === "/internal-note") {
    return html(page("403", `<main><h1>403 Forbidden</h1><p class="err">내부 네트워크(127.0.0.1)에서만 접근할 수 있습니다.</p><p><a href="${base}">돌아가기</a></p></main>`, CSS), { status: 403 });
  }

  if (method === "POST" && path === "/gaze") {
    const raw = String((await readForm(ctx.request, 4096)).get("url") ?? "").trim();
    // VULNERABLE ON PURPOSE: blacklist on the raw string; the parsed host is what actually gets "requested".
    if (/localhost|127\.0\.0\.1/i.test(raw)) {
      return view(base, raw, `<p class="err">보안 정책: 내부 주소는 들여다볼 수 없습니다.</p>`, 403);
    }
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      return view(base, raw, `<p class="err">올바른 URL이 아닙니다.</p>`, 400);
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return view(base, raw, `<p class="err">http, https 주소만 볼 수 있습니다.</p>`, 400);
    }
    const result = virtualFetch(target, ctx.flag);
    const output =
      "error" in result
        ? `<p class="err">요청 실패</p><pre>${escapeHtml(result.error)}</pre>`
        : `<p class="muted">GET ${escapeHtml(target.href)} → ${result.status} (${escapeHtml(result.type)})</p><pre>${escapeHtml(result.body)}</pre>`;
    return view(base, raw, output);
  }

  return view(base, "", `<p class="err">404</p>`, 404);
};

export default handler;
