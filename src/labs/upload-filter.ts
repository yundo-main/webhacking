import { randomBytes } from "node:crypto";
import { cardStyle, escapeHtml, html, page, readForm, type LabHandler } from "./kit";

/**
 * upload-filter: the "image only" check trusts the Content-Type of the multipart file part, which the
 * client controls. Files are inspected in memory and never stored.
 */

const CSS = cardStyle("#f59e0b", "#1c1917", "#292524") + "table{width:100%;border-collapse:collapse}td{padding:.3rem;border-bottom:1px solid #44403c}td:first-child{color:#a8a29e;width:40%}";
const MAX = 1024 * 1024;

const view = (body: string, status = 200) =>
  html(page("이미지 보관함", `<main><h1>이미지 보관함</h1>${body}</main>`, CSS), { status });

const form = (base: string) => `
<p>프로필 이미지를 올려 주세요. <b>이미지 파일만</b> 받습니다.</p>
<form method="post" action="${base}/upload" enctype="multipart/form-data">
  <input type="file" name="file" accept="image/*"><button>업로드</button>
</form>`;

const handler: LabHandler = async (ctx) => {
  const { base, method, path } = ctx;

  if (method === "GET" && path === "/") return view(form(base));

  if (method === "POST" && path === "/upload") {
    let file: FormDataEntryValue | null;
    try {
      file = (await readForm(ctx.request, MAX + 16 * 1024)).get("file");
    } catch {
      return view(`<p class="err">파일이 너무 크거나 형식이 잘못된 요청입니다. (최대 1MB)</p>${form(base)}`, 413);
    }
    if (!(file instanceof File) || file.size === 0) return view(`<p class="err">파일을 선택하세요.</p>${form(base)}`, 400);

    const info = `<table>
      <tr><td>파일 이름</td><td><code>${escapeHtml(file.name)}</code></td></tr>
      <tr><td>Content-Type</td><td><code>${escapeHtml(file.type || "(없음)")}</code></td></tr>
      <tr><td>크기</td><td>${file.size} bytes</td></tr></table>`;

    // VULNERABLE ON PURPOSE: only the client-supplied part Content-Type is checked.
    if (!file.type.toLowerCase().startsWith("image/")) {
      return view(`<p class="err">이미지 파일만 업로드할 수 있습니다.</p>${info}${form(base)}`, 415);
    }

    const extension = (file.name.split(".").pop() ?? "").toLowerCase();
    const head = await file.slice(0, 64 * 1024).text();
    const stored = `/uploads/${randomBytes(6).toString("hex")}.${escapeHtml(extension || "bin")}`;

    if ((extension === "html" || extension === "htm") && /<html[\s>]/i.test(head)) {
      return view(`<p class="ok">업로드 완료: <code>${stored}</code></p>${info}
        <p>서버가 HTML 문서를 이미지로 받아 저장했습니다. 이 주소를 열면 브라우저가 HTML로 실행합니다.</p>
        <h2>플래그</h2><code>${escapeHtml(ctx.flag)}</code>`);
    }
    return view(`<p class="ok">업로드 완료: <code>${stored}</code></p>${info}<p class="muted">평범한 이미지 파일이 저장되었습니다.</p><p><a href="${base}">돌아가기</a></p>`);
  }

  return view("<p>404</p>", 404);
};

export default handler;
