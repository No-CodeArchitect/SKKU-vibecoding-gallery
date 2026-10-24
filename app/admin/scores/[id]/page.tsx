import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { getProjectById, getProjects } from "@/lib/projects-data";
import { getCohortById } from "@/lib/cohorts-store";
import { listMemberships } from "@/lib/memberships-store";
import { allScoreRows } from "@/lib/scores-store";
import { allJudgeScoreRows } from "@/lib/judge-scores-store";
import { listJudges } from "@/lib/judges-store";
import { listScoreHistory } from "@/lib/score-history-store";
import { rankProjects } from "@/lib/ranking";
import { getWeights } from "@/lib/weights-store";
import { AI_SCORE_MAX, SCORE_MAX } from "@/lib/scoring";

export const dynamic = "force-dynamic";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });

// 관리자 전용: 작품별 평가 기록 (현재 점수 + 누적 변경 이력)
export default async function ProjectScoresPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const cohort = await getCohortById(project.cohortId);

  const [memberships, peerRows, judgeRows, judges, history, weights, ranked] = await Promise.all([
    listMemberships(project.cohortId),
    allScoreRows(),
    allJudgeScoreRows(),
    listJudges(),
    listScoreHistory({ projectId: id }),
    getWeights(),
    getProjects(project.cohortId).then((ps) => rankProjects(ps, cohort?.minRaters)),
  ]);
  const me = ranked.find((p) => p.id === id);
  const b = me?.breakdown;
  const nameOf = new Map(memberships.map((m) => [m.id, `${m.nickname} (${m.realName})`]));
  const judgeName = new Map(judges.map((j) => [j.email, j.name]));
  const peers = peerRows.filter((r) => r.projectId === id);
  const judgeScores = judgeRows.filter((r) => r.projectId === id);

  // 같은 평가자의 두 번째 이후 기록은 「수정」 표시 (history 는 최신순)
  const seen = new Map<string, number>();
  for (const h of history) seen.set(`${h.raterType}:${h.raterId}`, (seen.get(`${h.raterType}:${h.raterId}`) ?? 0) + 1);
  const remaining = new Map(seen);
  const historyRows = history.map((h) => {
    const k = `${h.raterType}:${h.raterId}`;
    const n = remaining.get(k)!;
    remaining.set(k, n - 1);
    return { ...h, isEdit: n > 1 };
  });

  return (
    <main className="min-h-screen bg-night text-white">
      <header className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div>
            <Link href="/admin" className="text-xs font-semibold text-white/40 hover:text-brand">
              ← 관리자 콘솔
            </Link>
            <h1 className="mt-1 text-xl font-black">{project.title}</h1>
            <p className="text-sm text-white/50">
              {nameOf.get(project.authorId) ?? project.authorName} · {cohort?.name}
            </p>
          </div>
          <a
            href={`/api/admin/scores-csv?projectId=${encodeURIComponent(id)}`}
            className="rounded-lg border border-brand/60 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-night"
          >
            평가 기록 CSV
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        {/* 종합 */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="순위" value={me?.rank ? `${me.rank}위` : "-"} />
          <Stat label="종합" value={me?.totalScore != null ? me.totalScore.toFixed(1) : "-"} accent />
          <Stat label={`동료 /${weights.peer}`} value={b ? `${b.peerPoints.toFixed(1)}` : "-"} sub={b?.peerAvg != null ? `평균 ${b.peerAvg.toFixed(2)}/${SCORE_MAX}` : ""} />
          <Stat label={`심사 /${weights.judge}`} value={b ? `${b.judgePoints.toFixed(1)}` : "-"} sub={b?.judgeAvg != null ? `평균 ${b.judgeAvg.toFixed(2)}/${SCORE_MAX}` : ""} />
          <Stat label={`AI /${weights.ai}`} value={b ? `${b.aiPoints.toFixed(1)}` : "-"} sub={b ? `평균 ${b.aiAvg.toFixed(1)}/${AI_SCORE_MAX}` : ""} />
        </section>

        {/* 현재 점수 */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ScoreTable
            title={`동료평가 (${peers.length}명)`}
            rows={peers.map((r) => ({
              key: r.studentId,
              who: nameOf.get(r.studentId) ?? r.studentId,
              c: r.completeness,
              k: r.creativity,
            }))}
          />
          <ScoreTable
            title={`심사위원 (${judgeScores.length}명)`}
            rows={judgeScores.map((r) => ({
              key: r.judgeEmail,
              who: judgeName.get(r.judgeEmail) ?? r.judgeEmail,
              c: r.completeness,
              k: r.creativity,
              note: r.comment,
            }))}
          />
        </section>

        {/* 누적 기록 */}
        <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <h2 className="text-sm font-bold">평가 기록 ({history.length}건)</h2>
          <p className="mt-1 text-xs text-white/50">
            채점을 제출하거나 수정할 때마다 쌓이는 전체 기록입니다 (최신순). 위 표는 각 평가자의 마지막 점수입니다.
          </p>
          {historyRows.length === 0 ? (
            <p className="mt-3 rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">아직 기록이 없습니다.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-white/40">
                    <th className="py-1 font-semibold">시각</th>
                    <th className="py-1 font-semibold">구분</th>
                    <th className="py-1 font-semibold">평가자</th>
                    <th className="py-1 text-right font-semibold">완성도</th>
                    <th className="py-1 text-right font-semibold">창의성</th>
                    <th className="py-1 pl-3 font-semibold">코멘트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {historyRows.map((h, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap py-2 text-xs text-white/50">{fmt(h.createdAt)}</td>
                      <td className="py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                            h.raterType === "judge" ? "bg-brand/20 text-brand" : "bg-white/10 text-white/70"
                          }`}
                        >
                          {h.raterType === "judge" ? "심사위원" : "동료"}
                        </span>
                        {h.isEdit && <span className="ml-1 text-xs text-amber-300/80">수정</span>}
                      </td>
                      <td className="py-2 text-white/80">{h.raterName}</td>
                      <td className="py-2 text-right font-bold">{h.completeness}</td>
                      <td className="py-2 text-right font-bold">{h.creativity}</td>
                      <td className="py-2 pl-3 text-xs text-white/60">{h.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ring-1 ${accent ? "bg-brand/10 ring-brand/30" : "bg-coal ring-white/10"}`}>
      <div className="text-xs text-white/50">{label}</div>
      <div className={`text-lg font-black ${accent ? "text-brand" : "text-white"}`}>{value}</div>
      {sub && <div className="text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}

function ScoreTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; who: string; c: number; k: number; note?: string }[];
}) {
  return (
    <div className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
      <h2 className="text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-white/40">아직 점수가 없습니다.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="py-2">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-white/80">{r.who}</span>
                <span className="text-xs text-white/50">
                  완성도 <b className="text-white">{r.c}</b> · 창의성 <b className="text-white">{r.k}</b>
                </span>
                <span className="w-10 text-right font-bold text-brand">{((r.c + r.k) / 2).toFixed(1)}</span>
              </div>
              {r.note && <p className="mt-1 text-xs text-white/50">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
