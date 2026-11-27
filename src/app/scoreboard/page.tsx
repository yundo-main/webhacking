import { connection } from "next/server";
import { Suspense } from "react";
import { getScoreboard } from "@/lib/scoreboard";

async function ScoreTable() {
  await connection(); // live data: always render at request time
  const rows = await getScoreboard();

  if (rows.length === 0) return <p className="text-sm text-zinc-400">아직 해결한 참가자가 없습니다.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-zinc-400">
          <tr>
            <th className="py-2 pr-4">순위</th>
            <th className="py-2 pr-4">참가자</th>
            <th className="py-2 pr-4 text-right">점수</th>
            <th className="py-2 pr-4 text-right">해결</th>
            <th className="py-2 text-right">마지막 해결</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.userId} className="border-b border-white/5">
              <td className="py-2 pr-4 font-mono">{index + 1}</td>
              <td className="py-2 pr-4">{row.name}</td>
              <td className="py-2 pr-4 text-right font-mono">{row.score}</td>
              <td className="py-2 pr-4 text-right">{row.solves}</td>
              <td className="py-2 text-right text-zinc-400">{row.lastSolve.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScoreboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">스코어보드</h1>
      <Suspense fallback={<p className="text-sm text-zinc-400">불러오는 중…</p>}>
        <ScoreTable />
      </Suspense>
    </section>
  );
}
