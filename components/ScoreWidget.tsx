"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitScore, type ScoreState } from "@/lib/score-actions";
import RubricRating from "./RubricRating";
import { RUBRIC } from "@/lib/scoring";

const initialState: ScoreState = { ok: false, error: null };

export default function ScoreWidget({
  projectId,
  isLoggedIn,
  isMine,
  isScoringOpen,
  existing,
  loginHref,
}: {
  projectId: string;
  loginHref: string;
  isLoggedIn: boolean;
  isMine: boolean;
  isScoringOpen: boolean;
  existing: { completeness: number; creativity: number } | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitScore,
    initialState
  );

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
        <h3 className="text-sm font-bold text-white">채점</h3>
        <p className="mt-2 text-sm text-white/50">
          이 섹션에 가입·수락된 참가자만 채점할 수 있습니다.
        </p>
        <Link
          href={loginHref}
          className="mt-4 block rounded-lg bg-gold px-4 py-2.5 text-center text-sm font-bold text-night transition hover:bg-gold-soft"
        >
          로그인하고 채점하기
        </Link>
      </div>
    );
  }

  if (isMine) {
    return (
      <div className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
        <h3 className="text-sm font-bold text-white">채점</h3>
        <p className="mt-2 rounded-lg bg-white/5 px-3 py-3 text-sm text-white/50">
          본인 작품은 채점할 수 없습니다. 다른 참가자의 프로젝트를 채점해 주세요.
        </p>
      </div>
    );
  }

  const alreadyScored = !!existing;

  return (
    <div className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">동료평가</h3>
        {alreadyScored && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            채점완료
          </span>
        )}
      </div>

      {!isScoringOpen ? (
        <p className="rounded-lg bg-white/5 px-3 py-3 text-sm text-white/50">
          채점이 마감되었습니다.
        </p>
      ) : (
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

          {state.error && !pending && (
            <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
              채점이 저장되었습니다. 결과와 순위는 마감 후 공개됩니다.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-night transition hover:bg-gold-soft disabled:opacity-60"
          >
            {pending
              ? "저장 중…"
              : alreadyScored
                ? "채점 수정"
                : "채점 제출"}
          </button>
          <p className="text-center text-xs text-white/40">
            점수는 마감 전까지 언제든 수정할 수 있어요.
          </p>
        </form>
      )}
    </div>
  );
}
