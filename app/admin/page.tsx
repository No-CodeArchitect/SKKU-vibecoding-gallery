import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminEmail, isAdmin } from "@/lib/admin-session";
import { listManagedAdmins, ownerEmails } from "@/lib/admin-allowlist";
import { ssoEnabled } from "@/lib/google-oauth";
import {
  addAdminAction,
  removeAdminAction,
  adminLogout,
  createCohortAction,
  toggleScoringOpen,
  toggleRankRevealed,
  setMemberStatusAction,
  approveAllAction,
  deleteMemberAction,
  setMinRatersAction,
  moderateComment,
  addJudgeAction,
  removeJudgeAction,
  startCeremonyAction,
} from "@/lib/admin-actions";
import { listCohorts } from "@/lib/cohorts-store";
import { listMemberships } from "@/lib/memberships-store";
import { getProjects, listRecords } from "@/lib/projects-data";
import { hasApiKey } from "@/lib/pipeline/ai";
import SubmissionsPanel, { type SubmissionRow } from "@/components/SubmissionsPanel";
import { listEduRequests, type EduRequestStatus } from "@/lib/edu-requests-store";
import { setEduRequestStatusAction, deleteEduRequestAction } from "@/lib/edu-request-actions";
import { rankProjects } from "@/lib/ranking";
import { distinctRaterCountFor } from "@/lib/scores-store";
import { listAllComments } from "@/lib/comments-store";
import { listJudges } from "@/lib/judges-store";
import { allJudgeScoreRows } from "@/lib/judge-scores-store";
import { getWeights } from "@/lib/weights-store";
import WeightsForm from "@/components/WeightsForm";
import { listMedia } from "@/lib/media-items";
import MediaManager from "@/components/MediaManager";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  if (!(await isAdmin())) redirect("/admin/login");

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = host ? `${proto}://${host}` : "";

  const aboutItems = await listMedia("about");
  const sketchItems = await listMedia("sketch");

  const me = await getAdminEmail();
  const owners = ownerEmails();
  const managedAdmins = await listManagedAdmins();
  const sso = ssoEnabled();

  const eduRequests = await listEduRequests();
  const newRequests = eduRequests.filter((r) => r.status === "new").length;
  const apiReady = hasApiKey();

  const WEIGHTS = await getWeights();
  const judges = await listJudges();
  const judgeRows = await allJudgeScoreRows();
  const judgeName = new Map(judges.map((j) => [j.email, j.name]));

  const cohorts = await listCohorts();
  const sections = await Promise.all(
    cohorts.map(async (c) => {
      const memberships = await listMemberships(c.id);
      const students = memberships.filter((m) => m.status === "approved");
      const pendingMembers = memberships.filter((m) => m.status === "pending");
      const rejectedMembers = memberships.filter((m) => m.status === "rejected");
      // 같은 실명으로 가입한 다른 계정 (부계정 의심) — 동명이인일 수 있어 경고만 한다
      const normName = (n: string) => n.replace(/\s+/g, "");
      const sameName = (m: (typeof memberships)[number]) =>
        memberships.filter(
          (o) => o.id !== m.id && o.status !== "rejected" && normName(o.realName) === normName(m.realName)
        );
      // 관리자 화면에서는 닉네임 옆에 실명을 함께 보여 준다
      const realNameOf = new Map(memberships.map((m) => [m.id, m.realName]));
      const who = (id: string, nick: string) =>
        realNameOf.has(id) ? `${nick} (${realNameOf.get(id)})` : nick;
      const projects = await getProjects(c.id);
      const records = await listRecords(c.id);
      const submitted = new Set(records.map((r) => r.authorId));
      const missing = students.filter((s) => !submitted.has(s.id)).map((s) => who(s.id, s.nickname));
      const rows: SubmissionRow[] = records.map((r) => ({
        id: r.id,
        title: r.submission.title,
        authorName: who(r.authorId, r.authorName),
        liveUrl: r.submission.liveUrl,
        status: r.status,
        needsAnalysis: r.needsAnalysis,
        published: !!r.ai,
        mock: !!r.ai?.mock,
        thumbUrl: r.thumbUrl,
        error: r.error,
        updatedAt: r.updatedAt,
      }));
      const pids = new Set(projects.map((p) => p.id));
      const ranked = (await rankProjects(projects, c.minRaters))
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
        .map((p) => ({ ...p, authorName: who(p.authorId, p.authorName) }));
      const raters = await distinctRaterCountFor(pids);
      const comments = await listAllComments(pids);
      // 심사위원별 채점 진행 (이 섹션 작품 중 몇 개를 채점했나) + 코멘트
      const sectionJudgeRows = judgeRows.filter((r) => pids.has(r.projectId));
      const judgeProgress = judges.map((j) => ({
        ...j,
        done: sectionJudgeRows.filter((r) => r.judgeEmail === j.email).length,
      }));
      const judgeComments = sectionJudgeRows.filter((r) => r.comment);
      const titleOf = new Map(projects.map((p) => [p.id, p.title]));
      return { c, students, pendingMembers, rejectedMembers, sameName, projects, ranked, raters, comments, rows, missing, judgeProgress, judgeComments, titleOf };
    })
  );

  return (
    <main className="min-h-screen bg-night text-white">
      <header className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5 sm:px-6">
          <span className="rounded-md bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">
            관리자 콘솔
          </span>
          <div className="flex items-center gap-3">
            {me && (
              <span data-testid="admin-me" className="hidden text-xs text-white/50 sm:inline">
                {me}
              </span>
            )}
            <Link href="/" className="text-sm font-semibold text-white/50 hover:text-brand">
              홈
            </Link>
            <form action={adminLogout}>
              <button className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        {/* 관리자 계정 (구글 이메일 허용 목록) */}
        <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-white">관리자 계정</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                sso ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {sso ? "구글 로그인 사용 중" : "구글 로그인 미설정 (임시 비밀번호 로그인)"}
            </span>
          </div>
          <p className="mb-4 mt-1 text-xs text-white/50">
            여기에 등록한 구글 계정만 관리자로 로그인할 수 있습니다. 도메인은 제한하지
            않으며, 어떤 구글 계정이든 이메일을 등록하면 됩니다.
          </p>

          <ul className="divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
            {owners.map((e) => (
              <li key={e} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 text-white">{e}</span>
                <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">
                  소유자 (환경변수)
                </span>
              </li>
            ))}
            {managedAdmins.map((a) => (
              <li key={a.email} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 text-white">{a.email}</span>
                {a.email === me ? (
                  <span className="text-xs text-white/40">현재 로그인</span>
                ) : (
                  <form action={removeAdminAction}>
                    <input type="hidden" name="email" value={a.email} />
                    <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">
                      삭제
                    </button>
                  </form>
                )}
              </li>
            ))}
            {owners.length === 0 && managedAdmins.length === 0 && (
              <li className="px-3 py-3 text-xs text-white/40">
                등록된 관리자가 없습니다. 환경변수 ADMIN_EMAILS에 첫 관리자 이메일을
                설정하세요.
              </li>
            )}
          </ul>

          <form action={addAdminAction} className="mt-3 flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="추가할 관리자 구글 이메일 (예: name@gmail.com)"
              className="flex-1 rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-night transition hover:bg-brand-soft">
              관리자 추가
            </button>
          </form>
        </section>

        {/* 종합 점수 배점 */}
        <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <h2 className="text-sm font-bold text-white">종합 점수 배점</h2>
          <p className="mb-4 mt-1 text-xs text-white/50">
            동료평가·심사위원·AI 평가를 몇 점씩 반영할지 정합니다 (합계 100). 모든 섹션의 순위
            미리보기·결과 발표·갤러리 순위에 바로 반영되며, 이미 받은 점수는 그대로 다시 계산됩니다.
          </p>
          <WeightsForm current={WEIGHTS} />
        </section>

        {/* 심사위원 (구글 이메일 등록) */}
        <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-white">심사위원</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">
              {judges.length}명
            </span>
            <Link href="/judge" className="ml-auto text-xs font-semibold text-brand hover:underline">
              심사 페이지 →
            </Link>
          </div>
          <p className="mb-4 mt-1 text-xs text-white/50">
            심사위원의 구글 이메일을 등록하면 그 계정으로{" "}
            <span className="font-mono text-brand">{origin}/judge</span> 에 로그인해 모든 섹션 작품을
            1~10점으로 채점합니다. 심사위원 점수는 종합 점수의 {WEIGHTS.judge}%입니다.
          </p>

          {judges.length > 0 && (
            <ul className="divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
              {judges.map((j) => (
                <li key={j.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="font-semibold text-white">{j.name}</span>
                  <span className="flex-1 text-xs text-white/50">{j.email}</span>
                  <form action={removeJudgeAction}>
                    <input type="hidden" name="email" value={j.email} />
                    <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">
                      삭제
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form action={addJudgeAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              name="name"
              required
              maxLength={30}
              placeholder="이름 (예: 김교수)"
              className="rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-40"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="심사위원 구글 이메일"
              className="flex-1 rounded-lg border border-white/15 bg-coal-soft px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-night transition hover:bg-brand-soft">
              심사위원 등록
            </button>
          </form>
        </section>

        {/* 교육·해커톤 문의 */}
        <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-white">교육·해커톤 문의</h2>
            {newRequests > 0 && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-black text-night">
                신규 {newRequests}
              </span>
            )}
            <Link href="/apply" className="ml-auto text-xs font-semibold text-brand hover:underline">
              신청 페이지 →
            </Link>
          </div>
          <p className="mb-3 mt-1 text-xs text-white/50">
            홈·갤러리 배너의 「문의하기」로 들어온 문의입니다. 연락처 등 개인정보가 있으니
            상담이 끝나면 삭제하세요.
          </p>
          {eduRequests.length === 0 ? (
            <p className="rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">
              아직 접수된 문의가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {eduRequests.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    r.status === "new" ? "border-brand/40 bg-brand/5" : "border-white/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">{r.unit}</span>
                    <span className="text-white/60">{r.contactName}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${EDU_STATUS[r.status].tone}`}>
                      {EDU_STATUS[r.status].label}
                    </span>
                    <span className="ml-auto text-xs text-white/40">
                      {new Date(r.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                    <span>☎ {r.phone}</span>
                    {r.email && <span>✉ {r.email}</span>}
                    {r.headcount && <span>인원 {r.headcount}</span>}
                    {r.period && <span>시기 {r.period}</span>}
                  </div>
                  {r.message && (
                    <p className="mt-2 whitespace-pre-line rounded bg-night px-3 py-2 text-xs leading-relaxed text-white/70">
                      {r.message}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(Object.keys(EDU_STATUS) as EduRequestStatus[])
                      .filter((st) => st !== r.status)
                      .map((st) => (
                        <form key={st} action={setEduRequestStatusAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={st} />
                          <button className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/70 hover:bg-white/20">
                            → {EDU_STATUS[st].label}
                          </button>
                        </form>
                      ))}
                    <form action={deleteEduRequestAction} className="ml-auto">
                      <input type="hidden" name="id" value={r.id} />
                      <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">
                        삭제
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 사이트 미디어 (홈 영상) — 드래그&드롭 */}
        <MediaManager
          slot="about"
          title="홈 · 해커톤 소개 대표 영상"
          description="홈 화면 해커톤 소개 옆에 표시되는 영상입니다. 새로 올리면 기존 영상을 대체합니다."
          items={aboutItems}
          fallbackNote="지정한 영상이 없어 홈에는 영상 자리만 표시됩니다."
        />
        <MediaManager
          slot="sketch"
          title="홈 · 미디어 · 해커톤 현장 스케치"
          description="홈의 '해커톤 현장 스케치'(최신 2개)와 미디어 페이지(전체)에 표시됩니다. 최신순으로 정렬됩니다."
          items={sketchItems}
        />

        {/* 새 섹션 추가 */}
        <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <h2 className="mb-1 text-sm font-bold text-white">새 섹션(기수) 추가</h2>
          <p className="mb-4 text-xs text-white/50">
            과정/기수별로 완전히 분리됩니다. 각 섹션은 고유 링크로 입장합니다.
          </p>
          <form action={createCohortAction} className="flex flex-col gap-3 sm:flex-row">
            <input
              name="name"
              required
              placeholder="섹션 이름 (예: 2026 가을 해커톤)"
              className="flex-1 rounded-lg border border-white/15 bg-coal-soft px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <input
              name="slug"
              placeholder="링크 주소 (선택, 예: 2026-fall)"
              className="w-full rounded-lg border border-white/15 bg-coal-soft px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand focus:ring-2 focus:ring-brand/20 sm:w-56"
            />
            <button className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-night transition hover:bg-brand-soft">
              섹션 추가
            </button>
          </form>
        </section>

        {/* 섹션별 관리 */}
        {sections.map(({ c, students, pendingMembers, rejectedMembers, sameName, projects, ranked, raters, comments, rows, missing, judgeProgress, judgeComments, titleOf }) => (
          <section key={c.id} className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
            {/* 헤더 + 링크 */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-white">{c.name}</h2>
              {c.rankRevealed ? (
                <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand">
                  순위 공개
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">
                  {c.scoringOpen ? "채점 중" : "채점 마감"}
                </span>
              )}
              <Link
                href={`/g/${c.slug}`}
                className="ml-auto text-xs font-semibold text-brand hover:underline"
              >
                갤러리 열기 →
              </Link>
            </div>
            <div className="mt-2 rounded-lg bg-night px-3 py-2 text-xs text-white/60 ring-1 ring-white/10">
              참가자 배부 링크:{" "}
              <span className="font-mono text-brand">{origin}/g/{c.slug}</span>
            </div>

            {/* 운영 토글 */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <div className="text-sm">
                  <div className="font-bold text-white">채점</div>
                  <div className="text-xs text-white/50">
                    {c.scoringOpen ? "진행 중" : "마감됨"}
                  </div>
                </div>
                <form action={toggleScoringOpen}>
                  <input type="hidden" name="cohortId" value={c.id} />
                  <input type="hidden" name="value" value={(!c.scoringOpen).toString()} />
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      c.scoringOpen
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-brand text-night hover:bg-brand-soft"
                    }`}
                  >
                    {c.scoringOpen ? "채점 마감" : "채점 열기"}
                  </button>
                </form>
              </div>
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                <div className="text-sm">
                  <div className="font-bold text-white">순위</div>
                  <div className="text-xs text-white/50">
                    {c.rankRevealed ? "공개됨" : "비공개"}
                  </div>
                </div>
                <form action={toggleRankRevealed}>
                  <input type="hidden" name="cohortId" value={c.id} />
                  <input type="hidden" name="value" value={(!c.rankRevealed).toString()} />
                  <button
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      c.rankRevealed
                        ? "bg-white/15 text-white hover:bg-white/25"
                        : "bg-ink text-white hover:bg-ink-soft"
                    }`}
                  >
                    {c.rankRevealed ? "순위 숨기기" : "🏆 순위 공개"}
                  </button>
                </form>
              </div>
            </div>

            {/* 결과 발표 (관리자 전용) */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3">
              <div className="text-sm">
                <div className="font-bold text-brand">🏆 결과 발표</div>
                <div className="text-xs text-white/50">
                  동료평가 {WEIGHTS.peer} + 심사위원 {WEIGHTS.judge} + AI {WEIGHTS.ai} 자동 합산 →
                  3위·2위·1위 순서로 발표합니다. 누르면 동료평가가 마감됩니다.
                </div>
              </div>
              <form action={startCeremonyAction}>
                <input type="hidden" name="cohortId" value={c.id} />
                <button className="rounded-lg bg-brand px-4 py-2 text-sm font-black text-night shadow-[0_0_20px_rgba(141,198,63,0.35)] transition hover:bg-brand-soft">
                  점수 합산 · 결과 발표
                </button>
              </form>
            </div>

            {/* 현황 */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="참가자" value={`${students.length}명`} />
              <Stat label="동료평가 참여" value={`${raters}/${students.length}`} />
              <Stat label="프로젝트" value={`${projects.length}개`} />
              <Stat
                label="심사 완료 심사위원"
                value={`${judgeProgress.filter((j) => projects.length > 0 && j.done >= projects.length).length}/${judgeProgress.length}`}
              />
            </div>

            {/* 심사위원 진행 */}
            {judgeProgress.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {judgeProgress.map((j) => (
                  <span
                    key={j.email}
                    className={`rounded-full px-2.5 py-1 ring-1 ${
                      projects.length > 0 && j.done >= projects.length
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                        : "bg-white/5 text-white/60 ring-white/10"
                    }`}
                  >
                    {j.name} {j.done}/{projects.length}
                  </span>
                ))}
              </div>
            )}

            {/* 가입 신청 · 참가자 */}
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white">가입 신청 · 참가자</h3>
                {pendingMembers.length > 0 && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-black text-night">
                    대기 {pendingMembers.length}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-white/50">
                참가자는 배부 링크에서 구글 계정으로 로그인해 실명·닉네임으로 가입을 신청합니다.
                실명을 명단과 대조해 수락하세요. 사이트에는 닉네임만 표시됩니다.
              </p>

              {pendingMembers.length > 0 && (
                <div className="mt-3 rounded-xl border border-brand/40 bg-brand/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-brand">수락 대기</span>
                    <form action={approveAllAction}>
                      <input type="hidden" name="cohortId" value={c.id} />
                      <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-night hover:bg-brand-soft">
                        대기 {pendingMembers.length}명 전체 수락
                      </button>
                    </form>
                  </div>
                  <ul className="divide-y divide-white/10">
                    {pendingMembers.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                        <span className="font-bold text-white">{m.realName}</span>
                        <span className="text-white/60">닉네임 {m.nickname}</span>
                        <span className="text-xs text-white/40">{m.email}</span>
                        <SameNameWarning others={sameName(m)} />
                        <span className="ml-auto flex gap-1">
                          <MemberButton id={m.id} status="approved" label="수락" primary />
                          <MemberButton id={m.id} status="rejected" label="거절" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {students.length > 0 ? (
                <ul className="mt-3 divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
                  {students.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                      <span className="font-semibold text-white">{m.nickname}</span>
                      <span className="text-white/60">{m.realName}</span>
                      <span className="text-xs text-white/40">{m.email}</span>
                      <SameNameWarning others={sameName(m)} />
                      <span className="ml-auto">
                        <MemberButton id={m.id} status="rejected" label="수락 취소" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                pendingMembers.length === 0 && (
                  <p className="mt-3 rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">
                    아직 가입한 참가자가 없습니다. 위의 배부 링크를 참가자에게 나눠 주세요.
                  </p>
                )
              )}

              {rejectedMembers.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-white/40 hover:text-brand">
                    거절·취소된 신청 {rejectedMembers.length}건
                  </summary>
                  <ul className="mt-2 divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
                    {rejectedMembers.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                        <span className="text-white/70">{m.realName}</span>
                        <span className="text-white/40">닉네임 {m.nickname}</span>
                        <span className="text-xs text-white/30">{m.email}</span>
                        <span className="ml-auto flex gap-1">
                          <MemberButton id={m.id} status="approved" label="수락" />
                          <form action={deleteMemberAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">
                              기록 삭제
                            </button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {/* 작품 등록 · AI 분석 */}
            <div className="mt-5">
              <SubmissionsPanel
                rows={rows}
                missing={missing}
                rosterCount={students.length}
                apiReady={apiReady}
              />
            </div>

            {/* 순위 미리보기 */}
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white">순위 미리보기 (관리자 전용)</h3>
                <a
                  href={`/api/admin/scores-csv?cohortId=${encodeURIComponent(c.id)}&type=final`}
                  className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/20"
                >
                  최종 점수 CSV
                </a>
                <a
                  href={`/api/admin/scores-csv?cohortId=${encodeURIComponent(c.id)}`}
                  className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white/70 hover:bg-white/20"
                >
                  평가 기록 CSV
                </a>
                <form action={setMinRatersAction} className="ml-auto flex items-center gap-2 text-xs text-white/60">
                  <input type="hidden" name="cohortId" value={c.id} />
                  최소 채점 인원
                  <input
                    name="minRaters"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={c.minRaters}
                    className="w-14 rounded border border-white/15 bg-coal-soft px-2 py-1 text-white outline-none focus:border-brand"
                  />
                  명
                  <button className="rounded bg-white/10 px-2 py-1 font-semibold text-white/80 hover:bg-white/20">
                    저장
                  </button>
                </form>
              </div>
              <p className="mb-2 text-xs text-white/40">
                동료평가 인원이 {c.minRaters}명 미만인 작품은 순위에서 빠지고 「채점 부족」으로 표시됩니다.
                평가가 없는 항목은 0점으로 계산합니다. 작품명을 누르면 평가자별 점수와 누적 기록을 볼 수 있습니다.
              </p>
            {ranked.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-white/40">
                      <th className="w-8 py-1 text-center font-semibold">#</th>
                      <th className="py-1 font-semibold">작품</th>
                      <th className="py-1 text-right font-semibold">동료 /{WEIGHTS.peer}</th>
                      <th className="py-1 text-right font-semibold">심사 /{WEIGHTS.judge}</th>
                      <th className="py-1 text-right font-semibold">AI /{WEIGHTS.ai}</th>
                      <th className="py-1 text-right font-semibold">종합</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {ranked.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 text-center font-black text-brand">{p.rank ?? "-"}</td>
                        <td className="py-2 text-white">
                          <Link href={`/admin/scores/${p.id}`} className="hover:text-brand hover:underline">
                            {p.title}
                          </Link>
                          <span className="ml-2 text-xs text-white/40">{p.authorName}</span>
                        </td>
                        <td className="py-2 text-right text-white/70">
                          {p.breakdown?.peerPoints.toFixed(1)}
                          <span
                            className={`ml-1 text-xs ${
                              p.raterCount < c.minRaters ? "text-amber-300/80" : "text-white/40"
                            }`}
                          >
                            ({p.raterCount}명{p.raterCount < c.minRaters ? " · 부족" : ""})
                          </span>
                        </td>
                        <td className="py-2 text-right text-white/70">
                          {p.breakdown?.judgePoints.toFixed(1)}
                          <span className="ml-1 text-xs text-white/40">({p.breakdown?.judgeCount ?? 0}명)</span>
                        </td>
                        <td className="py-2 text-right text-white/70">{p.breakdown?.aiPoints.toFixed(1)}</td>
                        <td className="py-2 text-right font-bold text-brand">
                          {p.totalScore !== null ? p.totalScore.toFixed(1) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {judgeComments.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-white/50 hover:text-brand">
                  심사위원 코멘트 {judgeComments.length}건
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {judgeComments.map((r) => (
                    <li key={`${r.projectId}-${r.judgeEmail}`} className="rounded-lg border border-white/10 px-3 py-2 text-sm">
                      <div className="text-xs text-white/40">
                        <span className="font-semibold text-white/70">{titleOf.get(r.projectId)}</span> ·{" "}
                        {judgeName.get(r.judgeEmail) ?? r.judgeEmail} · 완성도 {r.completeness} · 창의성 {r.creativity}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-white/80">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            </div>

            {/* 댓글 모더레이션 */}
            {comments.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-bold text-white">
                  댓글 모더레이션 ({comments.length})
                </h3>
                <ul className="flex flex-col gap-2">
                  {comments.map((cm) => (
                    <li
                      key={cm.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        cm.isHidden ? "border-red-500/30 bg-red-500/10" : "border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/40">
                          <span className="font-semibold text-white/70">
                            {cm.aiNickname}
                          </span>{" "}
                          · 실명 {cm.authorName}
                          {cm.isAuthorReply && " · 제작자"}
                          {cm.isHidden && " · (숨김)"}
                        </span>
                        <form action={moderateComment}>
                          <input type="hidden" name="id" value={cm.id} />
                          <input
                            type="hidden"
                            name="hidden"
                            value={(!cm.isHidden).toString()}
                          />
                          <button
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              cm.isHidden
                                ? "bg-brand text-night hover:bg-brand-soft"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                          >
                            {cm.isHidden ? "복구" : "숨기기"}
                          </button>
                        </form>
                      </div>
                      <p className="mt-1 text-white/80">{cm.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

const EDU_STATUS: Record<EduRequestStatus, { label: string; tone: string }> = {
  new: { label: "신규", tone: "bg-brand/20 text-brand" },
  contacted: { label: "연락함", tone: "bg-sky-500/20 text-sky-300" },
  done: { label: "완료", tone: "bg-white/10 text-white/60" },
};

function SameNameWarning({ others }: { others: { email: string; nickname: string }[] }) {
  if (others.length === 0) return null;
  return (
    <span
      className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300"
      title="같은 사람이 계정 두 개로 가입하면 서로 채점할 수 있습니다. 동명이인인지 확인하세요."
    >
      ⚠ 같은 실명: {others.map((o) => `${o.nickname}(${o.email})`).join(", ")}
    </span>
  );
}

function MemberButton({
  id,
  status,
  label,
  primary,
}: {
  id: string;
  status: "approved" | "rejected";
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={setMemberStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        className={`rounded px-2 py-0.5 text-xs font-semibold ${
          primary
            ? "bg-brand text-night hover:bg-brand-soft"
            : "bg-white/10 text-white/70 hover:bg-white/20"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-coal-soft px-3 py-2 ring-1 ring-white/10">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-base font-bold text-white">{value}</div>
    </div>
  );
}
