"use client";

import { useActionState, useState } from "react";
import { setWeightsAction, type WeightsState } from "@/lib/admin-actions";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/scoring";

const initialState: WeightsState = { ok: false, error: null };

const FIELDS: { key: keyof Weights; label: string }[] = [
  { key: "peer", label: "동료평가" },
  { key: "judge", label: "심사위원" },
  { key: "ai", label: "AI 평가" },
];

// 관리자: 종합 점수 배점 조정 (합계 100)
export default function WeightsForm({ current }: { current: Weights }) {
  const [state, formAction, pending] = useActionState(setWeightsAction, initialState);
  const [w, setW] = useState<Weights>(current);
  const sum = w.peer + w.judge + w.ai;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-xs text-white/60">
            {f.label}
            <span className="flex items-center gap-1">
              <input
                name={f.key}
                type="number"
                min={0}
                max={100}
                step={1}
                required
                value={Number.isNaN(w[f.key]) ? "" : w[f.key]}
                onChange={(e) => setW({ ...w, [f.key]: e.target.valueAsNumber })}
                className="w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm font-bold text-white outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
              <span className="text-white/40">점</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold ${sum === 100 ? "text-emerald-300" : "text-amber-300"}`}>
          합계 {Number.isNaN(sum) ? "-" : sum} / 100
        </span>
        <button
          type="button"
          onClick={() => setW(DEFAULT_WEIGHTS)}
          className="ml-auto rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-gold"
        >
          기본값 (70/20/10)
        </button>
        <button
          type="submit"
          disabled={pending || sum !== 100}
          className="rounded-lg bg-gold px-4 py-1.5 text-xs font-bold text-night transition hover:bg-gold-soft disabled:opacity-50"
        >
          {pending ? "저장 중…" : "배점 저장"}
        </button>
      </div>

      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300">{state.error}</p>
      )}
      {state.ok && !pending && (
        <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
          배점이 저장되었습니다. 순위·발표 화면에 바로 반영됩니다.
        </p>
      )}
    </form>
  );
}
