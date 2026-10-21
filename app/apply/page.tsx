import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ApplyForm from "@/components/ApplyForm";

export const metadata: Metadata = {
  title: "교육·해커톤 문의",
};

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-night text-white">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Apply
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">교육·해커톤 문의</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          학과·동아리·기관 단위로 바이브코딩 교육이나 해커톤 운영을 희망하시면 아래 내용을 남겨 주세요.
          담당자가 확인 후 연락드립니다.
        </p>
        <div className="relative mt-8 rounded-2xl bg-coal p-6 ring-1 ring-white/10 sm:p-8">
          <ApplyForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
