"use client";

import { useActionState, useState } from "react";
import ThumbnailUploader from "./ThumbnailUploader";
import { submitProjectAction, type SubmitState } from "@/lib/project-actions";
import type { Submission } from "@/lib/projects-data";

const initialState: SubmitState = { ok: false, error: null };

type Field = {
  name: keyof Submission;
  label: string;
  required?: boolean;
  multiline?: boolean;
  max: number;
  placeholder: string;
  hint?: string;
};

const FIELDS: Field[] = [
  { name: "title", label: "프로젝트명", required: true, max: 40, placeholder: "예: 당직 근무표 자동 편성기" },
  { name: "liveUrl", label: "배포 주소 (URL)", required: true, max: 500, placeholder: "https://…", hint: "누구나 접속할 수 있는 공개 주소를 넣어 주세요. AI가 이 페이지 내용도 참고합니다." },
  { name: "tagline", label: "한 줄 소개", required: true, max: 80, placeholder: "예: 엑셀 지옥 탈출, 클릭 한 번으로 공평한 근무표" },
  { name: "problem", label: "어떤 문제를 해결하나요?", required: true, multiline: true, max: 600, placeholder: "부대·업무 현장에서 겪던 불편함, 누가 어떤 상황에서 쓰는지" },
  { name: "features", label: "주요 기능", required: true, multiline: true, max: 600, placeholder: "줄바꿈 또는 쉼표로 구분 (예: 근무 조건 입력, 자동 편성, 엑셀 내보내기)" },
  { name: "militaryUseCase", label: "현장 활용 시나리오", multiline: true, max: 600, placeholder: "부대·기관·업무 현장에서 실제로 어떻게 쓰일 수 있는지" },
  { name: "techStack", label: "사용한 도구·기술", max: 200, placeholder: "예: Claude, Cursor, Vercel, Google Sheets" },
  { name: "repoUrl", label: "소스코드 주소 (선택)", max: 500, placeholder: "https://github.com/…" },
  { name: "notes", label: "제작 후기 · 어려웠던 점", multiline: true, max: 600, placeholder: "자유롭게" },
];

const inputCls =
  "w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function SubmitProjectForm({
  cohortId,
  initial,
  initialThumbUrl,
  locked,
}: {
  cohortId: string;
  initial: Submission | null;
  initialThumbUrl: string | null;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitProjectAction, initialState);
  const [thumbPath, setThumbPath] = useState(""); // 이번에 새로 올린 썸네일 경로

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="cohortId" value={cohortId} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-white">
          썸네일 (대표 이미지)<span className="ml-1 text-brand">*</span>
        </span>
        <ThumbnailUploader
          currentUrl={initialThumbUrl}
          cohortId={cohortId}
          disabled={locked}
          onUploaded={(path) => setThumbPath(path)}
        />
        <input type="hidden" name="thumbPath" value={thumbPath} />
        {state.thumbError && !pending ? (
          <p className="text-xs text-red-300">{state.thumbError}</p>
        ) : (
          <p className="text-xs text-white/40">
            갤러리 카드에 그대로 쓰입니다. 작품 첫 화면 캡처나 직접 만든 소개 이미지 모두 좋습니다.
            {thumbPath && thumbPath !== state.thumbSaved && <span className="ml-1 text-emerald-300">· 새 이미지 올림 (저장해야 반영)</span>}
          </p>
        )}
      </div>

      {FIELDS.map((f) => {
        const err = pending ? undefined : state.fieldErrors?.[f.name]; // 제출 중엔 이전 오류 숨김
        const common = {
          id: f.name,
          name: f.name,
          defaultValue: state.values?.[f.name] ?? initial?.[f.name] ?? "",
          maxLength: f.max,
          required: f.required,
          disabled: locked,
          placeholder: f.placeholder,
          className: `${inputCls} ${err ? "border-red-400/70" : ""}`,
        };
        return (
          <div key={f.name} className="flex flex-col gap-1.5">
            <label htmlFor={f.name} className="text-sm font-semibold text-white">
              {f.label}
              {f.required && <span className="ml-1 text-brand">*</span>}
            </label>
            {f.multiline ? (
              <textarea {...common} rows={3} className={`${common.className} resize-y`} />
            ) : (
              <input {...common} type={f.name.endsWith("Url") ? "url" : "text"} />
            )}
            {err ? (
              <p className="text-xs text-red-300">{err}</p>
            ) : (
              f.hint && <p className="text-xs text-white/40">{f.hint}</p>
            )}
          </div>
        );
      })}

      {state.error && !pending && (
        <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          저장되었습니다. 관리자가 분석을 실행하면 AI 요약·심사가 붙은 카드로 갤러리에
          올라갑니다.
        </p>
      )}

      {!locked && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-3 text-sm font-bold text-night transition hover:bg-brand-soft disabled:opacity-60"
        >
          {pending ? "저장 중…" : initial ? "수정 내용 저장" : "작품 등록하기"}
        </button>
      )}
    </form>
  );
}
