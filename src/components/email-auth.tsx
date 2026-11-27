"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const NAME_MAX = 30;

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "이메일 또는 비밀번호가 올바르지 않습니다.",
  INVALID_EMAIL: "올바른 이메일 주소를 입력하세요.",
  PASSWORD_TOO_SHORT: "비밀번호는 8자 이상이어야 합니다.",
  PASSWORD_TOO_LONG: "비밀번호는 128자 이하여야 합니다.",
  USER_ALREADY_EXISTS: "이미 가입된 이메일입니다. 로그인하거나 처음 가입한 방법(GitHub·Google)으로 로그인하세요.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 가입된 이메일입니다. 로그인하거나 처음 가입한 방법(GitHub·Google)으로 로그인하세요.",
};

function message(error: { code?: string; status?: number } | null | undefined) {
  if (!error) return "";
  if (error.status === 429) return "시도가 너무 잦습니다. 잠시 후 다시 시도하세요.";
  return (error.code && MESSAGES[error.code]) || "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.";
}

const input =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500";
const submit =
  "w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50";

function useAuthSubmit(next: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<{ error: { code?: string; status?: number } | null }>) {
    setPending(true);
    setError("");
    const result = await action();
    if (result.error) {
      setError(message(result.error));
      setPending(false);
      return;
    }
    router.push(next);
    router.refresh();
  }
  return { pending, error, setError, run };
}

export function EmailSignInForm({ next }: { next: string }) {
  const { pending, error, run } = useAuthSubmit(next);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(() =>
      authClient.signIn.email({ email: String(form.get("email")).trim(), password: String(form.get("password")) }),
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="email" type="email" required autoComplete="email" placeholder="이메일" className={input} />
      <input name="password" type="password" required autoComplete="current-password" placeholder="비밀번호" className={input} />
      <button type="submit" disabled={pending} className={submit}>
        {pending ? "로그인 중…" : "이메일로 로그인"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const { pending, error, setError, run } = useAuthSubmit(next);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const password = String(form.get("password"));
    if (!name) return setError("닉네임을 입력하세요.");
    if (password !== String(form.get("confirm"))) return setError("비밀번호 확인이 일치하지 않습니다.");
    run(() => authClient.signUp.email({ name, email: String(form.get("email")).trim(), password }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <input name="name" required maxLength={NAME_MAX} autoComplete="nickname" placeholder="닉네임 (스코어보드에 공개)" className={input} />
      </div>
      <input name="email" type="email" required autoComplete="email" placeholder="이메일 (로그인 ID)" className={input} />
      <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="비밀번호 (8자 이상)" className={input} />
      <input name="confirm" type="password" required minLength={8} maxLength={128} autoComplete="new-password" placeholder="비밀번호 확인" className={input} />
      <button type="submit" disabled={pending} className={submit}>
        {pending ? "가입 중…" : "가입하기"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}
