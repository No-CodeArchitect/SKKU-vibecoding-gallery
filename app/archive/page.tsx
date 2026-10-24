import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { listImages } from "@/lib/media";

export const dynamic = "force-dynamic";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
        {children}
      </span>
    </div>
  );
}

// 현장 사진 아카이브. public/media/archive/ 에 사진을 넣으면 이름순으로 자동 표시된다.
export default function ArchivePage() {
  const photos = listImages("media/archive");

  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />

      <section className="border-b border-white/10 bg-night-soft">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow>Archive</Eyebrow>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">아카이브</h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((src) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl ring-1 ring-white/10 transition hover:ring-brand/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="현장 사진"
                  loading="lazy"
                  className="aspect-[3/2] w-full object-cover transition duration-300 hover:scale-[1.02]"
                />
              </a>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[16/5] items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
            <span className="px-4 text-center text-xs text-white/35">
              현장 사진 자리 · public/media/archive/ 에 넣으면 표시됩니다
            </span>
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
