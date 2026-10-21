import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { listCohorts } from "@/lib/cohorts-store";

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

export default async function SectionsPage() {
  const cohorts = await listCohorts();

  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      <section className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow>Portfolio</Eyebrow>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            포트폴리오 섹션
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-white/60">
            회차·섹션별 출품작 갤러리입니다. 들어갈 섹션을 선택하세요.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {cohorts.length === 0 ? (
          <p className="text-sm text-white/40">아직 섹션이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cohorts.map((c) => (
              <Link
                key={c.id}
                href={`/g/${c.slug}`}
                className="group flex flex-col justify-between rounded-2xl bg-coal p-6 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-gold/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
                    {c.rankRevealed ? (
                      <span className="text-xs font-bold text-gold">순위 공개</span>
                    ) : (
                      <span className="text-xs font-medium text-white/40">
                        {c.scoringOpen ? "채점 진행 중" : "채점 마감"}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white group-hover:text-gold">
                    {c.name}
                  </h2>
                </div>
                <span className="mt-6 text-sm font-bold text-gold">입장 →</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
