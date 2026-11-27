import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInButtons } from "@/components/auth-buttons";
import { EmailSignInForm, SignUpForm } from "@/components/email-auth";
import { emailSignupEnabled, enabledProviders } from "@/lib/auth";
import { competitionState } from "@/lib/competition";
import { missingConfig } from "@/lib/config";
import { safeNext } from "@/lib/safe-next";
import { getUser } from "@/lib/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Mode = "login" | "signup";

const ERRORS: Record<string, string> = {
  oauth: "로그인이 완료되지 않았습니다. 다시 시도해 주세요.",
  access_denied: "로그인 권한 요청이 취소되었습니다.",
  account_not_linked: "이미 이메일로 가입된 주소입니다. 이메일과 비밀번호로 로그인하세요.",
  unable_to_link_account: "이미 이메일로 가입된 주소입니다. 이메일과 비밀번호로 로그인하세요.",
};

// Google first; a provider without keys shows as "준비 중" instead of disappearing.
const PROVIDERS = (["google", "github"] as const).map((id) => ({ id, enabled: enabledProviders.includes(id) }));

const withNext = (path: string, next: string) => (next === "/challenges" ? path : `${path}?next=${encodeURIComponent(next)}`);

async function AuthPanel({ searchParams, mode }: { searchParams: SearchParams; mode: Mode }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getUser()) redirect(next);

  const missing = missingConfig();
  const competition = competitionState();
  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.oauth) : "";

  return (
    <>
      {missing.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900">
          <p className="font-semibold">서버 설정이 끝나지 않았습니다.</p>
          <p className="mt-1">배포 환경변수에 다음 값을 설정한 뒤 다시 배포하세요:</p>
          <ul className="mt-2 list-inside list-disc font-mono text-xs">
            {missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      {!competition.open && <p className="text-sm text-amber-700">{competition.reason}</p>}
      {error && (
        <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {mode === "login" ? (
        <>
          <EmailSignInForm next={next} />
          {emailSignupEnabled && (
            <p className="text-center text-sm text-zinc-600">
              계정이 없나요?{" "}
              <Link href={withNext("/signup", next)} className="text-emerald-700 underline">
                이메일로 회원가입
              </Link>
            </p>
          )}
        </>
      ) : emailSignupEnabled ? (
        <>
          <SignUpForm next={next} />
          <p className="text-center text-sm text-zinc-600">
            이미 계정이 있나요?{" "}
            <Link href={withNext("/login", next)} className="text-emerald-700 underline">
              로그인
            </Link>
          </p>
        </>
      ) : (
        <p className="text-sm text-amber-700">이메일 회원가입이 마감되었습니다.</p>
      )}

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-200" />
        또는 소셜 계정으로
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
      <SignInButtons providers={PROVIDERS} callbackURL={next} />
    </>
  );
}

/** Sign-in (also the front page) and sign-up screens. Signed-in visitors go straight to `next` (default /challenges). */
export function LoginView({ searchParams, mode = "login" }: { searchParams: SearchParams; mode?: Mode }) {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-16">
      <div className="space-y-3 text-center">
        <p className="font-mono text-sm text-emerald-700">WH&#123;ctf&#125;</p>
        <h1 className="text-3xl font-bold tracking-tight">{mode === "login" ? "웹해킹 CTF" : "회원가입"}</h1>
        <p className="text-sm text-zinc-600">
          {mode === "login"
            ? "문제마다 나만 쓰는 취약 사이트가 열립니다. 취약점을 찾아 플래그를 얻고 제출하세요. 플래그는 참가자마다 달라서 공유해도 점수가 오르지 않습니다."
            : "이메일이 로그인 ID가 됩니다. 닉네임은 스코어보드에 공개되고, 이메일은 공개되지 않습니다."}
        </p>
      </div>
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white shadow-sm p-6">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-md bg-zinc-100" />}>
          <AuthPanel searchParams={searchParams} mode={mode} />
        </Suspense>
      </div>
      <p className="text-center text-xs text-zinc-500">
        Google·GitHub로 처음 로그인하면 계정이 자동으로 만들어집니다. 스코어보드에는 닉네임만 공개됩니다.
        <br />
        <Link href="/challenges" className="underline hover:text-zinc-900">
          로그인 없이 문제 둘러보기
        </Link>
      </p>
    </section>
  );
}
