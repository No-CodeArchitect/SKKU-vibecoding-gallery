import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitProjectForm from "@/components/SubmitProjectForm";
import { getCohortBySlug } from "@/lib/cohorts-store";
import { getStudent } from "@/lib/session";
import { getRecordByAuthor } from "@/lib/projects-data";

export const dynamic = "force-dynamic";
// 첫 등록 시 저장 후 같은 함수에서 AI 분석(after)이 돌아가므로 실행 시간을 넉넉히
export const maxDuration = 300;

const STATUS_TEXT: Record<string, { label: string; tone: string; desc: string }> = {
  waiting: {
    label: "AI 분석 중",
    tone: "bg-sky-500/20 text-sky-300",
    desc: "등록이 접수되어 AI가 분석하고 있습니다. 보통 1분 안에 갤러리에 카드로 공개됩니다. 잠시 후 새로고침해 보세요.",
  },
  failed: {
    label: "분석 지연",
    tone: "bg-amber-500/20 text-amber-300",
    desc: "자동 분석이 끝나지 않았습니다. 관리자가 확인 후 공개합니다. 다시 등록할 필요는 없습니다.",
  },
  updated: {
    label: "수정 반영 대기",
    tone: "bg-amber-500/20 text-amber-300",
    desc: "제목·소개·썸네일은 바로 바뀌고, AI 요약·심사는 관리자가 다음 분석을 실행할 때 새로 만들어집니다.",
  },
  published: {
    label: "갤러리 공개 중",
    tone: "bg-emerald-500/20 text-emerald-300",
    desc: "분석이 끝나 갤러리에 카드로 공개되어 있습니다. 내용을 고치면 다음 분석 때 다시 반영됩니다.",
  },
};

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cohort = await getCohortBySlug(slug);
  if (!cohort) notFound();

  const student = await getStudent(cohort.id);
  const record = student ? await getRecordByAuthor(student.id) : null;
  const locked = !cohort.scoringOpen || cohort.rankRevealed;

  const statusKey = !record
    ? null
    : !record.ai
      ? record.status === "failed"
        ? "failed"
        : "waiting"
      : record.needsAnalysis
        ? "updated"
        : "published";
  const status = statusKey ? STATUS_TEXT[statusKey] : null;

  return (
    <main className="min-h-screen bg-night text-white">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link href={`/g/${slug}`} className="text-xs font-semibold text-white/40 hover:text-gold">
          ← {cohort.name} 갤러리
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
          {record ? "내 작품 수정" : "작품 등록"}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          만든 결과물의 썸네일·배포 주소·설명을 남겨 주세요. AI가 내용을 분석해 갤러리 카드로
          만들어 줍니다. 1인 1작품이며, 마감 전까지 언제든 수정할 수 있습니다.
        </p>

        {!student ? (
          <div className="mt-8 rounded-2xl bg-coal p-6 text-center ring-1 ring-white/10">
            <p className="text-sm text-white/60">
              작품을 등록하려면 이 섹션에 가입·수락된 계정으로 로그인하세요.
            </p>
            <Link
              href={`/g/${slug}/join?next=submit`}
              className="mt-4 inline-block rounded-full bg-gold px-5 py-2 text-sm font-bold text-night hover:bg-gold-soft"
            >
              로그인 / 가입 신청
            </Link>
          </div>
        ) : (
          <>
            {status && (
              <div className="mt-6 rounded-xl bg-coal px-4 py-3 ring-1 ring-white/10">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.tone}`}>
                  {status.label}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{status.desc}</p>
                {record?.ai && (
                  <Link
                    href={`/project/${record.id}`}
                    className="mt-2 inline-block text-xs font-semibold text-gold hover:underline"
                  >
                    공개된 내 카드 보기 →
                  </Link>
                )}
              </div>
            )}
            {locked && (
              <p className="mt-6 rounded-lg bg-white/5 px-4 py-3 text-sm text-white/60 ring-1 ring-white/10">
                채점이 마감되어 등록·수정이 잠겼습니다.
              </p>
            )}
            <div className="mt-6 rounded-2xl bg-coal p-6 ring-1 ring-white/10">
              <p className="mb-5 text-xs text-white/40">
                제작자: <span className="font-semibold text-white/80">{student.name}</span>
              </p>
              <SubmitProjectForm
                cohortId={cohort.id}
                initial={record?.submission ?? null}
                initialThumbUrl={record?.thumbUrl ?? null}
                locked={locked}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
