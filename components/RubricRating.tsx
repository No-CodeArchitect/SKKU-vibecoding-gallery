"use client";

import { useState } from "react";
import { SCORE_MAX } from "@/lib/scoring";

// 10점 루브릭 입력 (동료평가·심사위원 공용). 1~10 숫자 버튼, 선택값까지 채워진다.
export default function RubricRating({
  name,
  label,
  hint,
  defaultValue = 0,
  disabled = false,
}: {
  name: string;
  label: string;
  hint?: string; // 라벨 아래 작은 설명
  defaultValue?: number;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-white">{label}</span>
          {hint && <span className="text-[11px] text-white/40">{hint}</span>}
        </span>
        <span className="text-sm font-bold text-white">
          <span className="text-lg text-gold">{value > 0 ? value : "-"}</span>
          <span className="text-white/40"> / {SCORE_MAX}</span>
        </span>
      </div>
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-10 gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: SCORE_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${label} ${n}점`}
            aria-pressed={value === n}
            onClick={() => setValue(n)}
            onMouseEnter={() => !disabled && setHover(n)}
            className={`h-8 rounded-md text-xs font-bold transition ${
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5"
            } ${
              n === active
                ? "bg-gold text-night"
                : n < active
                  ? "bg-gold/35 text-white"
                  : "bg-white/5 text-white/40 ring-1 ring-white/10"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
