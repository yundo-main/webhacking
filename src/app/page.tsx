import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SignInButtons } from "@/components/auth-buttons";
import { enabledProviders } from "@/lib/auth";
import { competitionState } from "@/lib/competition";
import { missingConfig } from "@/lib/config";
import { getUser } from "@/lib/session";

async function HomeActions() {
  await connection(); // competition window and config depend on the running environment
  const missing = missingConfig();
  const [user, competition] = [await getUser(), competitionState()];
  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-semibold">서버 설정이 끝나지 않았습니다.</p>
          <p className="mt-1">배포 환경변수에 다음 값을 설정한 뒤 다시 배포하세요:</p>
          <ul className="mt-2 list-inside list-disc font-mono">
            {missing.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      {!competition.open && <p className="text-amber-400">{competition.reason}</p>}
      {user ? (
        <Link href="/challenges" className="inline-block rounded-md bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500">
          문제 보러 가기
        </Link>
      ) : (
        <SignInButtons providers={enabledProviders} />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <section className="space-y-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight">웹해킹 CTF</h1>
      <p className="max-w-2xl text-zinc-400">
        문제마다 나만 쓰는 취약 서버가 만들어집니다. 취약점을 찾아 플래그를 얻고 제출하세요. 플래그는 참가자마다 다르므로 공유해도 점수가 오르지 않습니다.
      </p>
      <Suspense fallback={<div className="h-10" />}>
        <HomeActions />
      </Suspense>
    </section>
  );
}
