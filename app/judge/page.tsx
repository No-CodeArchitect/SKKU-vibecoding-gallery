import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import JudgeScoreForm from "@/components/JudgeScoreForm";
import { getMember } from "@/lib/member-session";
import { getJudge } from "@/lib/judge-session";
import { judgeScoresBy } from "@/lib/judge-scores-store";
import { listCohorts } from "@/lib/cohorts-store";
import { getProjects } from "@/lib/projects-data";
import { logout } from "@/lib/auth-actions";
import { ssoEnabled } from "@/lib/google-oauth";
import { WEIGHTS } from "@/lib/scoring";

export const dynamic = "force-dynamic";

// 심사위원 전용 채점 화면. 관리자가 등록한 구글 이메일로 로그인하면 모든 섹션 작품을 채점한다.
export default async function JudgePage() {
  const member = await getMember();
  const judge = member ? await getJudge() : null;

  if (!judge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night px-4 text-white">
        <div className="w-full max-w-sm rounded-2xl bg-coal p-6 ring-1 ring-white/10">
          <span className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
            심사위원
          </span>
          <h1 className="mt-3 text-xl font-black">심사위원 로그인</h1>
          {!member ? (
            <>
              <p className="mt-2 text-sm text-white/50">
                운영진에 알려 주신 구글 계정으로 로그인하면 작품 심사 화면이 열립니다.
              </p>
              <div className="mt-5">
                {ssoEnabled() ? (
                  <GoogleButton next="/judge" label="Google 계정으로 로그인" />
                ) : (
                  <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
                    구글 로그인이 아직 설정되지 않았습니다. 관리자에게 문의하세요.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-white/60">
                <span className="font-semibold text-white">{member.email}</span> 은(는) 심사위원으로
                등록되지 않은 계정입니다. 운영진에 등록을 요청하거나 다른 계정으로 로그인해 주세요.
              </p>
              <form action={logout} className="mt-5">
                <input type="hidden" name="next" value="/judge" />
                <button className="w-full rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10">
                  로그아웃 후 다른 계정으로
                </button>
              </form>
            </>
          )}
          <Link href="/" className="mt-4 block text-center text-xs text-white/40 hover:text-gold">
            ← 홈으로
          </Link>
        </div>
      </main>
    );
  }

  const mine = await judgeScoresBy(judge.email);
  const cohorts = await listCohorts();
  const sections = (
    await Promise.all(cohorts.map(async (c) => ({ c, projects: await getProjects(c.id) })))
  ).filter((s) => s.projects.length > 0);

  return (
    <main className="min-h-screen bg-night text-white">
      <header className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div>
            <span className="rounded-md bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
              심사위원 평가
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{judge.name} 심사위원님</h1>
            <p className="mt-1 text-sm text-white/50">
              항목별 1~10점으로 채점해 주세요. 심사위원 점수는 종합 점수의 {WEIGHTS.judge}%를
              차지합니다 (동료평가 {WEIGHTS.peer}% · AI 평가 {WEIGHTS.ai}%).
            </p>
          </div>
          <form action={logout}>
            <input type="hidden" name="next" value="/judge" />
            <button className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
        {sections.length === 0 && (
          <p className="rounded-2xl bg-coal px-6 py-16 text-center text-sm text-white/40 ring-1 ring-white/10">
            아직 심사할 작품이 없습니다.
          </p>
        )}
        {sections.map(({ c, projects }) => {
          const done = projects.filter((p) => mine.has(p.id)).length;
          return (
            <section key={c.id}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-black">{c.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    done === projects.length
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-gold/15 text-gold"
                  }`}
                >
                  {done} / {projects.length} 채점
                </span>
                {c.rankRevealed && (
                  <span className="text-xs text-white/40">결과 발표 완료 · 심사 마감</span>
                )}
              </div>
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {projects.map((p) => {
                  const s = mine.get(p.id) ?? null;
                  return (
                    <li
                      key={p.id}
                      className={`flex flex-col gap-4 rounded-2xl bg-coal p-5 ring-1 ${
                        s ? "ring-emerald-500/30" : "ring-white/10"
                      }`}
                    >
                      <div className="flex gap-4">
                        {p.signatureImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.signatureImageUrl}
                            alt=""
                            className="aspect-[16/10] w-28 shrink-0 rounded-lg object-cover object-top"
                          />
                        ) : (
                          <div className="flex aspect-[16/10] w-28 shrink-0 items-center justify-center rounded-lg bg-white/5 text-2xl font-black text-white/25">
                            {p.title.trim().charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold leading-snug">{p.title}</h3>
                            {s && (
                              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                채점완료
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-sm text-white/50">{p.tagline}</p>
                          <div className="mt-2 flex gap-3 text-xs font-semibold">
                            <span className="text-white/60">{p.authorName}</span>
                            <a
                              href={p.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold hover:text-gold-soft"
                            >
                              사이트 열기 ↗
                            </a>
                            <Link href={`/project/${p.id}`} className="text-white/50 hover:text-gold">
                              상세 보기
                            </Link>
                          </div>
                        </div>
                      </div>
                      <JudgeScoreForm
                        projectId={p.id}
                        isOpen={!c.rankRevealed}
                        existing={
                          s ? { completeness: s.completeness, creativity: s.creativity, comment: s.comment } : null
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
