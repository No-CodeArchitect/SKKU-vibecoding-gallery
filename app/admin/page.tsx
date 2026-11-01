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
import { listCohorts, type Cohort } from "@/lib/cohorts-store";
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
import CohortInfoForm from "@/components/CohortInfoForm";
import { listMedia } from "@/lib/media-items";
import MediaManager from "@/components/MediaManager";
import {
  ADMIN_TABS,
  SECTION_VIEWS,
  adminHref,
  type AdminTab,
  type SectionView,
} from "@/lib/admin-nav";

export const dynamic = "force-dynamic";

// 관리자 콘솔: 왼쪽 메뉴에서 고른 기능 하나만 오른쪽에 보여 준다.
// 화면 상태는 URL(?tab=…&id=…&view=…)에 있어서, 버튼(서버 액션)을 눌러도 같은 화면에 머문다.
type Tab = AdminTab;
type View = SectionView;
const TABS = ADMIN_TABS;
const VIEWS = SECTION_VIEWS;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string; view?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = host ? `${proto}://${host}` : "";

  const me = await getAdminEmail();
  const cohorts = await listCohorts();
  // 메뉴 배지: 섹션별 가입 대기 수, 신규 문의 수
  const pendingByCohort = new Map(
    await Promise.all(
      cohorts.map(
        async (c) =>
          [c.id, (await listMemberships(c.id)).filter((m) => m.status === "pending").length] as const
      )
    )
  );
  const newRequests = (await listEduRequests()).filter((r) => r.status === "new").length;

  let tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : cohorts.length ? "section" : "new-section";
  const cohort = tab === "section" ? (cohorts.find((c) => c.id === sp.id) ?? cohorts[0]) : undefined;
  if (tab === "section" && !cohort) tab = "new-section";
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : "overview";

  const groups: NavGroup[] = [
    {
      title: "섹션 운영",
      items: [
        ...cohorts.map((c) => ({
          key: `section:${c.id}`,
          label: c.name,
          href: adminHref("section", c.id),
          badge: pendingByCohort.get(c.id) || undefined,
          sub: c.rankRevealed ? "순위 공개" : c.scoringOpen ? "채점 중" : "채점 마감",
        })),
        { key: "new-section", label: "+ 새 섹션 추가", href: adminHref("new-section") },
      ],
    },
    {
      title: "평가 설정",
      items: [
        { key: "weights", label: "종합 점수 배점", href: adminHref("weights") },
        { key: "judges", label: "심사위원", href: adminHref("judges") },
      ],
    },
    {
      title: "사이트",
      items: [
        { key: "inquiries", label: "교육·해커톤 문의", href: adminHref("inquiries"), badge: newRequests || undefined },
        { key: "media", label: "미디어 (영상·사진)", href: adminHref("media") },
      ],
    },
    {
      title: "계정",
      items: [{ key: "admins", label: "관리자 계정", href: adminHref("admins") }],
    },
  ];
  const activeKey = tab === "section" ? `section:${cohort!.id}` : tab;

  return (
    <main className="min-h-screen bg-night text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-night-soft/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
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

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 sm:px-6 md:py-8">
        {/* 왼쪽 메뉴 (데스크톱) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 flex flex-col gap-5">
            {groups.map((g) => (
              <div key={g.title}>
                <div className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-white/35">
                  {g.title}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((it) => (
                    <li key={it.key}>
                      <Link
                        href={it.href}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          it.key === activeKey
                            ? "bg-brand/15 font-bold text-brand"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{it.label}</span>
                          {it.sub && <span className="block text-[11px] font-normal text-white/40">{it.sub}</span>}
                        </span>
                        {it.badge && (
                          <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-black text-night">
                            {it.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* 모바일 메뉴 (가로 스크롤) */}
          <nav className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
            {groups.flatMap((g) => g.items).map((it) => (
              <Link
                key={it.key}
                href={it.href}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  it.key === activeKey
                    ? "bg-brand text-night"
                    : "bg-white/5 text-white/70 ring-1 ring-white/10"
                }`}
              >
                {it.label}
                {it.badge && (
                  <span className={`rounded-full px-1 text-[10px] font-black ${it.key === activeKey ? "bg-night text-brand" : "bg-brand text-night"}`}>
                    {it.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {tab === "section" && cohort && <SectionPanel cohort={cohort} view={view} origin={origin} />}
          {tab === "new-section" && <NewSectionPanel />}
          {tab === "weights" && <WeightsPanel />}
          {tab === "judges" && <JudgesPanel origin={origin} />}
          {tab === "inquiries" && <InquiriesPanel />}
          {tab === "media" && <MediaPanel />}
          {tab === "admins" && <AdminsPanel me={me} />}
        </div>
      </div>
    </main>
  );
}

interface NavGroup {
  title: string;
  items: { key: string; label: string; href: string; badge?: number; sub?: string }[];
}

function Panel({
  title,
  description,
  aside,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-black text-white">{title}</h2>
        {aside}
      </div>
      {description && <p className="mb-4 mt-1 text-xs text-white/50">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </section>
  );
}

// ---- 섹션 운영 ----
async function SectionPanel({ cohort: c, view, origin }: { cohort: Cohort; view: View; origin: string }) {
  const [memberships, projects, records, judges, judgeRows, WEIGHTS] = await Promise.all([
    listMemberships(c.id),
    getProjects(c.id),
    listRecords(c.id),
    listJudges(),
    allJudgeScoreRows(),
    getWeights(),
  ]);
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
  const who = (id: string, nick: string) => (realNameOf.has(id) ? `${nick} (${realNameOf.get(id)})` : nick);
  const pids = new Set(projects.map((p) => p.id));
  const comments = await listAllComments(pids);
  const sectionJudgeRows = judgeRows.filter((r) => pids.has(r.projectId));
  const judgeProgress = judges.map((j) => ({
    ...j,
    done: sectionJudgeRows.filter((r) => r.judgeEmail === j.email).length,
  }));

  const tabs: { view: View; label: string; badge?: number }[] = [
    { view: "overview", label: "운영 · 결과 발표" },
    { view: "members", label: "참가자", badge: pendingMembers.length || undefined },
    { view: "projects", label: "작품 · AI 분석" },
    { view: "ranking", label: "순위 · 점수" },
    { view: "comments", label: `댓글 ${comments.length}` },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 섹션 헤더 */}
      <div className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black text-white">{c.name}</h1>
          {c.rankRevealed ? (
            <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand">순위 공개</span>
          ) : (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">
              {c.scoringOpen ? "채점 중" : "채점 마감"}
            </span>
          )}
          <Link href={`/g/${c.slug}`} className="ml-auto text-xs font-semibold text-brand hover:underline">
            갤러리 열기 →
          </Link>
        </div>
        <div className="mt-2 break-all rounded-lg bg-night px-3 py-2 text-xs text-white/60 ring-1 ring-white/10">
          참가자 배부 링크: <span className="font-mono text-brand">{origin}/g/{c.slug}</span>
        </div>
        <div className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <Link
              key={t.view}
              href={adminHref("section", c.id, t.view)}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                t.view === view ? "bg-brand text-night" : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t.label}
              {t.badge && (
                <span className={`rounded-full px-1 text-[10px] font-black ${t.view === view ? "bg-night text-brand" : "bg-brand text-night"}`}>
                  {t.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {view === "overview" && (
        <Panel title="운영 · 결과 발표">
          {/* 운영 토글 */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <div className="text-sm">
                <div className="font-bold text-white">동료평가</div>
                <div className="text-xs text-white/50">{c.scoringOpen ? "진행 중" : "마감됨"}</div>
              </div>
              <form action={toggleScoringOpen}>
                <input type="hidden" name="cohortId" value={c.id} />
                <input type="hidden" name="value" value={(!c.scoringOpen).toString()} />
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    c.scoringOpen ? "bg-red-500 text-white hover:bg-red-600" : "bg-brand text-night hover:bg-brand-soft"
                  }`}
                >
                  {c.scoringOpen ? "채점 마감" : "채점 열기"}
                </button>
              </form>
            </div>
            <div className="flex flex-1 items-center justify-between rounded-xl border border-white/10 px-4 py-3">
              <div className="text-sm">
                <div className="font-bold text-white">순위</div>
                <div className="text-xs text-white/50">{c.rankRevealed ? "공개됨" : "비공개"}</div>
              </div>
              <form action={toggleRankRevealed}>
                <input type="hidden" name="cohortId" value={c.id} />
                <input type="hidden" name="value" value={(!c.rankRevealed).toString()} />
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    c.rankRevealed ? "bg-white/15 text-white hover:bg-white/25" : "bg-ink text-white hover:bg-ink-soft"
                  }`}
                >
                  {c.rankRevealed ? "순위 숨기기" : "🏆 순위 공개"}
                </button>
              </form>
            </div>
          </div>

          {/* 결과 발표 */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/5 px-4 py-3">
            <div className="text-sm">
              <div className="font-bold text-brand">🏆 결과 발표</div>
              <div className="text-xs text-white/50">
                동료평가 {WEIGHTS.peer} + 심사위원 {WEIGHTS.judge} + AI {WEIGHTS.ai} 자동 합산 → 3위·2위·1위
                순서로 발표합니다. 누르면 동료평가가 마감됩니다.
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
            <Stat label="동료평가 참여" value={`${await distinctRaterCountFor(pids)}/${students.length}`} />
            <Stat label="프로젝트" value={`${projects.length}개`} />
            <Stat
              label="심사 완료 심사위원"
              value={`${judgeProgress.filter((j) => projects.length > 0 && j.done >= projects.length).length}/${judgeProgress.length}`}
            />
          </div>
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
          {pendingMembers.length > 0 && (
            <Link
              href={adminHref("section", c.id, "members")}
              className="mt-4 block rounded-lg bg-brand/10 px-3 py-2 text-xs font-semibold text-brand ring-1 ring-brand/30 hover:bg-brand/15"
            >
              가입 수락 대기 {pendingMembers.length}명 → 참가자 탭에서 처리
            </Link>
          )}

          {/* 섹션 이름·링크 주소 */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <h3 className="mb-3 text-sm font-bold text-white">섹션 이름 · 링크 주소</h3>
            <CohortInfoForm cohortId={c.id} name={c.name} slug={c.slug} origin={origin} />
          </div>
        </Panel>
      )}

      {view === "members" && (
        <Panel
          title="가입 신청 · 참가자"
          aside={
            pendingMembers.length > 0 && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-black text-night">
                대기 {pendingMembers.length}
              </span>
            )
          }
          description="참가자는 배부 링크에서 구글 계정으로 로그인해 실명·닉네임으로 가입을 신청합니다. 실명을 명단과 대조해 수락하세요. 사이트에는 닉네임만 표시됩니다."
        >
          {pendingMembers.length > 0 && (
            <div className="mb-3 rounded-xl border border-brand/40 bg-brand/5 p-3">
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
            <ul className="divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
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
              <p className="rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">
                아직 가입한 참가자가 없습니다. 섹션의 배부 링크를 참가자에게 나눠 주세요.
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
        </Panel>
      )}

      {view === "projects" && (
        <div className="rounded-2xl bg-coal p-5 ring-1 ring-white/10">
          <SubmissionsPanel
            rows={records.map(
              (r): SubmissionRow => ({
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
              })
            )}
            missing={(() => {
              const submitted = new Set(records.map((r) => r.authorId));
              return students.filter((s) => !submitted.has(s.id)).map((s) => who(s.id, s.nickname));
            })()}
            rosterCount={students.length}
            apiReady={hasApiKey()}
          />
        </div>
      )}

      {view === "ranking" && (
        <RankingPanel
          cohort={c}
          projects={projects}
          who={who}
          weights={WEIGHTS}
          judgeComments={sectionJudgeRows.filter((r) => r.comment)}
          judgeName={new Map(judges.map((j) => [j.email, j.name]))}
        />
      )}

      {view === "comments" && (
        <Panel title={`댓글 모더레이션 (${comments.length})`}>
          {comments.length === 0 ? (
            <p className="rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">아직 댓글이 없습니다.</p>
          ) : (
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
                      <span className="font-semibold text-white/70">{cm.aiNickname}</span> · 실명 {cm.authorName}
                      {cm.isAuthorReply && " · 제작자"}
                      {cm.isHidden && " · (숨김)"}
                    </span>
                    <form action={moderateComment}>
                      <input type="hidden" name="id" value={cm.id} />
                      <input type="hidden" name="hidden" value={(!cm.isHidden).toString()} />
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
          )}
        </Panel>
      )}
    </div>
  );
}

async function RankingPanel({
  cohort: c,
  projects,
  who,
  weights: WEIGHTS,
  judgeComments,
  judgeName,
}: {
  cohort: Cohort;
  projects: Awaited<ReturnType<typeof getProjects>>;
  who: (id: string, nick: string) => string;
  weights: Awaited<ReturnType<typeof getWeights>>;
  judgeComments: Awaited<ReturnType<typeof allJudgeScoreRows>>;
  judgeName: Map<string, string>;
}) {
  const ranked = (await rankProjects(projects, c.minRaters))
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((p) => ({ ...p, authorName: who(p.authorId, p.authorName) }));
  const titleOf = new Map(projects.map((p) => [p.id, p.title]));

  return (
    <Panel
      title="순위 · 점수 (관리자 전용)"
      aside={
        <span className="ml-auto flex gap-1.5">
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
        </span>
      }
      description={
        <>
          동료평가 인원이 {c.minRaters}명 미만인 작품은 순위에서 빠지고 「채점 부족」으로 표시됩니다. 평가가 없는
          항목은 0점으로 계산합니다. 작품명을 누르면 평가자별 점수와 누적 기록을 볼 수 있습니다.
        </>
      }
    >
      <form action={setMinRatersAction} className="mb-3 flex items-center gap-2 text-xs text-white/60">
        <input type="hidden" name="cohortId" value={c.id} />
        순위에 들기 위한 최소 동료평가 인원
        <input
          name="minRaters"
          type="number"
          min={1}
          max={50}
          defaultValue={c.minRaters}
          className="w-14 rounded border border-white/15 bg-coal-soft px-2 py-1 text-white outline-none focus:border-brand"
        />
        명
        <button className="rounded bg-white/10 px-2 py-1 font-semibold text-white/80 hover:bg-white/20">저장</button>
      </form>

      {ranked.length === 0 ? (
        <p className="rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">아직 공개된 작품이 없습니다.</p>
      ) : (
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
                    <span className={`ml-1 text-xs ${p.raterCount < c.minRaters ? "text-amber-300/80" : "text-white/40"}`}>
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
    </Panel>
  );
}

// ---- 새 섹션 ----
function NewSectionPanel() {
  return (
    <Panel title="새 섹션(기수) 추가" description="과정/기수별로 완전히 분리됩니다. 각 섹션은 고유 링크로 입장합니다.">
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
    </Panel>
  );
}

// ---- 평가 설정 ----
async function WeightsPanel() {
  return (
    <Panel
      title="종합 점수 배점"
      description="동료평가·심사위원·AI 평가를 몇 점씩 반영할지 정합니다 (합계 100). 모든 섹션의 순위 미리보기·결과 발표·갤러리 순위에 바로 반영되며, 이미 받은 점수는 그대로 다시 계산됩니다."
    >
      <WeightsForm current={await getWeights()} />
    </Panel>
  );
}

async function JudgesPanel({ origin }: { origin: string }) {
  const [judges, WEIGHTS] = await Promise.all([listJudges(), getWeights()]);
  return (
    <Panel
      title="심사위원"
      aside={
        <>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60">{judges.length}명</span>
          <Link href="/judge" className="ml-auto text-xs font-semibold text-brand hover:underline">
            심사 페이지 →
          </Link>
        </>
      }
      description={
        <>
          심사위원의 구글 이메일을 등록하면 그 계정으로 <span className="font-mono text-brand">{origin}/judge</span> 에
          로그인해 모든 섹션 작품을 1~10점으로 채점합니다. 심사위원 점수는 종합 점수의 {WEIGHTS.judge}%입니다.
        </>
      }
    >
      {judges.length > 0 && (
        <ul className="divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
          {judges.map((j) => (
            <li key={j.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="font-semibold text-white">{j.name}</span>
              <span className="flex-1 text-xs text-white/50">{j.email}</span>
              <form action={removeJudgeAction}>
                <input type="hidden" name="email" value={j.email} />
                <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">삭제</button>
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
    </Panel>
  );
}

// ---- 사이트 ----
async function InquiriesPanel() {
  const eduRequests = await listEduRequests();
  const newRequests = eduRequests.filter((r) => r.status === "new").length;
  return (
    <Panel
      title="교육·해커톤 문의"
      aside={
        <>
          {newRequests > 0 && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-black text-night">신규 {newRequests}</span>
          )}
          <Link href="/apply" className="ml-auto text-xs font-semibold text-brand hover:underline">
            신청 페이지 →
          </Link>
        </>
      }
      description="홈·갤러리 배너의 「문의하기」로 들어온 문의입니다. 연락처 등 개인정보가 있으니 상담이 끝나면 삭제하세요."
    >
      {eduRequests.length === 0 ? (
        <p className="rounded-lg px-3 py-3 text-xs text-white/40 ring-1 ring-white/10">아직 접수된 문의가 없습니다.</p>
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
                  <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">삭제</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

async function MediaPanel() {
  const [aboutItems, sketchItems] = await Promise.all([listMedia("about"), listMedia("sketch")]);
  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}

// ---- 계정 ----
async function AdminsPanel({ me }: { me: string | null }) {
  const owners = ownerEmails();
  const managedAdmins = await listManagedAdmins();
  const sso = ssoEnabled();
  return (
    <Panel
      title="관리자 계정"
      aside={
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            sso ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {sso ? "구글 로그인 사용 중" : "구글 로그인 미설정 (임시 비밀번호 로그인)"}
        </span>
      }
      description="여기에 등록한 구글 계정만 관리자로 로그인할 수 있습니다. 도메인은 제한하지 않으며, 어떤 구글 계정이든 이메일을 등록하면 됩니다."
    >
      <ul className="divide-y divide-white/10 rounded-lg ring-1 ring-white/10">
        {owners.map((e) => (
          <li key={e} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex-1 text-white">{e}</span>
            <span className="rounded bg-brand/15 px-2 py-0.5 text-xs font-semibold text-brand">소유자 (환경변수)</span>
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
                <button className="rounded px-2 py-0.5 text-xs text-white/40 hover:text-red-400">삭제</button>
              </form>
            )}
          </li>
        ))}
        {owners.length === 0 && managedAdmins.length === 0 && (
          <li className="px-3 py-3 text-xs text-white/40">
            등록된 관리자가 없습니다. 환경변수 ADMIN_EMAILS에 첫 관리자 이메일을 설정하세요.
          </li>
        )}
      </ul>

      <form action={addAdminAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
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
    </Panel>
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
          primary ? "bg-brand text-night hover:bg-brand-soft" : "bg-white/10 text-white/70 hover:bg-white/20"
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
