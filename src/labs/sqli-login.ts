import { randomBytes } from "node:crypto";
import { escapeHtml, html, page, readForm, readSession, redirect, sessionCookie, type LabHandler } from "./kit";
import { assertSafeSql, ForbiddenSql, sqlite } from "./sqlite";

/** sqli-login: intranet login whose query is built by string concatenation (the one intended bug). */

const CSS = `
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#1e293b;padding:2rem;border-radius:12px;width:min(360px,90vw)}
input,button{width:100%;box-sizing:border-box;padding:.6rem;margin:.3rem 0;border-radius:6px;border:1px solid #334155;background:#0f172a;color:inherit}
button{background:#2563eb;border:0;font-weight:600;cursor:pointer}a{color:#93c5fd}.err{color:#fca5a5}.ok{color:#86efac}code{word-break:break-all}`;

type Session = { user: string; role: string };

const view = (body: string, status = 200, cookies: string[] = []) =>
  html(page("사내 포털", `<main>${body}</main>`, CSS), { status, cookies });

const loginForm = (base: string, message = "") => `
<h1>사내 포털</h1><p>직원 계정으로 로그인하세요. (체험 계정: guest / guest)</p>
<form method="post" action="${base}/login">
  <input name="username" placeholder="아이디" autocomplete="off">
  <input name="password" type="password" placeholder="비밀번호">
  <button>로그인</button>
</form>${message}`;

const handler: LabHandler = async (ctx) => {
  const { base, method, path } = ctx;

  if (method === "GET" && path === "/") {
    const session = readSession<Session>(ctx);
    if (!session) return view(loginForm(base));
    return view(`<h1>환영합니다, ${escapeHtml(session.user)}</h1><p>관리자 메뉴는 관리자만 볼 수 있습니다.</p>
      <p><a href="${base}/admin">관리자 메뉴</a> · <a href="${base}/logout">로그아웃</a></p>`);
  }

  if (method === "POST" && path === "/login") {
    const form = await readForm(ctx.request, 4096);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");

    const SQL = await sqlite();
    const db = new SQL.Database();
    try {
      db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)");
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin'), ('guest', 'guest', 'user')", [
        "admin",
        randomBytes(16).toString("hex"),
      ]);

      // VULNERABLE ON PURPOSE: user input concatenated into SQL.
      const query = `SELECT username, role FROM users WHERE username = '${username}' AND password = '${password}'`;
      let row: unknown[] | undefined;
      try {
        assertSafeSql(query);
        row = db.exec(query)[0]?.values[0];
      } catch (error) {
        const message = error instanceof ForbiddenSql ? error.message : `데이터베이스 오류: ${(error as Error).message}`;
        return view(loginForm(base, `<p class="err">${escapeHtml(message)}</p>`), 500);
      }
      if (!row) return view(loginForm(base, `<p class="err">아이디 또는 비밀번호가 올바르지 않습니다.</p>`));

      const session: Session = { user: String(row[0]), role: String(row[1]) };
      return redirect(session.role === "admin" ? `${base}/admin` : base, [sessionCookie(ctx, session)]);
    } finally {
      db.close();
    }
  }

  if (method === "GET" && path === "/admin") {
    if (readSession<Session>(ctx)?.role !== "admin") {
      return view(`<h1>403</h1><p class="err">관리자만 접근할 수 있습니다.</p><p><a href="${base}">돌아가기</a></p>`, 403);
    }
    return view(`<h1>관리자 메뉴</h1><p class="ok">플래그</p><code>${escapeHtml(ctx.flag)}</code>`);
  }

  if (method === "GET" && path === "/logout") {
    return redirect(base, [sessionCookie(ctx, null)]);
  }

  return view("<h1>404</h1>", 404);
};

export default handler;
