import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MediaEmbed from "@/components/site/MediaEmbed";
import { firstImage } from "@/lib/media";
import { getAboutMedia, listMedia } from "@/lib/media-items";
import { getProjects } from "@/lib/projects-data";
import { listCohorts } from "@/lib/cohorts-store";
import ProjectCard from "@/components/ProjectCard";
import EduBanner from "@/components/site/EduBanner";

// 관리자가 올린 미디어가 바로 반영되도록 요청 시 렌더.
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

// 플레이스홀더 이미지 자리 (이후 public/media/... 실물로 교체)
function ImgPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
      <span className="text-xs font-medium text-white/35">{label}</span>
    </div>
  );
}

export default async function HomePage() {
  // public/media/hero/hero-1.(jpg|png|…) 를 넣으면 자동으로 히어로 배경이 된다.
  const heroImg = firstImage(["media/hero/hero-1", "media/hero/hero"]);
  const aboutMedia = await getAboutMedia(); // 해커톤 소개 대표 영상 (관리자에서 변경 가능)
  const sketch = await listMedia("sketch"); // 해커톤 현장 스케치 (관리자 드래그&드롭)
  // 최근 공개된 작품 3개 (전체 섹션). 순위·채점 정보는 홈에서 노출하지 않는다.
  const recent = (await getProjects())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3)
    .map((p) => ({ ...p, isNew: false, rank: null, totalScore: null }));
  // 채점 진행 중인 섹션 작품은 AI 점수를 숨긴다
  const scoringIds = new Set(
    (await listCohorts()).filter((c) => c.scoringOpen && !c.rankRevealed).map((c) => c.id)
  );

  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      {/* 히어로 */}
      <section className="relative overflow-hidden">
        {heroImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImg}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-night to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-coal via-night to-night" />
            {/* 은은한 골드 글로우 — 완전 블랙 느낌 완화 */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(60% 55% at 15% 20%, rgba(217,164,65,0.16), transparent 60%), radial-gradient(45% 45% at 90% 10%, rgba(217,164,65,0.08), transparent 60%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
            />
          </>
        )}
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6">
          <Eyebrow>성균관대학교 · 바이브코딩 해커톤</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            아이디어를,
            <br />
            <span className="text-gold">코드로 증명하다</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
            AI와 함께 코딩하는 바이브코딩으로 참가자 각자가 직접 서비스를
            만들었습니다. 작품을 둘러보고, 동료로서 평가하고, 최종 결과 발표까지
            함께하세요.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/sections"
              className="rounded-full bg-gold px-6 py-3 text-sm font-bold text-night transition hover:bg-gold-soft"
            >
              포트폴리오 보기 →
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:border-gold hover:text-gold"
            >
              해커톤 소개
            </Link>
          </div>
        </div>
      </section>

      {/* 과정 소개 밴드 */}
      <section className="border-y border-white/10 bg-night-soft">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-white/10 px-4 sm:px-6">
          {["정책·제도 수립", "소요기획 및 사업관리", "리더십 과정"].map((name, i) => (
            <div key={name} className="px-2 py-8 text-center sm:py-10">
              <div className="text-xs font-bold tracking-widest text-white/40 sm:text-sm">
                과정 0{i + 1}
              </div>
              <div className="mt-2 text-base font-black leading-snug text-gold sm:text-2xl">
                {name}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 해커톤 소개 티저 */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>About</Eyebrow>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              듣는 것을 넘어,
              <br />
              직접 만드는 해커톤
            </h2>
            <p className="mt-5 leading-relaxed text-white/60">
              참가자 각자가 바이브코딩으로 실제로 작동하는 결과물을 완성하고
              갤러리에 등록합니다. 동료평가·심사위원 평가·AI 평가를 합산해 순위를
              정하고, 마지막 날 결과를 발표합니다. 이 사이트는 그 과정과 성과의
              기록입니다.
            </p>
            <Link
              href="/about"
              className="mt-6 inline-block text-sm font-bold text-gold hover:text-gold-soft"
            >
              해커톤 자세히 보기 →
            </Link>
          </div>
          {aboutMedia ? (
            <MediaEmbed
              item={aboutMedia}
              className="rounded-xl ring-1 ring-white/10"
            />
          ) : (
            <ImgPlaceholder label="해커톤 소개 영상 자리 (관리자 화면에서 추가)" />
          )}
        </div>
      </section>

      {/* 포트폴리오 티저 */}
      <section className="border-t border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Portfolio</Eyebrow>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                최근 출품작
              </h2>
            </div>
            <Link
              href="/sections"
              className="hidden text-sm font-bold text-gold hover:text-gold-soft sm:inline"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {recent.length > 0
              ? recent.map((p) => (
                  <ProjectCard key={p.id} project={p} hideAiScores={scoringIds.has(p.cohortId)} />
                ))
              : ["결과물 미리보기", "결과물 미리보기", "결과물 미리보기"].map(
              (l, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl bg-coal ring-1 ring-white/10"
                >
                  <ImgPlaceholder label={l} />
                  <div className="p-4">
                    <div className="h-3 w-2/3 rounded bg-white/10" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-white/5" />
                  </div>
                </div>
              )
            )}
          </div>
          <Link
            href="/sections"
            className="mt-8 inline-block rounded-full bg-gold px-6 py-3 text-sm font-bold text-night transition hover:bg-gold-soft sm:hidden"
          >
            전체 보기 →
          </Link>
        </div>
      </section>

      {/* 교육·해커톤 문의 배너 */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <EduBanner />
      </section>

      {/* 미디어 티저 */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Media</Eyebrow>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              해커톤 현장 스케치
            </h2>
          </div>
          <Link
            href="/media"
            className="hidden text-sm font-bold text-gold hover:text-gold-soft sm:inline"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {sketch.length > 0
            ? sketch.slice(0, 2).map((m) => (
                <div
                  key={m.id}
                  className="overflow-hidden rounded-xl ring-1 ring-white/10"
                >
                  <MediaEmbed item={m} />
                </div>
              ))
            : ["해커톤 하이라이트 영상 자리", "결과 발표 현장 영상 자리"].map((l, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl ring-1 ring-white/10"
                >
                  <ImgPlaceholder label={l} />
                  <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold/90 text-night">
                    ▶
                  </div>
                </div>
              ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
