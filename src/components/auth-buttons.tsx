"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const LABELS = { github: "GitHub로 로그인", google: "Google로 로그인" } as const;

export function SignInButtons({ providers }: { providers: ("github" | "google")[] }) {
  const [pending, setPending] = useState<string | null>(null);

  if (providers.length === 0) {
    return <p className="text-sm text-amber-400">로그인 제공자가 설정되지 않았습니다. README의 OAuth 설정을 확인하세요.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={pending !== null}
          onClick={async () => {
            setPending(provider);
            await authClient.signIn.social({ provider, callbackURL: "/challenges" });
            setPending(null);
          }}
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
        >
          {pending === provider ? "이동 중…" : LABELS[provider]}
        </button>
      ))}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="text-sm text-zinc-400 hover:text-zinc-100"
    >
      로그아웃
    </button>
  );
}
