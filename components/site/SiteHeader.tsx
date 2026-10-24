import Link from "next/link";
import { getMember } from "@/lib/member-session";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/about", label: "해커톤 소개" },
  { href: "/archive", label: "아카이브" },
  { href: "/sections", label: "포트폴리오" },
  { href: "/media", label: "미디어" },
  { href: "/apply", label: "문의" },
];

export default async function SiteHeader() {
  const member = await getMember();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-night/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" />
          <span className="text-sm font-black tracking-widest text-white">
            SKKU 바이브코딩
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm font-medium text-white/70 transition hover:text-brand"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/me"
          className="max-w-[9rem] truncate rounded-full border border-brand/60 px-4 py-1.5 text-xs font-bold text-brand transition hover:bg-brand hover:text-night"
        >
          {member ? "내 계정" : "로그인"}
        </Link>
      </div>
    </header>
  );
}
