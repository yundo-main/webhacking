import { cardStyle, escapeHtml, html, page, readForm, readSession, redirect, sessionCookie, type LabHandler } from "./kit";

/**
 * auth-recovery: password reset tokens are just base64("<user id>:<date>"), so anyone who sees their
 * own token can forge another account's. State is derived, not stored: a valid token logs you in.
 */

const ACCOUNTS: Record<string, { id: number; password?: string }> = {
  admin: { id: 1001 }, // no known password
  student: { id: 1002, password: "student" },
};

type Session = { user: string };

function today() {
  // KST date, e.g. 20261127
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).replaceAll("-", "");
}

// VULNERABLE ON PURPOSE: predictable, unsigned reset token.
const resetToken = (user: string) => Buffer.from(`${ACCOUNTS[user].id}:${today()}`).toString("base64");

const validToken = (user: string, token: string) => Object.hasOwn(ACCOUNTS, user) && token === resetToken(user);

const CSS = cardStyle("#8b5cf6");
const view = (title: string, body: string, status = 200, cookies: string[] = []) =>
  html(page("계정 센터", `<main><h1>${title}</h1>${body}</main>`, CSS), { status, cookies });

const loginForm = (base: string, message = "") => `
<form method="post" action="${base}/login">
  <input name="username" placeholder="아이디" autocomplete="off"><input name="password" type="password" placeholder="비밀번호">
  <button>로그인</button>
</form>
<p class="muted">체험 계정: student / student · <a href="${base}/forgot">비밀번호를 잊으셨나요?</a></p>${message}`;

const handler: LabHandler = async (ctx) => {
  const { base, method, path } = ctx;
  const params = ctx.request.nextUrl.searchParams;

  if (method === "GET" && path === "/") {
    const session = readSession<Session>(ctx);
    if (session) return redirect(`${base}/me`);
    return view("계정 센터", loginForm(base));
  }

  if (method === "POST" && path === "/login") {
    const form = await readForm(ctx.request, 4096);
    const user = String(form.get("username") ?? "");
    const account = Object.hasOwn(ACCOUNTS, user) ? ACCOUNTS[user] : undefined;
    if (!account?.password || account.password !== String(form.get("password") ?? "")) {
      return view("계정 센터", loginForm(base, `<p class="err">아이디 또는 비밀번호가 올바르지 않습니다.</p>`), 401);
    }
    return redirect(`${base}/me`, [sessionCookie(ctx, { user })]);
  }

  if (method === "GET" && path === "/forgot") {
    return view("비밀번호 재설정", `<p>아이디를 입력하면 등록된 메일로 재설정 링크를 보냅니다.</p>
      <form method="post" action="${base}/forgot"><input name="username" placeholder="아이디" autocomplete="off"><button>재설정 링크 받기</button></form>`);
  }

  if (method === "POST" && path === "/forgot") {
    const form = await readForm(ctx.request, 4096);
    const user = String(form.get("username") ?? "");
    if (user === "student") {
      const link = `${base}/reset?user=student&token=${encodeURIComponent(resetToken("student"))}`;
      return view("메일함 (데모)", `<p class="muted">실습 환경이라 메일 대신 화면에 표시합니다.</p>
        <pre>받는 사람: student@corp.local\n제목: 비밀번호 재설정 안내\n\n아래 링크에서 새 비밀번호를 설정하세요.\n${escapeHtml(link)}</pre>
        <p><a href="${escapeHtml(link)}">링크 열기</a></p>`);
    }
    return view("비밀번호 재설정", `<p>해당 계정이 있으면 등록된 메일로 재설정 링크를 보냈습니다.</p><p><a href="${base}">돌아가기</a></p>`);
  }

  if (path === "/reset") {
    const source = method === "POST" ? await readForm(ctx.request, 4096) : params;
    const user = String(source.get("user") ?? "");
    const token = String(source.get("token") ?? "");
    if (!validToken(user, token)) {
      return view("비밀번호 재설정", `<p class="err">유효하지 않거나 만료된 재설정 링크입니다.</p><p><a href="${base}/forgot">다시 요청하기</a></p>`, 400);
    }
    if (method === "GET") {
      return view("새 비밀번호 설정", `<p>계정: <b>${escapeHtml(user)}</b></p>
        <form method="post" action="${base}/reset">
          <input type="hidden" name="user" value="${escapeHtml(user)}"><input type="hidden" name="token" value="${escapeHtml(token)}">
          <input name="password" type="password" placeholder="새 비밀번호"><button>변경하기</button>
        </form>`);
    }
    return redirect(`${base}/me?reset=1`, [sessionCookie(ctx, { user })]);
  }

  if (method === "GET" && path === "/me") {
    const session = readSession<Session>(ctx);
    if (!session) return redirect(base);
    const notice = params.get("reset") ? `<p class="ok">비밀번호가 변경되었고 로그인되었습니다.</p>` : "";
    const admin = session.user === "admin" ? `<h2>관리자 전용</h2><code>${escapeHtml(ctx.flag)}</code>` : `<p class="muted">관리자 계정에서만 볼 수 있는 정보가 있습니다.</p>`;
    return view(`${escapeHtml(session.user)} 님의 계정`, `${notice}${admin}<p><a href="${base}/logout">로그아웃</a></p>`);
  }

  if (method === "GET" && path === "/logout") return redirect(base, [sessionCookie(ctx, null)]);

  return view("404", "", 404);
};

export default handler;
