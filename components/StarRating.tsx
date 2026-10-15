"use client";

import { useState } from "react";

export default function StarRating({
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
    <div className="flex items-center justify-between gap-4">
      <span className="flex shrink-0 flex-col">
        <span className="whitespace-nowrap text-sm font-semibold text-white">{label}</span>
        {hint && <span className="whitespace-nowrap text-[11px] text-white/40">{hint}</span>}
      </span>
      <div className="flex items-center gap-1">
        <input type="hidden" name={name} value={value} />
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${label} ${n}점`}
            onClick={() => setValue(n)}
            onMouseEnter={() => !disabled && setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl leading-none transition ${
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:scale-110"
            } ${n <= active ? "text-gold" : "text-white/20"}`}
          >
            ★
          </button>
        ))}
        <span className="ml-1 w-8 text-right text-sm font-bold text-white">
          {value > 0 ? value.toFixed(0) : "-"}
        </span>
      </div>
    </div>
  );
}
