"use client";

import { useActionState } from "react";
import type { SubmitState } from "@/app/actions";

const COLORS: Record<SubmitState["status"], string> = {
  idle: "",
  correct: "text-emerald-400",
  wrong: "text-rose-400",
  error: "text-amber-400",
};

export function FlagForm({
  action,
}: {
  action: (prev: SubmitState, formData: FormData) => Promise<SubmitState>;
}) {
  const initial: SubmitState = { status: "idle", message: "" };
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="flag"
          required
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
          placeholder="WH{...}"
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? "확인 중…" : "제출"}
        </button>
      </div>
      {state.message && (
        <p role="status" className={`text-sm ${COLORS[state.status]}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
