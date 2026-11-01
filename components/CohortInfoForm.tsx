"use client";

import { useActionState, useState } from "react";
import { updateCohortInfoAction, type CohortInfoState } from "@/lib/admin-actions";

const initialState: CohortInfoState = { ok: false, error: null };

const inputCls =
  "w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20";

// 관리자: 섹션 이름·링크 주소(/g/<주소>) 변경
export default function CohortInfoForm({
  cohortId,
  name,
  slug,
  origin,
}: {
  cohortId: string;
  name: string;
  slug: string;
  origin: string;
}) {
  const [state, formAction, pending] = useActionState(updateCohortInfoAction, initialState);
  // 저장이 거절돼도 입력값이 되돌아가지 않도록 직접 들고 있는다
  const [nameVal, setNameVal] = useState(name);
  const [slugVal, setSlugVal] = useState(slug);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="cohortId" value={cohortId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-white/60">
          섹션 이름
          <input name="name" required maxLength={60} value={nameVal} onChange={(e) => setNameVal(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          링크 주소 (영문·숫자·- 권장)
          <span className="flex items-center gap-1">
            <span className="shrink-0 font-mono text-white/40">/g/</span>
            <input
              name="slug"
              required
              maxLength={60}
              value={slugVal}
              onChange={(e) => setSlugVal(e.target.value)}
              placeholder="예: 2026-2"
              className={`${inputCls} font-mono`}
            />
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-xs text-white/40">
          링크를 바꾸면 예전 링크는 더 이상 열리지 않습니다. 참가자에게 새 링크를 다시 안내하세요.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-night transition hover:bg-brand-soft disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300">{state.error}</p>
      )}
      {state.ok && !pending && (
        <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
          저장되었습니다. 새 링크: <span className="font-mono">{origin}/g/{slug}</span>
        </p>
      )}
    </form>
  );
}
