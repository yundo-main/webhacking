import Link from "next/link";
import { Suspense } from "react";
import { CHALLENGES } from "@/lib/challenges";
import { getSolveCounts, getSolvedBy } from "@/lib/scoreboard";
import { getUser } from "@/lib/session";

async function ChallengeList() {
  const user = await getUser();
  const [counts, solved] = await Promise.all([
    getSolveCounts(),
    user ? getSolvedBy(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <>
      {!user && (
        <p className="text-sm text-zinc-400">
          <Link href="/login?next=%2Fchallenges" className="text-emerald-400 underline">
            로그인
          </Link>
          하면 문제 사이트를 열고 플래그를 제출할 수 있습니다.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHALLENGES.map((c) => (
          <li key={c.id}>
            <Link
              href={`/challenges/${c.id}`}
              className={`block h-full rounded-lg border p-4 transition hover:bg-white/5 ${solved.has(c.id) ? "border-emerald-600/60" : "border-white/10"}`}
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{c.category}</span>
                <span className="font-mono">{c.points}점</span>
              </div>
              <h2 className="mt-2 font-semibold">
                {solved.has(c.id) && <span className="mr-1 text-emerald-400">✓</span>}
                {c.title}
              </h2>
              <p className="mt-2 text-xs text-zinc-500">
                {c.difficulty} · {counts.get(c.id) ?? 0}명 해결
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function ChallengesPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">문제</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">불러오는 중…</p>}>
        <ChallengeList />
      </Suspense>
    </section>
  );
}
