import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInButtons } from "@/components/auth-buttons";
import { enabledProviders } from "@/lib/auth";
import { competitionState } from "@/lib/competition";
import { missingConfig } from "@/lib/config";
import { safeNext } from "@/lib/safe-next";
import { getUser } from "@/lib/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const ERRORS: Record<string, string> = {
  oauth: "로그인이 완료되지 않았습니다. 다시 시도해 주세요.",
  access_denied: "로그인 권한 요청이 취소되었습니다.",
};

async function LoginPanel({ searchParams }: { searchParams: SearchParams }) {
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
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <p className="font-semibold">서버 설정이 끝나지 않았습니다.</p>
          <p className="mt-1">배포 환경변수에 다음 값을 설정한 뒤 다시 배포하세요:</p>
          <ul className="mt-2 list-inside list-disc font-mono text-xs">
            {missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      {!competition.open && <p className="text-sm text-amber-400">{competition.reason}</p>}
      {error && (
        <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <SignInButtons providers={enabledProviders} callbackURL={next} />
    </>
  );
}

/** The sign-in screen; also the site's front page. Signed-in visitors go straight to `next` (default /challenges). */
export function LoginView({ searchParams }: { searchParams: SearchParams }) {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-16">
      <div className="space-y-3 text-center">
        <p className="font-mono text-sm text-emerald-400">WH&#123;ctf&#125;</p>
        <h1 className="text-3xl font-bold tracking-tight">웹해킹 CTF</h1>
        <p className="text-sm text-zinc-400">
          문제마다 나만 쓰는 취약 사이트가 열립니다. 취약점을 찾아 플래그를 얻고 제출하세요. 플래그는 참가자마다 달라서 공유해도 점수가 오르지 않습니다.
        </p>
      </div>
      <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <Suspense fallback={<div className="h-11 animate-pulse rounded-md bg-white/5" />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="text-center text-xs text-zinc-500">
        처음 로그인하면 계정이 자동으로 만들어집니다. 스코어보드에는 계정 이름만 공개됩니다.
        <br />
        <Link href="/challenges" className="underline hover:text-zinc-300">
          로그인 없이 문제 둘러보기
        </Link>
      </p>
    </section>
  );
}
