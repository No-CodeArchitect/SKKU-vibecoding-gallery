import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import JoinForm from "@/components/JoinForm";
import GoogleButton from "@/components/GoogleButton";
import { getCohortBySlug } from "@/lib/cohorts-store";
import { getMember } from "@/lib/member-session";
import { getMembership } from "@/lib/memberships-store";
import { logout } from "@/lib/auth-actions";

export const dynamic = "force-dynamic";

// 섹션 입장: 구글 로그인 → (처음이면) 실명·닉네임으로 가입 신청 → 관리자 수락 → 갤러리
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { slug } = await params;
  const cohort = await getCohortBySlug(slug);
  if (!cohort) notFound();

  const wantsSubmit = (await searchParams).next === "submit";
  const here = `/g/${slug}/join${wantsSubmit ? "?next=submit" : ""}`;
  const member = await getMember();
  const membership = member ? await getMembership(cohort.id, member.sub) : null;

  if (membership?.status === "approved") {
    redirect(wantsSubmit ? `/g/${slug}/submit` : `/g/${slug}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-night px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href={`/g/${slug}`} className="text-xs font-semibold text-white/40 hover:text-brand">
            ← {cohort.name} 갤러리
          </Link>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white">{cohort.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            {!member
              ? "구글 계정으로 로그인하고 이 섹션에 가입을 신청하세요."
              : !membership
                ? "처음 오셨네요. 실명과 닉네임을 남기면 관리자가 확인 후 수락합니다."
                : membership.status === "pending"
                  ? "가입 신청이 접수되었습니다."
                  : "가입이 수락되지 않았습니다."}
          </p>
        </div>

        <div className="rounded-2xl bg-coal p-6 ring-1 ring-white/10">
          {!member ? (
            <>
              <GoogleButton next={here} />
              <p className="mt-4 text-center text-xs leading-relaxed text-white/40">
                수락된 참가자만 채점·댓글·작품 등록을 할 수 있습니다. 둘러보기는 로그인 없이도
                됩니다.
              </p>
            </>
          ) : !membership ? (
            <JoinForm cohortId={cohort.id} />
          ) : membership.status === "pending" ? (
            <div className="text-center">
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">
                수락 대기 중
              </span>
              <dl className="mt-5 flex flex-col gap-2 text-left text-sm">
                <Row k="닉네임" v={membership.nickname} />
                <Row k="실명" v={membership.realName} />
                <Row k="구글 계정" v={membership.email} />
              </dl>
              <p className="mt-5 text-xs leading-relaxed text-white/50">
                운영진(관리자)이 수락하면 바로 이용할 수 있습니다. 수락 후 이 페이지를 새로고침하세요.
              </p>
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-white/40 hover:text-brand">
                  정보를 잘못 입력했나요?
                </summary>
                <div className="mt-3">
                  <JoinForm
                    cohortId={cohort.id}
                    initial={{ realName: membership.realName, nickname: membership.nickname }}
                  />
                </div>
              </details>
            </div>
          ) : (
            <p className="text-center text-sm text-white/60">
              이 섹션의 참가자로 확인되지 않았습니다. 운영진에게 문의해 주세요.
            </p>
          )}
        </div>

        {member && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
            <span>{member.email}</span>
            <form action={logout}>
              <input type="hidden" name="next" value={here} />
              <button className="underline hover:text-brand">다른 계정으로</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-night px-3 py-2 ring-1 ring-white/10">
      <dt className="text-white/40">{k}</dt>
      <dd className="truncate font-semibold text-white/90">{v}</dd>
    </div>
  );
}
