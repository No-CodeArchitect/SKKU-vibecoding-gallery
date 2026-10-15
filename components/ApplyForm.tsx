"use client";

import { useActionState } from "react";
import { submitEduRequest, type ApplyState } from "@/lib/edu-request-actions";

const initialState: ApplyState = { ok: false, error: null };

const inputCls =
  "w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold focus:ring-2 focus:ring-gold/20";

const FIELDS: {
  name: string;
  label: string;
  required?: boolean;
  max: number;
  placeholder: string;
  type?: string;
  multiline?: boolean;
}[] = [
  { name: "unit", label: "부대(기관)명", required: true, max: 60, placeholder: "예: ○○사단 정보통신대대" },
  { name: "contactName", label: "담당자 계급·성명", required: true, max: 40, placeholder: "예: 대위 홍길동" },
  { name: "phone", label: "연락처", required: true, max: 30, placeholder: "예: 010-1234-5678", type: "tel" },
  { name: "email", label: "이메일", max: 100, placeholder: "회신받을 이메일 (선택)", type: "email" },
  { name: "headcount", label: "희망 인원", max: 30, placeholder: "예: 30명 내외" },
  { name: "period", label: "희망 시기", max: 60, placeholder: "예: 2027년 3월 중, 3일 과정" },
  { name: "message", label: "교육 대상·희망 내용", max: 1000, placeholder: "교육 대상(간부/병사 등), 관심 주제, 문의 사항", multiline: true },
];

export default function ApplyForm() {
  const [state, formAction, pending] = useActionState(submitEduRequest, initialState);

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 p-8 text-center ring-1 ring-emerald-400/30">
        <div className="text-3xl">✓</div>
        <h2 className="mt-3 text-lg font-bold text-white">신청이 접수되었습니다</h2>
        <p className="mt-2 text-sm text-white/60">
          담당자가 내용을 확인한 뒤 남겨 주신 연락처로 연락드리겠습니다.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* 봇 차단용 숨은 칸 (사람에게는 보이지 않음) */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          웹사이트
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {FIELDS.map((f) => {
        const common = {
          id: f.name,
          name: f.name,
          required: f.required,
          maxLength: f.max,
          placeholder: f.placeholder,
          defaultValue: state.values?.[f.name] ?? "",
          className: inputCls,
        };
        return (
          <div key={f.name} className="flex flex-col gap-1.5">
            <label htmlFor={f.name} className="text-sm font-semibold text-white">
              {f.label}
              {f.required && <span className="ml-1 text-gold">*</span>}
            </label>
            {f.multiline ? (
              <textarea {...common} rows={4} className={`${inputCls} resize-y`} />
            ) : (
              <input {...common} type={f.type ?? "text"} />
            )}
          </div>
        );
      })}

      <p className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/50">
        보안상 민감한 정보(부대 위치·임무·병력 세부 등)는 적지 마세요.
      </p>

      <div className="rounded-xl bg-night px-4 py-3 text-xs leading-relaxed text-white/55 ring-1 ring-white/10">
        <p className="font-semibold text-white/80">개인정보 수집·이용 안내</p>
        <ul className="mt-1 list-disc pl-4">
          <li>수집 항목: 부대(기관)명, 담당자 계급·성명, 연락처, 이메일(선택)</li>
          <li>이용 목적: 교육 신청 확인 및 일정 협의를 위한 연락</li>
          <li>보유 기간: 상담 종료 후 1년 이내 파기 (요청 시 즉시 파기)</li>
          <li>동의를 거부할 수 있으나, 이 경우 신청 접수가 되지 않습니다.</li>
        </ul>
        <label className="mt-3 flex items-center gap-2 text-sm text-white">
          <input type="checkbox" name="consent" required className="h-4 w-4 accent-[#d9a441]" />
          위 내용에 동의합니다 <span className="text-gold">*</span>
        </label>
      </div>

      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-3 text-sm font-bold text-night transition hover:bg-gold-soft disabled:opacity-60"
      >
        {pending ? "접수 중…" : "교육 신청하기"}
      </button>
    </form>
  );
}
