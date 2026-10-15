"use client";

import { useActionState, useState } from "react";
import { adminLogin, type AdminLoginState } from "@/lib/admin-actions";

const initialState: AdminLoginState = { error: null };

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    adminLogin,
    initialState
  );
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-white">
          관리자 비밀번호
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            // 브라우저/비밀번호 관리자가 예전 값을 자동으로 채우지 않도록 한다.
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="w-full rounded-lg border border-white/15 bg-coal-soft py-2.5 pl-3 pr-16 text-sm text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-white/50 hover:text-gold"
          >
            {show ? "숨기기" : "보기"}
          </button>
        </div>
        <p className="text-xs text-white/40">
          &lsquo;보기&rsquo;를 눌러 입력한 글자가 맞는지(한/영 상태 포함) 확인하세요.
        </p>
      </div>
      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-night transition hover:bg-gold-soft disabled:opacity-60"
      >
        {pending ? "확인 중…" : "관리자 로그인"}
      </button>
    </form>
  );
}
