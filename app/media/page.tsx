import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MediaEmbed from "@/components/site/MediaEmbed";
import { listMedia } from "@/lib/media-items";

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

export default async function MediaPage() {
  const items = await listMedia("sketch");

  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      <section className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow>Media</Eyebrow>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            영상 · 미디어
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-white/60">
            해커톤 하이라이트와 현장 스케치를 모았습니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-xl bg-coal ring-1 ring-white/10"
              >
                <MediaEmbed item={m} />
                <div className="p-4 text-sm font-semibold text-white">
                  {m.title}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {["해커톤 하이라이트", "결과 발표", "인터뷰", "개발 현장", "시상식", "메이킹"].map(
              (l, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl bg-coal ring-1 ring-white/10"
                >
                  <div className="relative flex aspect-video items-center justify-center bg-white/[0.05]">
                    <span className="text-xs text-white/35">{l} 영상 자리</span>
                    <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold/90 text-night">
                      ▶
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
