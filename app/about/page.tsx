import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AI_SCORE_MAX, SCORE_MAX, type Weights } from "@/lib/scoring";
import { getWeights } from "@/lib/weights-store";

export const dynamic = "force-dynamic"; // 관리자가 바꾼 배점을 바로 반영

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

// 평가 방식 (관리자가 정한 배점)
const criteria = (WEIGHTS: Weights) => [
  {
    name: "동료평가",
    weight: WEIGHTS.peer,
    desc: `같은 섹션 참가자들이 서로의 작품을 완성도·창의성 두 항목, 각 1~${SCORE_MAX}점으로 평가합니다. 본인 작품은 채점할 수 없습니다.`,
  },
  {
    name: "심사위원 평가",
    weight: WEIGHTS.judge,
    desc: `운영진이 위촉한 심사위원이 전용 심사 화면에서 모든 작품을 같은 기준(1~${SCORE_MAX}점)으로 평가합니다.`,
  },
  {
    name: "AI 평가",
    weight: WEIGHTS.ai,
    desc: `AI가 작품 설명과 썸네일·배포 페이지를 분석해 완성도·창의성을 1~${AI_SCORE_MAX}점으로 평가하고 심사평을 남깁니다.`,
  },
];

// 진행 흐름
const FLOW = [
  "구글 로그인 · 섹션 참가 신청",
  "아이디어 구상 · 바이브코딩 개발",
  "작품 등록 (배포 주소·썸네일·설명)",
  "AI 분석 · 갤러리 공개",
  "동료평가 · 심사위원 평가",
  "점수 합산 · 결과 발표",
];

export default async function AboutPage() {
  const CRITERIA = criteria(await getWeights());
  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      {/* 개요 */}
      <section className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow>SKKU Vibe Coding Hackathon</Eyebrow>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            성균관대학교 바이브코딩 해커톤
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-white/60">
            AI에게 말로 설명하며 함께 코드를 짜는 &lsquo;바이브코딩&rsquo;으로,
            참가자 각자가 풀고 싶은 문제를 정하고 실제로 작동하는 웹 서비스를
            완성하는 해커톤입니다. 완성한 작품은 이 갤러리에 등록되고,
            동료·심사위원·AI의 평가를 합산해 순위를 정합니다.
          </p>
        </div>
      </section>

      {/* 평가 방식 */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Eyebrow>Judging</Eyebrow>
        <h2 className="mt-4 text-2xl font-black sm:text-3xl">평가 방식</h2>
        <p className="mt-3 max-w-2xl text-sm text-white/50">
          세 가지 평가를 100점 만점으로 환산해 더합니다. 평가 항목은
          완성도(잘 작동하고 완성됐나)와 창의성(아이디어가 참신한가)입니다.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CRITERIA.map((c) => (
            <div key={c.name} className="rounded-xl bg-coal p-6 ring-1 ring-white/10">
              <div className="text-4xl font-black text-gold">
                {c.weight}
                <span className="ml-1 text-base text-white/40">점</span>
              </div>
              <div className="mt-2 text-lg font-bold text-white">{c.name}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 진행 방식 */}
      <section className="border-t border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">진행 방식</h2>
          <p className="mt-3 max-w-2xl text-sm text-white/50">
            참가부터 결과 발표까지 모든 과정이 이 사이트에서 진행됩니다.
          </p>
          <ol className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
            {FLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-coal px-3 py-2 text-sm font-medium text-white ring-1 ring-white/10">
                  <span className="mr-1.5 text-xs font-bold text-gold">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < FLOW.length - 1 && (
                  <span className="text-white/25">→</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 참가 안내 */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Eyebrow>Guide</Eyebrow>
        <h2 className="mt-4 text-2xl font-black sm:text-3xl">참가 안내</h2>
        <ul className="mt-8 space-y-4">
          {[
            ["참가 신청", "운영진이 안내한 섹션 링크에서 구글 계정으로 로그인하고 실명·닉네임으로 참가를 신청합니다. 운영진이 수락하면 작품 등록과 평가가 열립니다."],
            ["작품 등록", "배포된 서비스 주소, 썸네일, 해결하려는 문제와 활용 시나리오를 남기면 AI가 요약 카드로 만들어 갤러리에 공개합니다."],
            ["공개 범위", "갤러리에는 닉네임과 작품 정보만 공개되고, 실명과 채점 내역은 운영진만 봅니다. 순위는 결과 발표 전까지 비공개입니다."],
          ].map(([k, v]) => (
            <li key={k} className="flex flex-col gap-1 border-b border-white/10 pb-4 sm:flex-row sm:gap-6">
              <span className="w-24 shrink-0 text-lg font-black text-gold">{k}</span>
              <span className="flex-1 leading-relaxed text-white/70">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <SiteFooter />
    </div>
  );
}
