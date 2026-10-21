import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import GoogleButton from "@/components/GoogleButton";
import { getMember } from "@/lib/member-session";
import { listMembershipsOf, type MembershipStatus } from "@/lib/memberships-store";
import { listCohorts } from "@/lib/cohorts-store";
import { logout } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

const STATUS: Record<MembershipStatus, { label: string; tone: string }> = {
  approved: { label: "수락됨", tone: "bg-emerald-500/20 text-emerald-300" },
  pending: { label: "수락 대기", tone: "bg-amber-500/20 text-amber-300" },
  rejected: { label: "미수락", tone: "bg-white/10 text-white/50" },
};

function errorText(code?: string): string | null {
  if (code === "state") return "로그인 요청이 만료되었습니다. 다시 시도해 주세요.";
  if (code === "google") return "구글 로그인에 실패했습니다. 다시 시도해 주세요.";
  if (code === "sso_off") return "구글 로그인이 아직 설정되지 않았습니다.";
  return null;
}

// 내 계정: 구글 로그인 + 내가 가입한 섹션 / 가입할 수 있는 섹션
export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = errorText((await searchParams).error);
  const member = await getMember();
  const [memberships, cohorts] = member
    ? await Promise.all([listMembershipsOf(member.sub), listCohorts()])
    : [[], []];
  const byCohort = new Map(memberships.map((m) => [m.cohortId, m]));
  const others = cohorts.filter((c) => !byCohort.has(c.id));

  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight">내 계정</h1>
        {error && (
          <p className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {!member ? (
          <div className="mt-8 rounded-2xl bg-coal p-6 ring-1 ring-white/10">
            <p className="mb-5 text-sm leading-relaxed text-white/60">
              참가자는 구글 계정으로 로그인한 뒤, 참가할 섹션에 가입을 신청합니다. 운영진이
              수락하면 채점·댓글·작품 등록을 할 수 있습니다.
            </p>
            <GoogleButton next="/me" />
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-coal px-4 py-3 ring-1 ring-white/10">
              <div className="text-sm">
                <div className="font-semibold text-white">{member.name || member.email}</div>
                <div className="text-xs text-white/40">{member.email}</div>
              </div>
              <form action={logout}>
                <button className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10">
                  로그아웃
                </button>
              </form>
            </div>

            <h2 className="mt-10 text-sm font-bold text-white">내 섹션</h2>
            {memberships.length === 0 ? (
              <p className="mt-2 text-sm text-white/40">아직 가입한 섹션이 없습니다.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {memberships.map((m) => {
                  const c = cohorts.find((x) => x.id === m.cohortId);
                  if (!c) return null;
                  return (
                    <li key={m.id}>
                      <Link
                        href={m.status === "approved" ? `/g/${c.slug}` : `/g/${c.slug}/join`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-coal px-4 py-3 ring-1 ring-white/10 transition hover:ring-gold/40"
                      >
                        <div>
                          <div className="font-bold text-white">{c.name}</div>
                          <div className="text-xs text-white/40">닉네임 {m.nickname}</div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[m.status].tone}`}>
                          {STATUS[m.status].label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {others.length > 0 && (
              <>
                <h2 className="mt-10 text-sm font-bold text-white">다른 섹션 가입 신청</h2>
                <p className="mt-1 text-xs text-white/40">
                  참가할 섹션을 골라 가입을 신청하세요. 운영진이 수락해야 이용할 수 있습니다.
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {others.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/g/${c.slug}/join`}
                        className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:border-gold/50"
                      >
                        <span className="font-semibold text-white/80">{c.name}</span>
                        <span className="text-xs font-bold text-gold">신청 →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
