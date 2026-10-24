"use client";

import { useActionState } from "react";
import { joinSectionAction, type JoinState } from "@/lib/auth-actions";

const initialState: JoinState = { ok: false, error: null };

const inputCls =
  "w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function JoinForm({
  cohortId,
  initial,
}: {
  cohortId: string;
  initial?: { realName: string; nickname: string };
}) {
  const [state, formAction, pending] = useActionState(joinSectionAction, initialState);
  const v = state.values ?? initial;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="cohortId" value={cohortId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="realName" className="text-sm font-semibold text-white">
          실명<span className="ml-1 text-brand">*</span>
        </label>
        <input
          id="realName"
          name="realName"
          required
          maxLength={20}
          defaultValue={v?.realName ?? ""}
          placeholder="예: 홍길동"
          className={inputCls}
        />
        <p className="text-xs text-white/40">관리자만 봅니다. 참가자 명단과 맞춰 가입을 수락하는 데 씁니다.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nickname" className="text-sm font-semibold text-white">
          닉네임<span className="ml-1 text-brand">*</span>
        </label>
        <input
          id="nickname"
          name="nickname"
          required
          maxLength={12}
          defaultValue={v?.nickname ?? ""}
          placeholder="예: 코딩하는소대장"
          className={inputCls}
        />
        <p className="text-xs text-white/40">
          갤러리에 표시되는 이름입니다 (작품 제작자 등). 2~12자, 섹션 안에서 중복 불가.
        </p>
      </div>

      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-night transition hover:bg-brand-soft disabled:opacity-60"
      >
        {pending ? "신청 중…" : "가입 신청"}
      </button>
    </form>
  );
}
