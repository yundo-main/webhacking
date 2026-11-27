import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInButtons } from "@/components/auth-buttons";
import { enabledProviders } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { getUser } from "@/lib/session";

export const metadata: Metadata = { title: "로그인 · Webhacking CTF" };

const ERRORS: Record<string, string> = {
  oauth: "로그인이 완료되지 않았습니다. 다시 시도해 주세요.",
  access_denied: "로그인 권한 요청이 취소되었습니다.",
};

async function LoginPanel({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getUser()) redirect(next);

  const errorKey = Array.isArray(params.error) ? params.error[0] : params.error;
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.oauth) : "";

  return (
    <>
      {error && (
        <p role="alert" className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <SignInButtons providers={enabledProviders} callbackURL={next} />
    </>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-6 py-16">
      <div className="space-y-2 text-center">
        <p className="font-mono text-sm text-emerald-400">WH&#123;ctf&#125;</p>
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="text-sm text-zinc-400">계정으로 로그인하면 문제 사이트를 열고 플래그를 제출할 수 있습니다.</p>
      </div>
      <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <Suspense fallback={<div className="h-11 animate-pulse rounded-md bg-white/5" />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="text-center text-xs text-zinc-500">
        처음 로그인하면 계정이 자동으로 만들어집니다. 스코어보드에는 계정 이름만 공개됩니다.
        <br />
        <Link href="/" className="underline hover:text-zinc-300">
          처음으로
        </Link>
      </p>
    </section>
  );
}
