import { randomBytes } from "node:crypto";
import { cardStyle, html, json, page, type LabHandler } from "./kit";

/**
 * nosql-login: a JSON login API passes request values straight into a MongoDB-style filter, so an
 * object like {"$ne": ""} becomes a query operator. The "collection" is an in-memory array and the
 * matcher below implements only a safe subset of operators (no $where / JavaScript evaluation).
 */

type Doc = Record<string, unknown>;

const OPERATORS = new Set(["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists", "$regex", "$options", "$not"]);

class QueryError extends Error {}

function compare(a: unknown, b: unknown) {
  if ((typeof a === "string" && typeof b === "string") || (typeof a === "number" && typeof b === "number")) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return null;
}

function matchCondition(value: unknown, condition: unknown): boolean {
  if (condition === null || typeof condition !== "object" || Array.isArray(condition)) return value === condition;
  const ops = condition as Doc;
  const keys = Object.keys(ops);
  if (!keys.every((k) => k.startsWith("$"))) return JSON.stringify(value) === JSON.stringify(condition);
  for (const key of keys) {
    if (!OPERATORS.has(key)) throw new QueryError(`unknown operator: ${key}`);
    const arg = ops[key];
    switch (key) {
      case "$eq": if (value !== arg) return false; break;
      case "$ne": if (value === arg) return false; break;
      case "$gt": if (compare(value, arg) !== 1) return false; break;
      case "$gte": { const c = compare(value, arg); if (c === null || c < 0) return false; break; }
      case "$lt": if (compare(value, arg) !== -1) return false; break;
      case "$lte": { const c = compare(value, arg); if (c === null || c > 0) return false; break; }
      case "$in": if (!Array.isArray(arg) || !arg.includes(value)) return false; break;
      case "$nin": if (!Array.isArray(arg) || arg.includes(value)) return false; break;
      case "$exists": if ((value !== undefined) !== Boolean(arg)) return false; break;
      case "$not": if (matchCondition(value, arg)) return false; break;
      case "$options": break;
      case "$regex": {
        if (typeof arg !== "string" || arg.length > 64) throw new QueryError("$regex must be a string up to 64 characters");
        const flags = typeof ops.$options === "string" ? ops.$options.replace(/[^imsu]/g, "") : "";
        let pattern: RegExp;
        try { pattern = new RegExp(arg, flags); } catch { throw new QueryError("invalid regular expression"); }
        if (typeof value !== "string" || !pattern.test(value)) return false;
        break;
      }
    }
  }
  return true;
}

function find(collection: Doc[], filter: Doc) {
  return collection.find((doc) => Object.entries(filter).every(([field, condition]) => matchCondition(doc[field], condition)));
}

const CSS = cardStyle("#10b981", "#04130e", "#0b2a20");

const PAGE = (base: string) => `<main><h1>문서형 인증 게이트</h1>
<p>새 로그인 API(<code>POST ${base}/api/login</code>, JSON)를 시험 중입니다. 체험 계정: student / student</p>
<form id="f"><input name="username" placeholder="아이디" autocomplete="off"><input name="password" type="password" placeholder="비밀번호"><button>로그인</button></form>
<pre id="out" class="muted">응답이 여기에 표시됩니다.</pre></main>
<script>
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await fetch(${JSON.stringify(base + "/api/login")}, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  document.getElementById("out").textContent = res.status + " " + JSON.stringify(await res.json(), null, 2);
});
</script>`;

const handler: LabHandler = async (ctx) => {
  const { base, method, path } = ctx;

  if (method === "GET" && path === "/") return html(page("인증 게이트", PAGE(base), CSS));

  if (method === "POST" && path === "/api/login") {
    if (!(ctx.request.headers.get("content-type") ?? "").includes("application/json")) {
      return json({ error: "Content-Type: application/json 이 필요합니다." }, 415);
    }
    const text = await ctx.request.text();
    if (text.length > 4096) return json({ error: "요청이 너무 큽니다." }, 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "JSON 형식이 올바르지 않습니다." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "객체가 필요합니다." }, 400);
    const { username, password } = body as Doc;

    const users: Doc[] = [
      { username: "admin", password: randomBytes(16).toString("hex"), role: "admin" },
      { username: "student", password: "student", role: "user" },
    ];
    try {
      // VULNERABLE ON PURPOSE: request values (possibly objects) go straight into the filter.
      const user = find(users, { username, password });
      if (!user) return json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." }, 401);
      if (user.role === "admin") return json({ ok: true, user: "admin", message: "관리자 인증 성공", flag: ctx.flag });
      return json({ ok: true, user: user.username, message: "로그인 성공. 관리자 기능은 admin 계정에서만 사용할 수 있습니다." });
    } catch (error) {
      if (error instanceof QueryError) return json({ ok: false, error: `query error: ${error.message}` }, 500);
      throw error;
    }
  }

  return json({ error: "Not found" }, 404);
};

export default handler;
