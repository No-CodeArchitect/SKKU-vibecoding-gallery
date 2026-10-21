import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { listImages } from "@/lib/media";
import { listCohorts } from "@/lib/cohorts-store";
import { getProjects } from "@/lib/projects-data";

export const dynamic = "force-dynamic";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        {children}
      </span>
    </div>
  );
}

// 회차(섹션)별 아카이브. 관리자가 만든 섹션이 최신순으로 표시되고,
// public/media/archive/<섹션 링크 주소>/ 에 사진을 넣으면 그 회차에 자동 표시된다.
export default async function ArchivePage() {
  const cohorts = (await listCohorts()).reverse();
  const rows = await Promise.all(
    cohorts.map(async (c) => ({
      c,
      count: (await getProjects(c.id)).length,
      photos: listImages(`media/archive/${c.slug}`),
    }))
  );

  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      <section className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow>Archive</Eyebrow>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            회차별 아카이브
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-white/60">
            바이브코딩 해커톤의 회차별 기록입니다. 각 회차의 출품작과 현장 사진을
            모았습니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {rows.length === 0 && (
          <p className="rounded-xl bg-white/[0.05] px-6 py-16 text-center text-sm text-white/40 ring-1 ring-white/10">
            아직 기록된 회차가 없습니다.
          </p>
        )}
        {rows.map(({ c, count, photos }) => (
          <section key={c.id} className="mb-16 last:mb-0">
            {/* 회차 헤더 */}
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-black text-white sm:text-3xl">{c.name}</h2>
              <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">
                {c.rankRevealed ? "결과 발표 완료" : c.scoringOpen ? "진행 중" : "평가 마감"}
              </span>
              <span className="text-xs text-white/40">
                {new Date(c.createdAt).getFullYear()}년 · 출품작 {count}개
              </span>
              <Link
                href={`/g/${c.slug}`}
                className="ml-auto text-sm font-bold text-gold hover:text-gold-soft"
              >
                출품작 보기 →
              </Link>
            </div>

            {/* 사진 스트립 (media/archive/<slug>/ 에 넣으면 자동 표시) */}
            {photos.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt={`${c.name} 현장`}
                    className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-white/10"
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6 flex aspect-[16/5] items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                <span className="px-4 text-center text-xs text-white/35">
                  현장 사진 자리 · public/media/archive/{c.slug}/ 에 넣으면 표시됩니다
                </span>
              </div>
            )}
          </section>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
