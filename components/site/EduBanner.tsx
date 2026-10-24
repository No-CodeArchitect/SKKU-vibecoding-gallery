import Link from "next/link";

// 교육·해커톤 문의 배너 (홈 · 섹션 갤러리 하단).
export default function EduBanner({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`relative overflow-hidden rounded-2xl ring-1 ring-brand/40 ${
        compact ? "px-5 py-6 sm:px-8" : "px-6 py-10 sm:px-12 sm:py-12"
      }`}
      style={{
        backgroundImage:
          "linear-gradient(120deg, rgba(141,198,63,0.20) 0%, rgba(79,154,58,0.10) 45%, rgba(24,49,40,0.92) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-block rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-black tracking-wider text-night">
            교육·해커톤 문의
          </span>
          <h2
            className={`mt-3 font-black tracking-tight text-white ${
              compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"
            }`}
          >
            우리 부대·회사에서도 바이브코딩 교육을 받고 싶다면
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
            부대·기관·회사 단위로 AI·바이브코딩 교육이나 해커톤 운영을 문의할 수 있습니다.
            희망 인원과 시기를 남겨 주시면 담당자가 확인 후 연락드립니다.
          </p>
        </div>
        <Link
          href="/apply"
          className="shrink-0 self-start rounded-full bg-brand px-6 py-3 text-sm font-bold text-night transition hover:bg-brand-soft sm:self-center"
        >
          문의하기 →
        </Link>
      </div>
    </aside>
  );
}
