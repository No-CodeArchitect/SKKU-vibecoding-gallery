import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { COURSE_MATERIAL } from "@/lib/site-links";

export const metadata: Metadata = { title: "교안 · 강의자료" };

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">{children}</span>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-black text-brand">
        {n}
      </span>
      <span className="leading-relaxed text-white/75">{children}</span>
    </li>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-white">
      {children}
    </kbd>
  );
}

// 교안(노션) 바로가기 + 오프라인 저장 방법 안내
export default function MaterialsPage() {
  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      <section className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <Eyebrow>Materials</Eyebrow>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">교안 · 강의자료</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/60">
            강의 순서, 실습 안내, 강의자료·실습 파일 폴더 링크가 모두 노션 교안에 정리되어 있습니다.
            교육이 끝난 뒤에도 같은 주소로 계속 열람할 수 있습니다.
          </p>

          <a
            href={COURSE_MATERIAL.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex flex-col gap-1 rounded-2xl bg-brand/10 p-5 ring-1 ring-brand/40 transition hover:bg-brand/15 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>
              <span className="block text-xs font-bold text-brand">노션 교안</span>
              <span className="mt-1 block text-lg font-black text-white">{COURSE_MATERIAL.title}</span>
            </span>
            <span className="mt-3 inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-night sm:mt-0">
              교안 열기 ↗
            </span>
          </a>
          <p className="mt-2 text-xs text-white/40">새 탭에서 열립니다. 노션 계정이 없어도 볼 수 있습니다.</p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <Eyebrow>Offline</Eyebrow>
        <h2 className="mt-4 text-2xl font-black sm:text-3xl">오프라인으로 저장해서 쓰기</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/55">
          인터넷이 안 되는 환경에서 보거나 부대·사무실에서 다시 활용하려면 아래 방법으로 내려받으세요.
          교안 본문은 <b className="text-white/80">PDF</b>로, 강의자료·실습 파일은{" "}
          <b className="text-white/80">구글 드라이브 폴더</b>에서 한꺼번에 받으면 됩니다.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4">
          {/* 1. 교안 본문 → PDF */}
          <section className="rounded-2xl bg-coal p-6 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-black text-night">방법 1 · 추천</span>
              <h3 className="text-lg font-black">교안 본문을 PDF로 저장 (계정 불필요)</h3>
            </div>
            <ol className="mt-4 flex flex-col gap-3 text-sm">
              <Step n={1}>위의 「교안 열기」로 노션 교안을 엽니다.</Step>
              <Step n={2}>
                접혀 있는 토글(▶)이 있으면 <b className="text-white">모두 펼쳐 주세요.</b> 접힌 내용은 PDF에
                들어가지 않습니다.
              </Step>
              <Step n={3}>
                인쇄 창을 엽니다 — Windows <Key>Ctrl</Key> + <Key>P</Key>, Mac <Key>⌘</Key> + <Key>P</Key>
              </Step>
              <Step n={4}>
                「대상(프린터)」을 <b className="text-white">PDF로 저장</b>으로 바꾸고 「저장」을 누릅니다.
                (배경 그래픽 옵션을 켜면 색 상자도 그대로 나옵니다)
              </Step>
              <Step n={5}>교안 안의 하위 페이지는 각각 열어서 같은 방법으로 저장합니다.</Step>
            </ol>
          </section>

          {/* 2. 강의자료·실습 파일 → 드라이브 */}
          <section className="rounded-2xl bg-coal p-6 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-white/80">방법 2</span>
              <h3 className="text-lg font-black">강의자료·실습 파일을 한꺼번에 받기 (구글 드라이브)</h3>
            </div>
            <ol className="mt-4 flex flex-col gap-3 text-sm">
              <Step n={1}>교안 상단의 「강의자료·실습 파일 폴더 (구글 드라이브)」 링크를 엽니다.</Step>
              <Step n={2}>
                폴더 이름 옆 <b className="text-white">▾</b>(또는 오른쪽 위 <b className="text-white">⋮</b>) →{" "}
                <b className="text-white">다운로드</b>를 누르면 폴더 전체가 ZIP 파일로 내려받아집니다.
              </Step>
              <Step n={3}>파일 하나만 필요하면 파일에서 오른쪽 클릭 → 다운로드.</Step>
              <Step n={4}>
                받은 ZIP은 오른쪽 클릭 → <b className="text-white">압축 풀기</b> 후 사용합니다. 용량이 크면 ZIP이
                여러 개로 나뉘어 받아질 수 있으니 모두 받아 주세요.
              </Step>
            </ol>
          </section>

          {/* 3. 노션 내보내기 */}
          <section className="rounded-2xl bg-coal p-6 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-white/80">방법 3</span>
              <h3 className="text-lg font-black">내 노션에 복제해서 통째로 내보내기 (노션 계정 필요)</h3>
            </div>
            <ol className="mt-4 flex flex-col gap-3 text-sm">
              <Step n={1}>노션에 로그인한 상태로 교안을 열고, 오른쪽 위 <b className="text-white">복제</b> 버튼을 눌러 내 워크스페이스로 가져옵니다.</Step>
              <Step n={2}>
                복제된 페이지에서 오른쪽 위 <b className="text-white">•••</b> → <b className="text-white">내보내기</b>
              </Step>
              <Step n={3}>
                형식을 <b className="text-white">PDF</b>, <b className="text-white">HTML</b>, <b className="text-white">Markdown</b>{" "}
                중에서 고르고 「하위 페이지 포함」을 켠 뒤 내보내면 ZIP으로 받아집니다. (요금제에 따라 PDF 옵션이
                제한되면 HTML을 고르세요 — 브라우저로 그대로 열립니다)
              </Step>
            </ol>
          </section>
        </div>

        <div className="mt-6 rounded-xl bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-200/90 ring-1 ring-amber-400/20">
          <b>보안 안내</b> · 내려받은 자료를 업무망·부대 PC로 옮길 때는 소속 기관의 보안 규정(외부 자료 반입,
          저장매체 사용 등)을 먼저 확인해 주세요.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
