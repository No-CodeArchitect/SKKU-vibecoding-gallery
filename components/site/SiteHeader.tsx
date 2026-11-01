import Link from "next/link";
import { getMember } from "@/lib/member-session";
import SiteNav from "./SiteNav";

export default async function SiteHeader() {
  const member = await getMember();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-brand" />
            <span className="text-sm font-black tracking-widest text-white">
              SKKU 바이브코딩
            </span>
          </Link>

          <SiteNav variant="desktop" />

          <Link
            href="/me"
            className="max-w-[9rem] truncate rounded-full border border-brand/60 px-4 py-1.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-night"
          >
            {member ? "내 계정" : "로그인"}
          </Link>
        </div>

        <SiteNav variant="mobile" />
      </div>
    </header>
  );
}
