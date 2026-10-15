"use client";

import { useActionState, useEffect, useRef } from "react";
import { postComment, type CommentState } from "@/lib/comment-actions";

const initialState: CommentState = { ok: false, error: null };

export default function CommentForm({
  projectId,
  isAuthor,
}: {
  projectId: string;
  isAuthor: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    postComment,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  // 제출 성공 시 입력창 비우기.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <textarea
        name="body"
        rows={3}
        maxLength={500}
        required
        placeholder={
          isAuthor
            ? "제작자로서 답글을 남겨보세요"
            : "이 프로젝트에 대한 코멘트를 남겨보세요"
        }
        className="w-full resize-none rounded-xl border border-white/15 bg-coal-soft px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-gold focus:ring-2 focus:ring-gold/20"
      />
      {state.error && !pending && (
        <p className="text-sm text-red-300">{state.error}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">
          작성하면 재치있는 닉네임으로 표시됩니다.
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night transition hover:bg-gold-soft disabled:opacity-60"
        >
          {pending ? "등록 중…" : "댓글 등록"}
        </button>
      </div>
    </form>
  );
}
