# Webhacking CTF

Vercel 하나로 운영하는 웹해킹 CTF입니다. Docker도 VPS도 필요하지 않습니다.

## 구조

```
Vercel 배포 1개, 도메인 2개
  ├─ 포털     ctf.example.com          로그인(Google·GitHub), 문제 목록, 채점, 스코어보드
  │                                     └─ Supabase Postgres (ctf 스키마): 계정·세션·제출·해결 기록
  └─ 문제 사이트 lab.example-labs.net  취약한 문제 앱 (src/labs/*)
```

- **도메인 분기:** `src/proxy.ts`가 Host로 요청을 나눕니다.
  - `LAB_ORIGIN` 호스트로 온 요청은 전부 `/lab/*` 라우트로 보냅니다.
  - 포털 호스트에서는 `/lab/*`를 404로 막습니다.
  - 그래서 문제 사이트는 포털과 출처가 다르고, 포털 쿠키나 API에 접근할 수 없습니다. 운영에서는 실습 도메인을 포털과 **다른 등록 도메인**으로 두세요.
- **문제는 진짜 취약하지만, 건드릴 수 있는 범위는 메모리뿐입니다.**
  - 예를 들어 SQLi 문제는 요청마다 WASM SQLite(sql.js)에 새 DB를 만듭니다. 실제 SQL 엔진이라 진짜 인젝션이 되지만, 서버 파일시스템이나 네트워크, 다른 참가자의 데이터에는 닿지 않습니다.
- **참가자별 플래그:** `HMAC(FLAG_SECRET, 문제ID:사용자ID)`로 만듭니다.
  - 문제 사이트는 접속한 참가자 본인의 플래그만 보여 주고, 채점은 포털에서 합니다.
  - 오답이 다른 참가자의 정답 플래그와 같으면 공유된 것으로 보고 `submission.matched_user_id`에 기록합니다.
- **접속 흐름:**
  1. 참가자가 포털에서 "문제 사이트 열기"를 누르면, 포털이 2분짜리 서명 토큰을 만들어 `LAB_ORIGIN/launch?t=...`로 보냅니다.
  2. 문제 사이트는 토큰을 확인한 뒤 12시간짜리 참가자 쿠키를 발급하고 문제 화면으로 이동시킵니다.
  3. 문제 안의 로그인 상태 쿠키는 참가자에게 묶여 있어서, 다른 사람에게 넘겨도 쓸모가 없습니다.
- **제출 제한:** 참가자당 1분에 10회입니다. 대회 시간은 `CTF_START`와 `CTF_END`로 설정합니다.

## 로컬 실행

