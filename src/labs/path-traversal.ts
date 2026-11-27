import { posix } from "node:path";
import { cardStyle, escapeHtml, html, page, type LabHandler } from "./kit";

/**
 * path-traversal: a document viewer that joins the `name` parameter onto its public folder without
 * checking the result stays inside it. The "filesystem" is an in-memory map; nothing touches real disk.
 */

const PUBLIC_DIR = "/srv/docs/public";

function files(flag: string): Record<string, string> {
  return {
    "/srv/docs/public/welcome.txt": "자료실에 오신 것을 환영합니다.\n공개 문서는 목록에서 선택해 열람할 수 있습니다.\n",
    "/srv/docs/public/guide.txt": "열람 방법: /c/path-traversal/view?name=<파일명>\n공개 폴더: /srv/docs/public\n",
    "/srv/docs/public/notice.txt": "비공개 문서(/srv/docs/private)는 관리자만 열람할 수 있습니다.\n",
    "/srv/docs/private/note.txt": `[관리자 메모]\n백업 작업 완료. 다음 점검 때 아래 값을 확인할 것.\n\n${flag}\n`,
    "/srv/docs/private/todo.txt": "- 문서 뷰어 경로 검증 추가하기 (미완료)\n",
    "/etc/passwd": "root:x:0:0:root:/root:/bin/sh\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n",
    "/etc/hostname": "docs-viewer\n",
  };
}

const CSS = cardStyle("#0ea5e9");

const handler: LabHandler = (ctx) => {
  const { base, method, path } = ctx;
  if (method !== "GET") return html(page("405", "<main><h1>405</h1></main>", CSS), { status: 405 });

  if (path === "/") {
    const names = ["welcome.txt", "guide.txt", "notice.txt"];
    const list = names.map((n) => `<li><a href="${base}/view?name=${n}">${n}</a></li>`).join("");
    return html(page("사내 자료실", `<main><h1>사내 자료실</h1><p class="muted">공개 문서</p><ul>${list}</ul></main>`, CSS));
  }

  if (path === "/view") {
    const name = ctx.request.nextUrl.searchParams.get("name") ?? "";
    // VULNERABLE ON PURPOSE: the joined path is never checked against PUBLIC_DIR.
    const resolved = posix.join(PUBLIC_DIR, name);
    const content = files(ctx.flag)[resolved];
    const body =
      content === undefined
        ? `<p class="err">파일을 찾을 수 없습니다: <code>${escapeHtml(resolved)}</code></p>`
        : `<p class="muted"><code>${escapeHtml(resolved)}</code></p><pre>${escapeHtml(content)}</pre>`;
    return html(page("사내 자료실", `<main><h1>${escapeHtml(name || "(이름 없음)")}</h1>${body}<p><a href="${base}">목록으로</a></p></main>`, CSS), {
      status: content === undefined ? 404 : 200,
    });
  }

  return html(page("404", "<main><h1>404</h1></main>", CSS), { status: 404 });
};

export default handler;
