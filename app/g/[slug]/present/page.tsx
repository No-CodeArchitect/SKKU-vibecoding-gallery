import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjects } from "@/lib/projects-data";
import { getCohortBySlug } from "@/lib/cohorts-store";
import { rankProjects } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function SectionPresentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cohort = await getCohortBySlug(slug);
  if (!cohort) notFound();

  const ranked = (await rankProjects(await getProjects(cohort.id), cohort.minRaters))
    .filter((p) => p.rank !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <main className="min-h-screen bg-night text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold">
            {cohort.name}
          </span>
          <Link
            href={`/g/${slug}`}
            className="text-sm text-white/50 hover:text-white"
          >
            갤러리로 →
          </Link>
        </div>

        <h1 className="text-center text-4xl font-black tracking-tight sm:text-5xl">
          바이브코딩 결과물 순위
        </h1>

        {!cohort.rankRevealed ? (
          <p className="mt-16 text-center text-lg text-white/60">
            순위는 발표 시 공개됩니다. 관리자가 공개하면 이 화면에 표시됩니다.
          </p>
        ) : ranked.length === 0 ? (
          <p className="mt-16 text-center text-lg text-white/60">
            아직 채점된 프로젝트가 없습니다.
          </p>
        ) : (
          <>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {podium.map((p) => {
                const medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉";
                const elevate =
                  p.rank === 1 ? "sm:-translate-y-4 ring-2 ring-gold" : "";
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl bg-white/5 p-6 text-center ${elevate}`}
                  >
                    <div className="text-5xl">{medal}</div>
                    <div className="mt-3 text-xl font-black">{p.title}</div>
                    <div className="mt-1 text-sm text-white/60">
                      {p.authorName}
                    </div>
                    <div className="mt-4 text-3xl font-black text-gold">
                      {p.avgScore?.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/40">
                      {p.raterCount}명 채점
                    </div>
                  </div>
                );
              })}
            </div>

            {rest.length > 0 && (
              <ul className="mt-8 divide-y divide-white/10 rounded-2xl bg-white/5">
                {rest.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                    <span className="w-8 text-center text-lg font-black text-white/50">
                      {p.rank}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold">{p.title}</div>
                      <div className="text-sm text-white/50">{p.authorName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-gold">
                        {p.avgScore?.toFixed(2)}
                      </div>
                      <div className="text-xs text-white/40">
                        {p.raterCount}명
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