1. [Supabase](https://supabase.com)에서 프로젝트를 만듭니다. 아래 "Supabase 설정"을 참고하세요. 로컬에 설치한 Postgres를 써도 됩니다.
2. 환경변수 파일을 만듭니다.

   ```bash
   cp .env.example .env.local
   ```

   - `.env.local`에 값을 채웁니다. 아래 OAuth 설정을 참고하세요.
   - `BETTER_AUTH_SECRET`, `FLAG_SECRET`, `LAB_SECRET`에는 각각 다른 값을 넣습니다. `openssl rand -hex 32`로 만들 수 있습니다.

3. 설치하고 실행합니다.

   ```bash
   npm install
   ```

   ```bash
   npm run db:migrate
   ```

   ```bash
   npm run dev
   ```

- **포털:** `http://localhost:3000`
- **문제 사이트:** `http://lab.localhost:3000`. Chrome과 Firefox는 `*.localhost`를 자동으로 루프백으로 처리합니다.

## Supabase 설정

Supabase는 **Postgres DB로만** 씁니다. 로그인은 Better Auth가 이 DB에 직접 저장하므로 Supabase Auth는 쓰지 않습니다.

1. 프로젝트를 만듭니다. 리전은 Vercel 함수와 가까운 곳(예: Northeast Asia (Seoul))을 고르세요.
2. 상단의 **Connect** 버튼에서 연결 문자열 두 개를 복사합니다.

   | 용도 | 종류 | 포트 | 넣을 변수 |
   |---|---|---|---|
   | 앱 실행 (Vercel 함수) | Transaction pooler | 6543 | `DATABASE_URL` |
   | 스키마 반영 (마이그레이션) | Session pooler 또는 Direct connection | 5432 | `DIRECT_URL` |

   `[YOUR-PASSWORD]` 자리에는 프로젝트를 만들 때 정한 DB 비밀번호를 넣습니다.

3. 스키마를 반영합니다. `npm run db:migrate`를 실행하면 `drizzle/` 폴더의 SQL이 적용되고, 테이블은 `ctf` 스키마에 만들어집니다.
   - 명령을 실행할 수 없는 환경이라면 `drizzle/0000_init.sql` 내용을 Supabase SQL Editor에 붙여 넣어 실행해도 됩니다.

**`public` 스키마를 쓰지 않는 이유**
- Supabase의 Data API는 기본적으로 `public` 스키마를 anon 키로 조회할 수 있게 열어 둡니다.
- 세션이나 OAuth 토큰이 그렇게 노출되지 않도록 모든 테이블을 `ctf` 스키마에 둡니다.
- Dashboard → Settings → API의 Exposed schemas에 `ctf`를 **추가하지 마세요**.
- 이 앱은 Data API를 쓰지 않으므로 Data API 자체를 꺼도 됩니다.

**연결 설정 참고**
- Transaction pooler(6543)는 prepared statement를 지원하지 않습니다. 그래서 코드에서 `prepare: false`로 연결합니다 (`src/db/index.ts`).
- Supabase 주소에는 SSL이 자동으로 적용됩니다 (`src/db/connection.ts`).

## OAuth 설정

| 제공자 | 콘솔 | Callback URL |
|---|---|---|
| GitHub | Settings → Developer settings → OAuth Apps | `<BETTER_AUTH_URL>/api/auth/callback/github` |
| Google | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (웹 애플리케이션) | `<BETTER_AUTH_URL>/api/auth/callback/google` |

로컬과 운영은 Callback URL이 다르므로 각각 등록하세요. 설정된 제공자만 로그인 버튼이 나타납니다.

## Vercel 배포

1. Vercel에서 이 리포를 Import합니다 (Framework: Next.js).
2. Supabase를 연결합니다. 방법은 둘 중 하나를 고르면 됩니다.
   - **Integration 사용:** Storage → Supabase(Marketplace)로 연결합니다. `POSTGRES_URL`(6543)과 `POSTGRES_URL_NON_POOLING`이 자동으로 설정되고, 코드가 이 값을 그대로 읽습니다.
   - **직접 입력:** Environment Variables에 `DATABASE_URL`(Transaction pooler, 6543)을 넣습니다. 둘 다 있으면 `DATABASE_URL`을 먼저 씁니다.
3. Settings → Domains에 도메인 두 개를 연결합니다. 포털용(예: `ctf.example.com`)과 문제 사이트용(예: `lab.example-labs.net`)입니다.
4. Environment Variables에 `.env.example`의 나머지 값을 넣습니다.
   - `BETTER_AUTH_URL`은 포털 주소, `LAB_ORIGIN`은 문제 사이트 주소입니다. 둘 다 `https://`로 시작해야 합니다.
5. 스키마를 반영합니다. 로컬 `.env.local`에 운영 Supabase의 `DIRECT_URL`을 넣고 `npm run db:migrate`를 한 번 실행합니다. SQL Editor에 `drizzle/0000_init.sql`을 붙여 넣어 실행해도 됩니다.
6. 스키마를 바꿀 때는 `src/db/schema.ts`를 수정한 뒤 `npm run db:generate`로 새 SQL을 만들고, 커밋한 다음 `npm run db:migrate`를 실행합니다.

Preview 배포에서는 문제 사이트 도메인이 연결되지 않으므로 문제 사이트가 열리지 않습니다.

## 문제 추가하기

1. 포털의 문제 목록에 추가합니다: `src/lib/challenges.ts`에 id, 제목, 배점을 적습니다.
2. 문제 앱을 만듭니다: `src/labs/<id>.ts`를 만들고 `LabHandler`를 default export합니다. `src/labs/sqli-login.ts`를 참고하세요.
3. 등록합니다: `src/labs/index.ts`의 `LABS`에 한 줄을 추가합니다.

**문제 코드 규칙** (`src/labs/kit.ts` 상단 주석 참고). 문제 코드는 포털과 같은 배포에서 실행되므로 반드시 지켜야 합니다.
- 취약점이 닿는 범위는 그 요청을 위해 만든 메모리 데이터뿐이어야 합니다.
- 실제 파일시스템을 읽지 않고, 실제 네트워크 요청을 보내지 않고, `eval`이나 `process.env`를 쓰지 않습니다.
- 경로 탐색 문제는 가상 파일 트리로, SSRF 문제는 앱 안의 가상 내부 호스트로 구현합니다.
- 공개해도 되는 것은 `ctx.flag`(접속한 참가자의 플래그)뿐입니다.

| 문제 | 취약점 | 안전장치 |
|---|---|---|
| `sqli-login` | 문자열로 이어 붙인 SQL | 요청마다 새로 만드는 sql.js 메모리 DB, ATTACH·VACUUM 차단 |
| `path-traversal` | `name`을 검증 없이 경로에 결합 | 메모리 안의 가상 파일 트리 |
| `auth-recovery` | `base64(사용자ID:날짜)` 형식의 재설정 토큰 | 상태를 저장하지 않음. 토큰이 맞으면 바로 로그인 처리 |
| `upload-filter` | 클라이언트가 보낸 파트 Content-Type만 검사 | 파일을 메모리에서 검사만 하고 저장하지 않음 (최대 1MB) |
| `ssrf-oracle` | 입력 문자열에 대한 블랙리스트만 있음 (`127.1`, `[::1]`, `0.0.0.0` 등으로 우회 가능) | 실제 요청 없이 가상 네트워크에서 응답 |
| `nosql-login` | JSON 값이 그대로 쿼리 연산자로 해석됨 | 직접 구현한 안전한 연산자만 지원 (`$where` 없음, `$regex`는 64자 이하) |

풀이 확인: `npm run build && npm start`로 서버를 띄운 뒤 `node scripts/labs-smoke.mjs`를 실행합니다. 같은 `LAB_SECRET`과 `FLAG_SECRET` 환경변수가 필요합니다.

## 디렉터리

```
src/proxy.ts                 포털·문제 사이트 Host 분기
src/app/(페이지)             포털: 홈, 문제, 스코어보드, actions.ts(채점)
src/app/challenges/[id]/open 포털 → 문제 사이트 이동 (launch 토큰)
src/app/lab/                 문제 사이트 라우트 (launch, /c/<문제ID>/...)
src/labs/                    문제 앱과 공통 도구(kit.ts, sqlite.ts)
src/lib/                     인증, 플래그, 토큰, 대회 시간, 스코어보드
src/db/                      Drizzle 스키마와 연결
```
