"use client";

import Link from "next/link";
import { useEffect } from "react";

// Keeps the header visible and explains the failure instead of replacing the whole page.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="space-y-4 py-12">
      <h1 className="text-2xl font-bold">페이지를 불러오지 못했습니다</h1>
      <p className="text-zinc-600">
        서버에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. 계속되면 운영자에게 알려 주세요.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          다시 시도
        </button>
        <Link href="/" className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
          처음으로
        </Link>
      </div>
    </section>
  );
}
