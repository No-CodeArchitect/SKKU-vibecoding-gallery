"use client";

import { useActionState } from "react";
import { submitJudgeScore, type JudgeScoreState } from "@/lib/judge-actions";
import { RUBRIC } from "@/lib/scoring";
import RubricRating from "./RubricRating";

const initialState: JudgeScoreState = { ok: false, error: null };

export default function JudgeScoreForm({
  projectId,
  isOpen,
  existing,
}: {
  projectId: string;
  isOpen: boolean;
  existing: { completeness: number; creativity: number; comment: string } | null;
}) {
  const [state, formAction, pending] = useActionState(submitJudgeScore, initialState);

  if (!isOpen) {
    return (
      <p className="rounded-lg bg-white/5 px-3 py-3 text-sm text-white/50">
        결과가 발표되어 심사가 마감되었습니다.
        {existing && ` (완성도 ${existing.completeness} · 창의성 ${existing.creativity})`}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      {RUBRIC.map((r) => (
        <RubricRating
          key={r.key}
          name={r.key}
          label={r.label}
          hint={r.hint}
          defaultValue={existing?.[r.key] ?? 0}
        />
      ))}
      <textarea
        name="comment"
        rows={2}
        maxLength={500}
        defaultValue={existing?.comment ?? ""}
        placeholder="심사 코멘트 (선택 · 관리자만 봅니다)"
        className="w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-gold focus:ring-2 focus:ring-gold/20"
      />

      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state.ok && !pending && (
        <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          심사 점수가 저장되었습니다.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-night transition hover:bg-gold-soft disabled:opacity-60"
      >
        {pending ? "저장 중…" : existing ? "심사 점수 수정" : "심사 점수 제출"}
      </button>
    </form>
  );
}
