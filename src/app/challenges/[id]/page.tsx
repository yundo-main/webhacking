import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { submitFlag } from "@/app/actions";
import { FlagForm } from "@/components/flag-form";
import { hasLab } from "@/labs";
import { CHALLENGES, getChallenge, type Challenge } from "@/lib/challenges";
import { loginHref } from "@/lib/safe-next";
import { getSolvedBy } from "@/lib/scoreboard";
import { getUser } from "@/lib/session";

// Challenge text is static; only the player's lab and solve state are per request.
export function generateStaticParams() {
  return CHALLENGES.map((c) => ({ id: c.id }));
}

async function PlayerArea({ challenge }: { challenge: Challenge }) {
  const user = await getUser();
  if (!user) {
    return (
      <p className="text-sm text-zinc-600">
        <Link href={loginHref(`/challenges/${challenge.id}`)} className="text-emerald-700 underline">
          로그인
        </Link>
        하면 문제 사이트를 열고 플래그를 제출할 수 있습니다.
      </p>
    );
  }

  const solved = (await getSolvedBy(user.id)).has(challenge.id);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-zinc-700">문제 사이트</h2>
        {hasLab(challenge.id) ? (
          <>
            <a
              href={`/challenges/${challenge.id}/open`}
              target="_blank"
              rel="noopener"
              className="inline-block rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-500"
            >
              문제 사이트 열기 ↗
            </a>
            <p className="text-xs text-zinc-500">나에게만 보이는 데이터로 새 탭에서 열립니다. 무엇을 해도 다른 참가자에게 영향이 없습니다.</p>
          </>
        ) : (
          <p className="text-sm text-zinc-600">문제 사이트를 준비 중입니다.</p>
        )}
      </div>
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-zinc-700">플래그 제출</h2>
        {solved ? (
          <p className="text-sm text-emerald-700">✓ 이미 해결한 문제입니다.</p>
        ) : (
          <FlagForm action={submitFlag.bind(null, challenge.id)} />
        )}
      </div>
    </div>
  );
}

export default async function ChallengePage({ params }: PageProps<"/challenges/[id]">) {
  const { id } = await params;
  const challenge = getChallenge(id);
  if (!challenge) notFound();

  return (
    <article className="space-y-6">
      <Link href="/challenges" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← 문제 목록
      </Link>
      <header className="space-y-1">
        <p className="text-xs text-zinc-600">
          {challenge.category} · {challenge.difficulty} · <span className="font-mono">{challenge.points}점</span>
        </p>
        <h1 className="text-2xl font-bold">{challenge.title}</h1>
      </header>
      <p className="text-zinc-700">{challenge.description}</p>
      {challenge.hint && (
        <details className="text-sm text-zinc-600">
          <summary className="cursor-pointer">힌트</summary>
          <p className="mt-2">{challenge.hint}</p>
        </details>
      )}
      <Suspense fallback={<p className="text-sm text-zinc-600">불러오는 중…</p>}>
        <PlayerArea challenge={challenge} />
      </Suspense>
    </article>
  );
}
