"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteProjectAction,
  removeThumbnailAction,
  setThumbnailAction,
} from "@/lib/project-actions";
import ThumbnailUploader from "./ThumbnailUploader";

export interface SubmissionRow {
  id: string;
  title: string;
  authorName: string;
  liveUrl: string;
  status: "pending" | "processing" | "generated" | "capture_failed" | "failed";
  needsAnalysis: boolean;
  published: boolean;
  mock: boolean;
  thumbUrl: string | null;
  error: string | null;
  updatedAt: string;
}

type RunState = { phase: "running" | "done" | "error"; message?: string };

const CONCURRENCY = 3; // 동시에 분석할 작품 수

function chip(row: SubmissionRow, run?: RunState) {
  if (run?.phase === "running") return ["분석 중…", "bg-sky-500/20 text-sky-300"];
  if (run?.phase === "error") return ["실패", "bg-red-500/20 text-red-300"];
  if (row.status === "failed") return ["실패", "bg-red-500/20 text-red-300"];
  if (!row.published) return ["분석 대기", "bg-amber-500/20 text-amber-300"];
  if (row.needsAnalysis) return ["수정됨 · 재분석 필요", "bg-amber-500/20 text-amber-300"];
  if (!row.thumbUrl) return ["공개 · 썸네일 없음", "bg-white/10 text-white/60"];
  return ["공개 중", "bg-emerald-500/20 text-emerald-300"];
}

export default function SubmissionsPanel({
  rows,
  missing,
  rosterCount,
  apiReady,
}: {
  rows: SubmissionRow[];
  missing: string[];
  rosterCount: number;
  apiReady: boolean;
}) {
  const router = useRouter();
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const queue = rows.filter((r) => r.needsAnalysis || r.status === "failed");
  const publishedCount = rows.filter((r) => r.published).length;

  async function analyzeOne(id: string): Promise<boolean> {
    setRuns((s) => ({ ...s, [id]: { phase: "running" } }));
    try {
      const res = await fetch("/api/admin/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const note = json.hasThumb ? "" : " · 썸네일 없음(플레이스홀더)";
      setRuns((s) => ({ ...s, [id]: { phase: "done", message: `완료${note}` } }));
      return true;
    } catch (err) {
      setRuns((s) => ({ ...s, [id]: { phase: "error", message: (err as Error).message } }));
      return false;
    }
  }

  async function runQueue(ids: string[]) {
    if (busy || ids.length === 0) return;
    setBusy(true);
    let done = 0;
    let failed = 0;
    const pendingIds = [...ids];
    setProgress(`0 / ${ids.length} 처리 중…`);
    const worker = async () => {
      while (pendingIds.length) {
        const id = pendingIds.shift()!;
        const ok = await analyzeOne(id);
        done++;
        if (!ok) failed++;
        setProgress(`${done} / ${ids.length} 처리 중…`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
    setProgress(`완료: ${ids.length - failed}건 성공${failed ? ` · ${failed}건 실패` : ""}`);
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-white">작품 등록 · AI 분석</h3>
        <span className="text-xs text-white/50">
          등록 {rows.length}/{rosterCount} · 공개 {publishedCount} · 분석 대기 {queue.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-white/50">
        참가자가 갤러리의 「작품 등록」으로 올린 작품입니다. 처음 등록한 작품은 AI가 자동으로
        분석해 바로 공개합니다. 참가자가 수정한 작품과 분석에 실패한 작품만 「분석 실행」으로 다시
        반영하세요 (1건당 약 30초~1분, 진행 중 창을 닫지 마세요). 썸네일을 눌러 관리자가 직접 교체할 수 있습니다.
      </p>
      {!apiReady && (
        <p className="mt-2 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
          ANTHROPIC_API_KEY 가 설정되지 않아 AI 대신 규칙 기반 임시 요약이 들어갑니다.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || queue.length === 0}
          onClick={() => runQueue(queue.map((r) => r.id))}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {queue.length > 0 ? `대기 ${queue.length}건 분석 실행` : "분석할 작품 없음"}
        </button>
        {progress && <span className="text-xs font-semibold text-white/70">{progress}</span>}
      </div>

      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
          {rows.map((r) => {
            const run = runs[r.id];
            const [label, tone] = chip(r, run);
            return (
              <li key={r.id} className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="w-24 shrink-0" title="클릭하거나 이미지를 끌어다 놓아 썸네일 교체">
                    <ThumbnailUploader
                      key={r.thumbUrl ?? "none"}
                      compact
                      recordId={r.id}
                      currentUrl={r.thumbUrl}
                      disabled={busy}
                      onUploaded={async (path) => {
                        const res = await setThumbnailAction(r.id, path);
                        if (!res.ok) throw new Error(res.error);
                        router.refresh();
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {r.title}
                      <span className="ml-2 text-xs font-normal text-white/40">{r.authorName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${tone}`}>{label}</span>
                      {r.mock && r.published && <span className="text-amber-300/80">임시 요약</span>}
                      <a href={r.liveUrl} target="_blank" rel="noopener noreferrer" className="truncate text-white/40 hover:text-gold">
                        {r.liveUrl}
                      </a>
                    </div>
                    {(run?.message || (r.status === "failed" && r.error)) && (
                      <div className={`mt-1 text-xs ${run?.phase === "done" ? "text-emerald-300/80" : "text-red-300/80"}`}>
                        {run?.message ?? r.error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runQueue([r.id])}
                    className="rounded px-2 py-1 text-xs font-semibold text-gold hover:bg-gold/10 disabled:opacity-40"
                  >
                    {r.published ? "재분석" : "분석"}
                  </button>
                  {r.thumbUrl && (
                    <form
                      action={removeThumbnailAction}
                      onSubmit={(e) => {
                        if (!confirm(`「${r.title}」의 썸네일을 내릴까요? 카드에는 첫 글자 플레이스홀더가 표시됩니다.`)) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <button disabled={busy} className="rounded px-2 py-1 text-xs text-white/60 hover:bg-white/10 disabled:opacity-40">
                        썸네일 내리기
                      </button>
                    </form>
                  )}
                  <form
                    action={deleteProjectAction}
                    onSubmit={(e) => {
                      if (!confirm(`「${r.title}」(${r.authorName}) 작품을 삭제할까요? 되돌릴 수 없습니다.`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <button disabled={busy} className="rounded px-2 py-1 text-xs text-white/40 hover:text-red-400 disabled:opacity-40">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {missing.length > 0 && (
        <p className="mt-2 text-xs text-white/40">
          미등록 ({missing.length}): {missing.join(", ")}
        </p>
      )}
    </div>
  );
}
